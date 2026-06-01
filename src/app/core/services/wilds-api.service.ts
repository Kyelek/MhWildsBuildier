import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SkillInfo, ArmorPiece, Weapon } from '../models/wilds.models';

@Injectable({
  providedIn: 'root'
})
export class WildsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'https://wilds.mhdb.io/es';

  getSkills(): Observable<SkillInfo[]> {
    return this.http.get<SkillInfo[]>(`${this.baseUrl}/skills`);
  }

  // 💡 Nuevo método: Trae todo el catálogo de armaduras indexado por la API
  getArmor(): Observable<ArmorPiece[]> {
    return this.http.get<ArmorPiece[]>(`${this.baseUrl}/armor`);
  }
  // ⚔️ Nuevo método: Trae el catálogo de armas (Gran Espada, Katana, etc.)
  getWeapons(): Observable<Weapon[]> {
    return this.http.get<Weapon[]>(`${this.baseUrl}/weapons`);
  }

}