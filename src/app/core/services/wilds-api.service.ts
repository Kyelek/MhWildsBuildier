import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { SkillDetail, ArmorPiece, ArmorSet, Weapon } from '../models/wilds.models';
import { environment } from '../../../environments/environment';

// 🌐 Idiomas que realmente sirve https://wilds.mhdb.io con contenido traducido
// (probado a mano: "ja" devuelve nombres/descripciones en japonés; "jp" existe pero
// responde con los campos a null, así que NO es un código de idioma válido para esta API).
export type ApiLocale = 'es' | 'en' | 'ja';

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

  // 💡 Catálogo completo de habilidades, incluye la descripción de cada nivel (ranks)
  getSkills(locale: ApiLocale = this.locale()): Observable<SkillDetail[]> {
    return this.http.get<SkillDetail[]>(`${this.apiRoot}/${locale}/skills`).pipe(
      catchError(error => this.manejarError('skills', error))
    );
  }

  // 💡 Nuevo método: Trae todo el catálogo de armaduras indexado por la API
  getArmor(locale: ApiLocale = this.locale()): Observable<ArmorPiece[]> {
    return this.http.get<ArmorPiece[]>(`${this.apiRoot}/${locale}/armor`).pipe(
      catchError(error => this.manejarError('armor', error))
    );
  }

  // 🎖️ Trae los conjuntos de armadura con sus bonificaciones de set (bonus.ranks)
  getArmorSets(locale: ApiLocale = this.locale()): Observable<ArmorSet[]> {
    return this.http.get<ArmorSet[]>(`${this.apiRoot}/${locale}/armor/sets`).pipe(
      catchError(error => this.manejarError('armor/sets', error))
    );
  }

  // ⚔️ Nuevo método: Trae el catálogo de armas (Gran Espada, Katana, etc.)
  getWeapons(locale: ApiLocale = this.locale()): Observable<Weapon[]> {
    return this.http.get<Weapon[]>(`${this.apiRoot}/${locale}/weapons`).pipe(
      catchError(error => this.manejarError('weapons', error))
    );
  }

  // 🚨 Normaliza cualquier fallo HTTP en un Error legible por la UI (los componentes
  // no necesitan saber interpretar un HttpErrorResponse), dejando constancia en
  // consola del endpoint y el error original para depurar.
  private manejarError(endpoint: string, error: HttpErrorResponse): Observable<never> {
    console.error(`[WildsApiService] Fallo al pedir "${endpoint}":`, error);
    return throwError(() => new Error(`No se pudo cargar "${endpoint}" desde la API de Monster Hunter Wilds.`));
  }
}