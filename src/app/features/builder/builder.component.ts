import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { rxResource } from '@angular/core/rxjs-interop';
import { WildsApiService } from '../../core/services/wilds-api.service';
import { ArmorPiece } from '../../core/models/wilds.models';

// Interfaz adaptada al JSON de tu API
export interface Weapon {
  id: number;
  name: string;
  kind: string; 
  rarity: number;
  affinity: number;   
  damage: {           
    raw: number;
    display: number;
  };
  slots: any[];
}

// Importaciones Standalone de Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-builder',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatSelectModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatDividerModule
  ],
  templateUrl: './builder.component.html',
  styleUrl: './builder.component.scss'
})
export class BuilderComponent {
  private readonly wildsApi = inject(WildsApiService);

  // 1. Catálogos completos desde la API
  readonly armorResource = rxResource({
    loader: () => this.wildsApi.getArmor()
  });

  readonly weaponsResource = rxResource({
    loader: () => this.wildsApi.getWeapons()
  });

  // 2. Estado del equipamiento seleccionado
  readonly selectedWeapon = signal<Weapon | null>(null);
  readonly selectedHead = signal<ArmorPiece | null>(null);
  readonly selectedChest = signal<ArmorPiece | null>(null);
  readonly selectedArms = signal<ArmorPiece | null>(null);
  readonly selectedWaist = signal<ArmorPiece | null>(null);
  readonly selectedLegs = signal<ArmorPiece | null>(null);

  // 🔍 Signals independientes para el texto de búsqueda de cada selector
  readonly weaponSearch = signal<string>('');
  readonly headSearch = signal<string>('');
  readonly chestSearch = signal<string>('');
  readonly armsSearch = signal<string>('');
  readonly waistSearch = signal<string>('');
  readonly legsSearch = signal<string>('');

  // 3. Listas filtradas reactivamente por tipo y por texto de búsqueda
  readonly helmets = computed(() => this.filterArmorBySlot('head', this.headSearch()));
  readonly chests = computed(() => this.filterArmorBySlot('chest', this.chestSearch()));
  readonly arms = computed(() => this.filterArmorBySlot('arms', this.armsSearch()));
  readonly waists = computed(() => this.filterArmorBySlot('waist', this.waistSearch()));
  readonly legs = computed(() => this.filterArmorBySlot('legs', this.legsSearch()));

  // Mapeamos las categorías de armas únicas utilizando 'kind'
// 💡 Solo muestra tipos de armas que tengan al menos un resultado con el filtro actual
  readonly weaponTypes = computed(() => {
    const search = this.weaponSearch().toLowerCase();
    const allWeapons = this.weaponsResource.value() as unknown as Weapon[] ?? [];
    
    // Filtramos los tipos que contienen armas cuyo nombre coincida con la búsqueda
    const activeTypes = allWeapons
      .filter(w => w.name.toLowerCase().includes(search))
      .map(w => w.kind);

    return [...new Set(activeTypes)];
  });

  // ==========================================
  // 📊 CÁLCULOS REACTIVOS (STAT PANEL)
  // ==========================================

  readonly totalDefense = computed(() => {
    return (this.selectedHead()?.defense.max ?? 0) +
           (this.selectedChest()?.defense.max ?? 0) +
           (this.selectedArms()?.defense.max ?? 0) +
           (this.selectedWaist()?.defense.max ?? 0) +
           (this.selectedLegs()?.defense.max ?? 0);
  });

  readonly totalAttack = computed(() => {
    return this.selectedWeapon()?.damage?.raw ?? 0;
  });

  readonly totalAffinity = computed(() => {
    const weapon = this.selectedWeapon();
    if (!weapon) return 0;
    return weapon.affinity !== undefined && weapon.affinity !== null ? weapon.affinity : 0;
  });

  readonly totalResistances = computed(() => {
    const pieces = [
      this.selectedHead(),
      this.selectedChest(),
      this.selectedArms(),
      this.selectedWaist(),
      this.selectedLegs()
    ];

    const totals = { fire: 0, water: 0, thunder: 0, ice: 0, dragon: 0 };

    for (const piece of pieces) {
      if (piece?.resistances) {
        totals.fire += piece.resistances.fire ?? 0;
        totals.water += piece.resistances.water ?? 0;
        totals.thunder += piece.resistances.thunder ?? 0;
        totals.ice += piece.resistances.ice ?? 0;
        totals.dragon += piece.resistances.dragon ?? 0;
      }
    }
    return totals;
  });

  // ==========================================
  // ⚙️ MÉTODOS DE FILTRADO INTERNOS
  // ==========================================
  
  private filterArmorBySlot(slotType: 'head' | 'chest' | 'arms' | 'waist' | 'legs', searchTerm: string): ArmorPiece[] {
    const allArmor = this.armorResource.value() ?? [];
    const piecesOfSlot = allArmor.filter(piece => piece.kind === slotType);
    
    if (searchTerm.trim()) {
      return piecesOfSlot.filter(piece => 
        piece.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return piecesOfSlot;
  }

  // Filtra las armas según su categoría y el buscador de armas
  getWeaponsByType(type: string): Weapon[] {
    const allWeapons = this.weaponsResource.value() as unknown as Weapon[] ?? [];
    const weaponsOfType = allWeapons.filter(w => w.kind === type);
    const search = this.weaponSearch();

    if (search.trim()) {
      return weaponsOfType.filter(w => 
        w.name.toLowerCase().includes(search.toLowerCase())
      );
    }
    return weaponsOfType;
  }
}