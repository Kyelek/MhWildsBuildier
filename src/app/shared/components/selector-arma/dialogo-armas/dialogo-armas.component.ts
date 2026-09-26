import { Component, Injector, afterNextRender, computed, effect, inject, signal, viewChild } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import { TranslatePipe } from '@ngx-translate/core';
import { Weapon } from '../../../../core/models/wilds.models';
import { WildsApiService } from '../../../../core/services/wilds-api.service';
import {
  CRITERIOS_ORDEN,
  ClaveEspecial,
  CriterioOrden,
  DatosDialogoArmas,
  EspecialArma,
  FILTROS_VACIOS,
  FiltrosArmas,
  ICONOS_ELEMENTO,
  ICONOS_ESTADO,
  OPCIONES_ESPECIAL,
  RAREZAS,
  TIPOS_ARMA,
  iconoTipoArma
} from '../../../models/tipos-arma.models';
import { EnDesarrolloComponent } from '../../en-desarrollo/en-desarrollo.component';
import { BuscadorFiltrosComponent } from '../../buscador-filtros/buscador-filtros.component';
import { alternar, contar, normalizar } from '../../../utils/listas';

// Alto fijo (px) de cada fila de la lista: el scroll virtual lo necesita para calcular
// qué filas pintar. Debe coincidir con la altura de ".fila-arma" en el SCSS.
export const ALTO_FILA_ARMA = 64;

// 🗡️ Popup de selección de armas, en dos pantallas:
//   1. Rejilla con la imagen de cada tipo de arma (más "Arma Gogma", que de momento
//      lleva a un aviso de "En desarrollo").
//   2. Buscador + lista (con scroll virtual) de las armas del tipo elegido. Las armas se
//      piden a la API al elegir el tipo, solo las de ese tipo (ver getWeaponsPorTipo).
// Al elegir un arma el popup se cierra devolviéndola; si se cierra de cualquier otra
// forma (X, Escape, click fuera) devuelve `undefined` y la selección no cambia.
@Component({
  selector: 'app-dialogo-armas',
  standalone: true,
  imports: [ScrollingModule, TranslatePipe, EnDesarrolloComponent, BuscadorFiltrosComponent],
  templateUrl: './dialogo-armas.component.html',
  styleUrl: './dialogo-armas.component.scss'
})
export class DialogoArmasComponent {
  private readonly datos = inject<DatosDialogoArmas>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<DialogoArmasComponent, Weapon>>(MatDialogRef);
  private readonly injector = inject(Injector);
  private readonly wildsApi = inject(WildsApiService);

  readonly tipos = TIPOS_ARMA;
  readonly iconoTipo = iconoTipoArma;
  readonly altoFila = ALTO_FILA_ARMA;
  readonly opcionesEspecial = OPCIONES_ESPECIAL;
  readonly criteriosOrden = CRITERIOS_ORDEN;
  readonly rarezas = RAREZAS;
  readonly seleccionada = this.datos.seleccionada;

  // null = pantalla 1 (tipos). Si ya había un arma elegida, se abre directamente en la
  // lista de su tipo (con el botón de volver disponible para cambiar de tipo).
  readonly tipoElegido = signal<string | null>(this.datos.seleccionada?.kind ?? null);
  readonly textoBusqueda = signal('');

  // 🚧 Pantalla "Arma Gogma" (aviso de en desarrollo), a la que se llega desde la rejilla
  readonly viendoGogma = signal(false);

  private readonly viewport = viewChild(CdkVirtualScrollViewport);
  private readonly buscador = viewChild(BuscadorFiltrosComponent);

  // 🔍 Filtros del panel del buscador. Viven mientras el popup esté abierto: se mantienen
  // al cambiar de tipo de arma (para comparar, p. ej., armas de fuego de varios tipos) y
  // desaparecen al cerrarlo.
  readonly filtros = signal<FiltrosArmas>(FILTROS_VACIOS);

  readonly filtrosActivos = computed(() => {
    const { especiales, rarezas, orden } = this.filtros();
    return especiales.length + rarezas.length + (orden === 'default' ? 0 : 1);
  });

  // ⚔️ Armas del tipo elegido, pedidas a la API al entrar en la pantalla 2 (y de nuevo si
  // cambia el idioma). Sin tipo elegido no se pide nada.
  readonly armasDelTipo = rxResource({
    request: () => {
      const tipo = this.tipoElegido();
      return tipo ? { tipo, locale: this.wildsApi.locale() } : undefined;
    },
    // Angular no llama al loader mientras `request` sea undefined (pantalla de tipos)
    loader: ({ request }) => this.wildsApi.getWeaponsPorTipo(request!.tipo, request!.locale)
  });

  // Armas del tipo elegido que pasan el buscador (sin distinguir mayúsculas ni tildes) y los
  // filtros del panel, ordenadas según "Ordenar por"
  readonly armasFiltradas = computed<Weapon[]>(() => {
    const texto = normalizar(this.textoBusqueda().trim());
    const { especiales, rarezas, orden, descendente } = this.filtros();

    const filtradas = (this.armasDelTipo.value() ?? []).filter(arma =>
      (!texto || normalizar(arma.name).includes(texto)) &&
      (especiales.length === 0 || especiales.includes(claveEspecialDe(arma))) &&
      (rarezas.length === 0 || rarezas.includes(arma.rarity)));

    if (orden === 'default') return filtradas;

    // sort() es estable: a igualdad de valor se conserva el orden del juego
    const signo = descendente ? -1 : 1;
    return [...filtradas].sort((a, b) => signo * (valorOrden(a, orden) - valorOrden(b, orden)));
  });

  // Cuántas armas del tipo tiene cada opción de filtro (las que tienen 0 se desactivan)
  readonly conteoEspeciales = computed(() => contar(this.armasDelTipo.value() ?? [], claveEspecialDe));
  readonly conteoRarezas = computed(() => contar(this.armasDelTipo.value() ?? [], arma => arma.rarity));

  // Si el popup se abre con un arma ya elegida, en cuanto llegue su lista se baja hasta ella
  private desplazamientoPendiente = this.seleccionada !== null;

  constructor() {
    // Con ratón, el buscador queda listo para escribir nada más abrir directamente en la lista
    this.dialogRef.afterOpened().subscribe(() => this.enfocarBuscador());

    effect(() => {
      const viewport = this.viewport();
      const armas = this.armasFiltradas();
      if (!viewport || armas.length === 0 || !this.desplazamientoPendiente) return;

      this.desplazamientoPendiente = false;
      const indice = armas.findIndex(arma => arma.id === this.seleccionada?.id);
      if (indice > 0) this.desplazarA(viewport, Math.max(0, indice - 2));
    });
  }

  // Identidad estable de cada fila para el scroll virtual
  readonly porId = (_indice: number, arma: Weapon) => arma.id;

  // Elemento (fuego, agua...) o estado (veneno, parálisis...) del arma con su icono, o null
  // si no tiene ninguno. En la API cada arma trae como mucho uno de los dos.
  especialDe(arma: Weapon): EspecialArma | null {
    for (const especial of arma.specials ?? []) {
      const base = { valor: especial.damage.display, oculto: especial.hidden };
      if (especial.kind === 'element' && especial.element) {
        return { ...base, icono: ICONOS_ELEMENTO[especial.element], claveNombre: `weaponPicker.elements.${especial.element}` };
      }
      if (especial.kind === 'status' && especial.status) {
        return { ...base, icono: ICONOS_ESTADO[especial.status], claveNombre: `weaponPicker.statuses.${especial.status}` };
      }
    }
    return null;
  }

  verGogma(): void {
    this.viendoGogma.set(true);
  }

  elegirTipo(tipo: string): void {
    this.textoBusqueda.set('');
    this.tipoElegido.set(tipo);
    this.desplazamientoPendiente = tipo === this.seleccionada?.kind;
    // El buscador aún no existe hasta el siguiente render
    afterNextRender(() => this.enfocarBuscador(), { injector: this.injector });
  }

  volverATipos(): void {
    this.textoBusqueda.set('');
    this.tipoElegido.set(null);
    this.viendoGogma.set(false);
    this.desplazamientoPendiente = false;
  }

  onBusquedaInput(texto: string): void {
    this.textoBusqueda.set(texto);
    this.viewport()?.scrollToIndex(0);
  }

  alternarEspecial(clave: ClaveEspecial): void {
    this.actualizarFiltros(f => ({ ...f, especiales: alternar(f.especiales, clave) }));
  }

  alternarRareza(rareza: number): void {
    this.actualizarFiltros(f => ({ ...f, rarezas: alternar(f.rarezas, rareza) }));
  }

  // Al elegir un criterio nuevo se empieza de mayor a menor
  elegirOrden(orden: CriterioOrden): void {
    this.actualizarFiltros(f => ({ ...f, orden, descendente: f.orden === orden ? f.descendente : true }));
  }

  alternarSentido(): void {
    this.actualizarFiltros(f => ({ ...f, descendente: !f.descendente }));
  }

  borrarFiltros(): void {
    this.actualizarFiltros(() => FILTROS_VACIOS);
  }

  // Cada cambio de filtros vuelve la lista al principio, como al escribir en el buscador
  private actualizarFiltros(cambio: (filtros: FiltrosArmas) => FiltrosArmas): void {
    this.filtros.update(cambio);
    this.viewport()?.scrollToIndex(0);
  }

  reintentarCarga(): void {
    this.armasDelTipo.reload();
  }

  elegirArma(arma: Weapon): void {
    this.dialogRef.close(arma);
  }

  cerrar(): void {
    this.dialogRef.close();
  }

  // Solo con ratón: en móvil enfocar el buscador abriría el teclado tapando media lista
  private enfocarBuscador(): void {
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      this.buscador()?.enfocar();
    }
  }

  // 🐛 El scroll virtual recién creado tarda unos fotogramas en conocer su altura total, y
  // hasta entonces el navegador recorta cualquier desplazamiento a 0. Se reintenta en los
  // siguientes fotogramas hasta llegar (o hasta el tope de intentos, si el arma está al
  // final de la lista y no se puede bajar tanto).
  private desplazarA(viewport: CdkVirtualScrollViewport, indice: number, intentos = 10): void {
    viewport.scrollToIndex(indice);
    if (viewport.measureScrollOffset() < indice * ALTO_FILA_ARMA - 1 && intentos > 0) {
      requestAnimationFrame(() => this.desplazarA(viewport, indice, intentos - 1));
    }
  }
}

// Elemento o estado del arma como clave de filtro ("none" si no tiene ninguno)
function claveEspecialDe(arma: Weapon): ClaveEspecial {
  const especial = arma.specials?.[0];
  return especial?.element ?? especial?.status ?? 'none';
}

function valorOrden(arma: Weapon, orden: CriterioOrden): number {
  switch (orden) {
    case 'rarity': return arma.rarity;
    case 'attack': return arma.damage.raw;
    case 'affinity': return arma.affinity;
    case 'special': return arma.specials?.[0]?.damage.display ?? 0;
    default: return 0;
  }
}
