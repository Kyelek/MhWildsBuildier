import { Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { ApiLocale, WildsApiService } from '../../../core/services/wilds-api.service';
import { EnDesarrolloComponent } from '../../../shared/components/en-desarrollo/en-desarrollo.component';
import { ICONOS_ESTADO_APLICADO, estadosQueAplica, idsMateriales, imagenMonstruo } from '../bestiario.datos';
import { PaginaDebilidadesComponent } from '../paginas/pagina-debilidades/pagina-debilidades.component';
import { PaginaPartesComponent } from '../paginas/pagina-partes/pagina-partes.component';
import { PaginaEquipoComponent } from '../paginas/pagina-equipo/pagina-equipo.component';

// Pantallas ("páginas") de la tarjeta, en orden. La clave se usa para las traducciones.
export const PAGINAS_TARJETA = ['info', 'weaknesses', 'parts', 'special', 'gear'] as const;
const PAGINA_EQUIPO = PAGINAS_TARJETA.indexOf('gear');
const NUMEROS_ROMANOS = ['I', 'II', 'III', 'IV', 'V'];

// 📖 Tarjeta del Bestiario de bolsillo: la "página" del libro con la ficha de un monstruo.
// Todas las pantallas comparten cabecera (nombre + foto). La ficha se pide a la API al
// seleccionar el monstruo, y el equipo relacionado solo al abrir la pantalla V.
@Component({
  selector: 'app-tarjeta-monstruo',
  standalone: true,
  imports: [TranslatePipe, EnDesarrolloComponent, PaginaDebilidadesComponent, PaginaPartesComponent, PaginaEquipoComponent],
  templateUrl: './tarjeta-monstruo.component.html',
  styleUrl: './tarjeta-monstruo.component.scss'
})
export class TarjetaMonstruoComponent {
  private readonly wildsApi = inject(WildsApiService);

  readonly idMonstruo = input.required<number>();
  readonly cerrar = output<void>();

  readonly paginas = PAGINAS_TARJETA;
  readonly romanos = NUMEROS_ROMANOS;
  readonly iconosEstado = ICONOS_ESTADO_APLICADO;

  // Se conserva la página al cambiar de monstruo (útil para comparar debilidades)
  readonly pagina = signal(0);

  // 🐉 Ficha completa del monstruo, en el idioma actual (se repite al cambiar cualquiera de los dos)
  readonly detalleResource = rxResource({
    request: () => `${this.idMonstruo()}|${this.wildsApi.locale()}`,
    loader: ({ request }) => {
      const [id, locale] = request.split('|');
      return this.wildsApi.getMonstruo(Number(id), locale as ApiLocale);
    }
  });

  // Solo se muestra la ficha del monstruo pedido (evita enseñar un instante la anterior)
  readonly monstruo = computed(() => {
    const detalle = this.detalleResource.value();
    return detalle && detalle.id === this.idMonstruo() ? detalle : null;
  });

  readonly imagen = computed(() => imagenMonstruo(this.idMonstruo()));
  readonly estados = computed(() => estadosQueAplica(this.idMonstruo()));

  // ⚔️🛡️ EQUIPO RELACIONADO (pantalla V)
  // La clave de la petición solo existe una vez abierta la pantalla V para ESTE monstruo:
  // se conserva al volver a otras pantallas (no se repite la llamada) y se descarta al
  // cambiar de monstruo estando en otra pantalla (no se pide equipo que nadie va a ver).
  private readonly claveEquipo = linkedSignal<{ enEquipo: boolean; clave: string | null }, string | undefined>({
    source: () => {
      const monstruo = this.monstruo();
      return {
        enEquipo: this.pagina() === PAGINA_EQUIPO,
        clave: monstruo ? `${monstruo.id}|${this.wildsApi.locale()}` : null
      };
    },
    computation: (actual, anterior) => {
      if (!actual.clave) return undefined;
      if (actual.enEquipo) return actual.clave;
      return anterior?.value === actual.clave ? actual.clave : undefined;
    }
  });

  readonly armasResource = rxResource({
    request: () => this.claveEquipo(),
    loader: ({ request }) => this.wildsApi.getArmasPorMateriales(this.materiales(), request.split('|')[1] as ApiLocale)
  });

  readonly armadurasResource = rxResource({
    request: () => this.claveEquipo(),
    loader: ({ request }) => this.wildsApi.getArmaduraPorMateriales(this.materiales(), request.split('|')[1] as ApiLocale)
  });

  readonly cargandoEquipo = computed(() => this.armasResource.isLoading() || this.armadurasResource.isLoading());
  readonly errorEquipo = computed(() => !!(this.armasResource.error() || this.armadurasResource.error()));

  private materiales(): number[] {
    const monstruo = this.monstruo();
    return monstruo ? idsMateriales(monstruo) : [];
  }

  irA(pagina: number): void {
    this.pagina.set(Math.min(Math.max(pagina, 0), PAGINAS_TARJETA.length - 1));
  }

  reintentar(): void {
    this.detalleResource.reload();
  }

  reintentarEquipo(): void {
    this.armasResource.reload();
    this.armadurasResource.reload();
  }
}
