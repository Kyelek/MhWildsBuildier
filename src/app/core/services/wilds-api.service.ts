import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SkillDetail, ArmorPiece, ArmorSet, Weapon } from '../models/wilds.models';

@Injectable({
  providedIn: 'root'
})
export class WildsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'https://wilds.mhdb.io/es';

  // 💡 Catálogo completo de habilidades, incluye la descripción de cada nivel (ranks)
  getSkills(): Observable<SkillDetail[]> {
    return this.http.get<SkillDetail[]>(`${this.baseUrl}/skills`);
  }

  // 💡 Nuevo método: Trae todo el catálogo de armaduras indexado por la API
  getArmor(): Observable<ArmorPiece[]> {
    return this.http.get<ArmorPiece[]>(`${this.baseUrl}/armor`);
  }

  // 🎖️ Trae los conjuntos de armadura con sus bonificaciones de set (bonus.ranks)
  getArmorSets(): Observable<ArmorSet[]> {
    return this.http.get<ArmorSet[]>(`${this.baseUrl}/armor/sets`);
  }

  // ⚔️ Nuevo método: Trae el catálogo de armas (Gran Espada, Katana, etc.)
  getWeapons(): Observable<Weapon[]> {
    return this.http.get<Weapon[]>(`${this.baseUrl}/weapons`);
  }

}