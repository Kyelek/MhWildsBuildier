import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SkillDetail, ArmorPiece, ArmorSet, Weapon } from '../models/wilds.models';

// 🌐 Idiomas que realmente sirve https://wilds.mhdb.io con contenido traducido
// (probado a mano: "ja" devuelve nombres/descripciones en japonés; "jp" existe pero
// responde con los campos a null, así que NO es un código de idioma válido para esta API).
export type ApiLocale = 'es' | 'en' | 'ja';

@Injectable({
  providedIn: 'root'
})
export class WildsApiService {
  private readonly http = inject(HttpClient);
  private readonly apiRoot = 'https://wilds.mhdb.io';

  // 🌐 Idioma actual de la API. Los componentes que consuman datos deben incluirlo
  // en el `request` de su `rxResource` para que las peticiones se repitan al cambiarlo.
  readonly locale = signal<ApiLocale>('es');

  setLocale(locale: ApiLocale): void {
    this.locale.set(locale);
  }

  // 💡 Catálogo completo de habilidades, incluye la descripción de cada nivel (ranks)
  getSkills(locale: ApiLocale = this.locale()): Observable<SkillDetail[]> {
    return this.http.get<SkillDetail[]>(`${this.apiRoot}/${locale}/skills`);
  }

  // 💡 Nuevo método: Trae todo el catálogo de armaduras indexado por la API
  getArmor(locale: ApiLocale = this.locale()): Observable<ArmorPiece[]> {
    return this.http.get<ArmorPiece[]>(`${this.apiRoot}/${locale}/armor`);
  }

  // 🎖️ Trae los conjuntos de armadura con sus bonificaciones de set (bonus.ranks)
  getArmorSets(locale: ApiLocale = this.locale()): Observable<ArmorSet[]> {
    return this.http.get<ArmorSet[]>(`${this.apiRoot}/${locale}/armor/sets`);
  }

  // ⚔️ Nuevo método: Trae el catálogo de armas (Gran Espada, Katana, etc.)
  getWeapons(locale: ApiLocale = this.locale()): Observable<Weapon[]> {
    return this.http.get<Weapon[]>(`${this.apiRoot}/${locale}/weapons`);
  }

}