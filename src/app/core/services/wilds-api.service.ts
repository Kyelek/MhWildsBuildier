import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, catchError, of, shareReplay, tap, throwError } from 'rxjs';
import { SkillDetail, ArmorPiece, ArmorSet, Weapon } from '../models/wilds.models';
import { environment } from '../../../environments/environment';

// 🌐 Idiomas que realmente sirve https://wilds.mhdb.io con contenido traducido
// (probado a mano: "ja" devuelve nombres/descripciones en japonés; "jp" existe pero
// responde con los campos a null, así que NO es un código de idioma válido para esta API).
export type ApiLocale = 'es' | 'en' | 'ja';

// ⚔️ Campos de cada arma que usa la app. La API devuelve por defecto mucho más (materiales de
// fabricación, árbol de mejoras, descripción...): pidiendo solo estos, con su parámetro de
// proyección "p", el catálogo de armas pasa de ~2,7 MB a ~250 KB por idioma.
const CAMPOS_ARMA: readonly (keyof Weapon)[] = ['id', 'name', 'kind', 'rarity', 'damage', 'affinity', 'slots', 'specials'];
const PROYECCION_ARMA = JSON.stringify(Object.fromEntries(CAMPOS_ARMA.map(campo => [campo, true])));

// 🧹 Entradas de caché de versiones anteriores que ya no se usan. "weapons" guardaba el
// catálogo completo de armas (~2,7 MB por idioma) y llenaba casi toda la cuota de localStorage.
const CACHES_OBSOLETAS: readonly string[] = ['weapons'];

@Injectable({
  providedIn: 'root'
})
export class WildsApiService {
  private readonly http = inject(HttpClient);
  private readonly apiRoot = environment.apiRoot;

  // 🌐 Idioma actual de la API. Los componentes que consuman datos deben incluirlo
  // en el `request` de su `rxResource` para que las peticiones se repitan al cambiarlo.
  readonly locale = signal<ApiLocale>('es');

  setLocale(locale: ApiLocale): void {
    this.locale.set(locale);
  }

  // 🌐 El selector de idioma de la UI usa "jp" (nombre del fichero de traducción),
  // pero la API identifica el japonés como "ja". Este mapa traduce el idioma de la
  // interfaz al locale real que hay que pedirle a la API.
  private static readonly LOCALE_POR_IDIOMA_UI: Record<string, ApiLocale> = {
    es: 'es',
    en: 'en',
    jp: 'ja'
  };

  // Punto único que usa cualquier componente que cambie el idioma de la interfaz
  // (hoy el Navbar) para mantener sincronizado el idioma que se le pide a la API.
  setLocaleFromUiLanguage(language: string): void {
    this.setLocale(WildsApiService.LOCALE_POR_IDIOMA_UI[language] ?? 'en');
  }

  // 🗄️ CACHÉ DE CATÁLOGOS EN localStorage
  //
  // Builder y Skill Forge piden los mismos catálogos (armor, weapons, armor/sets, skills) y,
  // al ser páginas que Angular destruye/recrea en cada navegación, cada visita repetía la
  // llamada a la API aunque ya tuviéramos los datos. Guardamos la respuesta en `localStorage`
  // (una entrada por endpoint + idioma) para que, mientras el catálogo siga ahí, ni siquiera
  // haga falta pedirlo de nuevo al navegar por la web ni al recargar la página. Un `Map` en
  // memoria evita además volver a leer/parsear `localStorage` en cada suscripción dentro de
  // la misma sesión.
  private static readonly PREFIJO_CACHE = 'mhwb:cache';
  private readonly cacheEnMemoria = new Map<string, Observable<unknown>>();

  // 💡 Catálogo completo de habilidades, incluye la descripción de cada nivel (ranks)
  getSkills(locale: ApiLocale = this.locale()): Observable<SkillDetail[]> {
    return this.cachearEnLocalStorage('skills', locale, () =>
      this.http.get<SkillDetail[]>(`${this.apiRoot}/${locale}/skills`)
    );
  }

  // 💡 Nuevo método: Trae todo el catálogo de armaduras indexado por la API
  getArmor(locale: ApiLocale = this.locale()): Observable<ArmorPiece[]> {
    return this.cachearEnLocalStorage('armor', locale, () =>
      this.http.get<ArmorPiece[]>(`${this.apiRoot}/${locale}/armor`)
    );
  }

  // 🎖️ Trae los conjuntos de armadura con sus bonificaciones de set (bonus.ranks)
  getArmorSets(locale: ApiLocale = this.locale()): Observable<ArmorSet[]> {
    return this.cachearEnLocalStorage('armor-sets', locale, () =>
      this.http.get<ArmorSet[]>(`${this.apiRoot}/${locale}/armor/sets`)
    );
  }

  constructor() {
    this.borrarCachesObsoletas();
  }

  // ⚔️ Catálogo completo de armas (solo los campos que usa la app, ver CAMPOS_ARMA)
  getWeapons(locale: ApiLocale = this.locale()): Observable<Weapon[]> {
    return this.cachearEnLocalStorage('weapons-resumen', locale, () =>
      this.http.get<Weapon[]>(`${this.apiRoot}/${locale}/weapons`, {
        params: new HttpParams().set('p', PROYECCION_ARMA)
      })
    );
  }

  // 🗡️ Solo las armas de un tipo (p. ej. "long-sword"), filtradas en la propia API con su
  // parámetro "q": las usa el popup de selección de armas al elegir un tipo (~20 KB por tipo).
  getWeaponsPorTipo(tipo: string, locale: ApiLocale = this.locale()): Observable<Weapon[]> {
    return this.cachearEnLocalStorage(`weapons-${tipo}`, locale, () =>
      this.http.get<Weapon[]>(`${this.apiRoot}/${locale}/weapons`, {
        params: new HttpParams()
          .set('q', JSON.stringify({ kind: tipo }))
          .set('p', PROYECCION_ARMA)
      })
    );
  }

  // 🗄️ Punto único de caché: primero mira en memoria (evita releer localStorage dentro de la
  // misma sesión), luego en localStorage (persiste entre navegaciones y recargas de página) y,
  // solo si no hay nada, llama a la API. Si la llamada falla no se guarda nada, así que la
  // próxima vez se vuelve a intentar en vez de quedar cacheado el error.
  private cachearEnLocalStorage<T>(
    nombreEndpoint: string,
    locale: ApiLocale,
    peticion: () => Observable<T>
  ): Observable<T> {
    const clave = `${WildsApiService.PREFIJO_CACHE}:${nombreEndpoint}:${locale}`;

    const enMemoria = this.cacheEnMemoria.get(clave);
    if (enMemoria) {
      return enMemoria as Observable<T>;
    }

    const guardadoEnDisco = this.leerCache<T>(clave);
    if (guardadoEnDisco) {
      const observableGuardado$ = of(guardadoEnDisco);
      this.cacheEnMemoria.set(clave, observableGuardado$);
      return observableGuardado$;
    }

    const observable$ = peticion().pipe(
      tap(datos => this.guardarCache(clave, datos)),
      catchError(error => {
        this.cacheEnMemoria.delete(clave);
        return this.manejarError(`${nombreEndpoint} (${locale})`, error);
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );

    this.cacheEnMemoria.set(clave, observable$);
    return observable$;
  }

  // Libera el espacio que ocupaban en localStorage las cachés que ya no se usan
  private borrarCachesObsoletas(): void {
    try {
      const prefijos = CACHES_OBSOLETAS.map(nombre => `${WildsApiService.PREFIJO_CACHE}:${nombre}:`);
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const clave = localStorage.key(i);
        if (clave && prefijos.some(prefijo => clave.startsWith(prefijo))) {
          localStorage.removeItem(clave);
        }
      }
    } catch {
      // localStorage no disponible (modo privado...): no hay nada que borrar
    }
  }

  // Lee y parsea una entrada de localStorage. Si no existe, está corrupta o localStorage no
  // está disponible (modo privado, cuota agotada...), se trata como si no hubiera caché.
  private leerCache<T>(clave: string): T | null {
    try {
      const guardado = localStorage.getItem(clave);
      return guardado ? (JSON.parse(guardado) as T) : null;
    } catch (error) {
      console.warn(`[WildsApiService] No se pudo leer la caché "${clave}" de localStorage:`, error);
      return null;
    }
  }

  // Guarda una entrada en localStorage. Si falla (cuota agotada, modo privado...) no se
  // interrumpe el flujo: simplemente esa respuesta no queda cacheada para la próxima visita.
  private guardarCache<T>(clave: string, datos: T): void {
    try {
      localStorage.setItem(clave, JSON.stringify(datos));
    } catch (error) {
      console.warn(`[WildsApiService] No se pudo guardar la caché "${clave}" en localStorage:`, error);
    }
  }

  // 🚨 Normaliza cualquier fallo HTTP en un Error legible por la UI (los componentes
  // no necesitan saber interpretar un HttpErrorResponse), dejando constancia en
  // consola del endpoint y el error original para depurar.
  private manejarError(endpoint: string, error: HttpErrorResponse): Observable<never> {
    console.error(`[WildsApiService] Fallo al pedir "${endpoint}":`, error);
    return throwError(() => new Error(`No se pudo cargar "${endpoint}" desde la API de Monster Hunter Wilds.`));
  }
}