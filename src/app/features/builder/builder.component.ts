import { Component, inject, computed, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { rxResource } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { WildsApiService } from '../../core/services/wilds-api.service';
import { ArmorPiece, Weapon } from '../../core/models/wilds.models';

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
    MatDividerModule,
    TranslatePipe
  ],
  templateUrl: './builder.component.html',
  styleUrl: './builder.component.scss'
})
export class BuilderComponent {
  private readonly wildsApi = inject(WildsApiService);

  // 1. Catálogos completos desde la API
  // 🌐 `request` observa el idioma actual de la API: al cambiarlo (selector EN/ES/JP),
  // el `loader` se vuelve a ejecutar y los catálogos llegan ya traducidos.
  readonly armorResource = rxResource({
    request: () => this.wildsApi.locale(),
    loader: ({ request }) => this.wildsApi.getArmor(request)
  });

  readonly weaponsResource = rxResource({
    request: () => this.wildsApi.locale(),
    loader: ({ request }) => this.wildsApi.getWeapons(request)
  });

  // ⏳ Estado de carga combinado de ambos catálogos, para mostrar un único spinner
  readonly cargando = computed(() =>
    this.armorResource.isLoading() || this.weaponsResource.isLoading()
  );

  // 🚨 Si cualquiera de los dos catálogos falló al cargar, mostramos el primer error
  readonly error = computed(() =>
    this.armorResource.error() ?? this.weaponsResource.error()
  );

  // Vuelve a pedir ambos catálogos (usado por el botón "Reintentar")
  reintentar(): void {
    this.armorResource.reload();
    this.weaponsResource.reload();
  }

  // 2. Estado del equipamiento seleccionado
  readonly selectedWeapon = signal<Weapon | null>(null);
  readonly selectedHead = signal<ArmorPiece | null>(null);
  readonly selectedChest = signal<ArmorPiece | null>(null);
  readonly selectedArms = signal<ArmorPiece | null>(null);
  readonly selectedWaist = signal<ArmorPiece | null>(null);
  readonly selectedLegs = signal<ArmorPiece | null>(null);

  // 🌐 PERSISTENCIA DE LA SELECCIÓN ENTRE IDIOMAS
  //
  // Las piezas/arma seleccionadas guardan nombre, descripción, etc. en el idioma con el que
  // se cargaron. Si el usuario cambia el idioma, el catálogo se recarga ya traducido, pero
  // el objeto que teníamos guardado en el signal seguiría "congelado" en el idioma anterior.
  // En vez de perder el equipamiento elegido, en cuanto llega el catálogo nuevo buscamos cada
  // pieza/arma ya seleccionada por su "id" (estable entre idiomas) y sustituimos el objeto por
  // su versión traducida. Así el cazador conserva lo que tenía equipado y las Estadísticas
  // Totales / Resistencias se actualizan solas al nuevo idioma sin resetearse.
  private readonly persistirSeleccionAlCambiarIdioma = effect(() => {
    const armadura = this.armorResource.value();
    if (armadura) {
      this.selectedHead.update(actual => this.buscarPorId(actual, armadura));
      this.selectedChest.update(actual => this.buscarPorId(actual, armadura));
      this.selectedArms.update(actual => this.buscarPorId(actual, armadura));
      this.selectedWaist.update(actual => this.buscarPorId(actual, armadura));
      this.selectedLegs.update(actual => this.buscarPorId(actual, armadura));
    }

    const armas = this.weaponsResource.value();
    if (armas) {
      this.selectedWeapon.update(actual => this.buscarPorId(actual, armas));
    }
  });

  // Busca en el catálogo (ya en el idioma nuevo) el elemento con el mismo id que el
  // seleccionado actualmente. Si no lo encuentra (no debería pasar, los id son estables entre
  // idiomas), mantiene el objeto anterior en vez de perder la selección de golpe.
  private buscarPorId<T extends { id: number }>(actual: T | null, catalogo: T[]): T | null {
    if (!actual) return null;
    return catalogo.find(item => item.id === actual.id) ?? actual;
  }

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
    const allWeapons = this.weaponsResource.value() ?? [];
    
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
    const allWeapons = this.weaponsResource.value() ?? [];
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