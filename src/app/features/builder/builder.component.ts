import { Component, inject, computed, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { rxResource } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { WildsApiService } from '../../core/services/wilds-api.service';
import { ArmorPiece, Weapon } from '../../core/models/wilds.models';
import { SelectorBuscableComponent } from '../../shared/components/selector-buscable/selector-buscable.component';

// Importaciones Standalone de Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';

@Component({
  selector: 'app-builder',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    TranslatePipe,
    SelectorBuscableComponent
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

  // 3. Catálogo de armas y piezas de armadura acotadas por tipo/ranura. El buscador de
  // texto de cada selector ya lo resuelve internamente <app-selector-buscable> (ver
  // shared/components/selector-buscable), así que aquí solo queda el filtro por ranura.
  readonly weapons = computed(() => this.weaponsResource.value() ?? []);

  readonly helmets = computed(() => this.armorPorRanura('head'));
  readonly chests = computed(() => this.armorPorRanura('chest'));
  readonly arms = computed(() => this.armorPorRanura('arms'));
  readonly waists = computed(() => this.armorPorRanura('waist'));
  readonly legs = computed(() => this.armorPorRanura('legs'));

  // Referencia estable (no se recrea en cada ciclo) para agrupar el selector de armas
  // por tipo ('kind') dentro de <app-selector-buscable>.
  readonly agruparArmaPorTipo = (weapon: Weapon) => weapon.kind;

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

  private armorPorRanura(ranura: ArmorPiece['kind']): ArmorPiece[] {
    return (this.armorResource.value() ?? []).filter(piece => piece.kind === ranura);
  }
}