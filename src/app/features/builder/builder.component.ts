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
  readonly armaSeleccionada = signal<Weapon | null>(null);
  readonly piezaCabeza = signal<ArmorPiece | null>(null);
  readonly piezaPecho = signal<ArmorPiece | null>(null);
  readonly piezaBrazos = signal<ArmorPiece | null>(null);
  readonly piezaCintura = signal<ArmorPiece | null>(null);
  readonly piezaPiernas = signal<ArmorPiece | null>(null);

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
      this.piezaCabeza.update(actual => this.buscarPorId(actual, armadura));
      this.piezaPecho.update(actual => this.buscarPorId(actual, armadura));
      this.piezaBrazos.update(actual => this.buscarPorId(actual, armadura));
      this.piezaCintura.update(actual => this.buscarPorId(actual, armadura));
      this.piezaPiernas.update(actual => this.buscarPorId(actual, armadura));
    }

    const armas = this.weaponsResource.value();
    if (armas) {
      this.armaSeleccionada.update(actual => this.buscarPorId(actual, armas));
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
  readonly armas = computed(() => this.weaponsResource.value() ?? []);

  readonly cascos = computed(() => this.armorPorRanura('head'));
  readonly pechos = computed(() => this.armorPorRanura('chest'));
  readonly brazos = computed(() => this.armorPorRanura('arms'));
  readonly cinturas = computed(() => this.armorPorRanura('waist'));
  readonly piernas = computed(() => this.armorPorRanura('legs'));

  // Referencia estable (no se recrea en cada ciclo) para agrupar el selector de armas
  // por tipo ('kind') dentro de <app-selector-buscable>.
  readonly agruparArmaPorTipo = (arma: Weapon) => arma.kind;

  // ==========================================
  // 📊 CÁLCULOS REACTIVOS (STAT PANEL)
  // ==========================================

  readonly defensaTotal = computed(() => {
    return (this.piezaCabeza()?.defense.max ?? 0) +
           (this.piezaPecho()?.defense.max ?? 0) +
           (this.piezaBrazos()?.defense.max ?? 0) +
           (this.piezaCintura()?.defense.max ?? 0) +
           (this.piezaPiernas()?.defense.max ?? 0);
  });

  readonly ataqueTotal = computed(() => {
    return this.armaSeleccionada()?.damage?.raw ?? 0;
  });

  readonly afinidadTotal = computed(() => {
    const arma = this.armaSeleccionada();
    if (!arma) return 0;
    return arma.affinity !== undefined && arma.affinity !== null ? arma.affinity : 0;
  });

  readonly resistenciasTotales = computed(() => {
    const piezas = [
      this.piezaCabeza(),
      this.piezaPecho(),
      this.piezaBrazos(),
      this.piezaCintura(),
      this.piezaPiernas()
    ];

    const totales = { fire: 0, water: 0, thunder: 0, ice: 0, dragon: 0 };

    for (const pieza of piezas) {
      if (pieza?.resistances) {
        totales.fire += pieza.resistances.fire ?? 0;
        totales.water += pieza.resistances.water ?? 0;
        totales.thunder += pieza.resistances.thunder ?? 0;
        totales.ice += pieza.resistances.ice ?? 0;
        totales.dragon += pieza.resistances.dragon ?? 0;
      }
    }
    return totales;
  });

  // ==========================================
  // ⚙️ MÉTODOS DE FILTRADO INTERNOS
  // ==========================================

  private armorPorRanura(ranura: ArmorPiece['kind']): ArmorPiece[] {
    return (this.armorResource.value() ?? []).filter(piece => piece.kind === ranura);
  }
}
