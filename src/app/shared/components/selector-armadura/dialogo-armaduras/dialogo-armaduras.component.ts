import { Component, ElementRef, Injector, afterNextRender, computed, effect, inject, signal, viewChild } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import { ArmorPiece } from '../../../../core/models/wilds.models';
import { WildsApiService } from '../../../../core/services/wilds-api.service';
import {
  CRITERIOS_ORDEN_ARMADURA,
  CriterioOrdenArmadura,
  DatosDialogoArmaduras,
  FILTROS_ARMADURA_VACIOS,
  FiltrosArmadura,
  ICONOS_RANURA,
  ModoHabilidades,
  NIVELES_HUECO,
  OpcionHabilidad,
  RANGOS_ARMADURA,
  RangoArmadura,
  TipoHabilidadArmadura
} from '../../../models/filtros-armadura.models';
import { ICONOS_ELEMENTO, RAREZAS } from '../../../models/tipos-arma.models';
import { BuscadorFiltrosComponent } from '../../buscador-filtros/buscador-filtros.component';
import { SelectorHabilidadesComponent } from '../../selector-habilidades/selector-habilidades.component';
import { alternar, contar, normalizar } from '../../../utils/listas';

// Habilidad de una pieza ya preparada para pintarse en su fila
export interface HabilidadFila {
  id: number;
  nombre: string;
  nivel: number;
  tipo: TipoHabilidadArmadura;
  buscada: boolean; // Está entre las habilidades de los filtros: se resalta en dorado
}

export interface FilaArmadura {
  pieza: ArmorPiece;
  habilidades: HabilidadFila[];
}

// Clave de los filtros donde se guarda cada tipo de habilidad
const CLAVE_FILTRO: Record<TipoHabilidadArmadura, 'habilidades' | 'habilidadesSet'> = {
  armor: 'habilidades',
  set: 'habilidadesSet'
};

// 🛡️ Popup de selección de una pieza de armadura para una ranura (casco, pecho...):
// buscador por nombre con panel de filtros y la lista de piezas de esa ranura.
//
// Filtros del panel:
//   - Habilidades normales (alguna o todas las marcadas)
//   - Habilidades de set (cualquiera de las marcadas)
//   - Hueco mínimo, rango y rareza
//   - Ordenar por: habilidades buscadas, defensa, rareza, huecos o resistencia elemental
// Los filtros no son del popup sino de quien lo abre (ver DatosDialogoArmaduras), así se
// conservan al pasar de una ranura a otra.
//
// Al elegir una pieza el popup se cierra devolviéndola; si se cierra de cualquier otra
// forma (X, Escape, click fuera) devuelve `undefined` y la selección no cambia.
@Component({
  selector: 'app-dialogo-armaduras',
  standalone: true,
  imports: [TranslatePipe, BuscadorFiltrosComponent, SelectorHabilidadesComponent],
  templateUrl: './dialogo-armaduras.component.html',
  styleUrl: './dialogo-armaduras.component.scss'
})
export class DialogoArmadurasComponent {
  private readonly datos = inject<DatosDialogoArmaduras>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<DialogoArmadurasComponent, ArmorPiece>>(MatDialogRef);
  private readonly injector = inject(Injector);
  private readonly wildsApi = inject(WildsApiService);

  readonly ranura = this.datos.ranura;
  readonly icono = ICONOS_RANURA[this.datos.ranura];
  readonly seleccionada = this.datos.seleccionada;
  readonly filtros = this.datos.filtros;

  readonly criteriosOrden = CRITERIOS_ORDEN_ARMADURA;
  readonly rangos = RANGOS_ARMADURA;
  readonly rarezas = RAREZAS;
  readonly nivelesHueco = NIVELES_HUECO;
  readonly modosHabilidades: readonly ModoHabilidades[] = ['any', 'all'];
  readonly iconosElemento = ICONOS_ELEMENTO;

  readonly textoBusqueda = signal('');

  private readonly buscador = viewChild(BuscadorFiltrosComponent);
  private readonly lista = viewChild<ElementRef<HTMLElement>>('lista');

  // 🌐 Catálogo completo de armaduras (ya cacheado por el servicio: los selectores de la
  // página lo han pedido antes). Se vuelve a pedir si cambia el idioma.
  readonly catalogo = rxResource({
    request: () => this.wildsApi.locale(),
    loader: ({ request }) => this.wildsApi.getArmor(request)
  });

  readonly piezasRanura = computed(() =>
    (this.catalogo.value() ?? []).filter(pieza => pieza.kind === this.ranura));

  // Nombre de cada habilidad de cualquier ranura, para los chips de habilidades elegidas en
  // otra ranura que ninguna pieza de esta tiene
  readonly nombresHabilidades = computed<ReadonlyMap<number, string>>(() => {
    const nombres = new Map<number, string>();
    for (const pieza of this.catalogo.value() ?? []) {
      for (const { skill } of pieza.skills) nombres.set(skill.id, skill.name);
    }
    return nombres;
  });

  // Opciones de cada sección de habilidades: las que salen en alguna pieza de la ranura,
  // por orden alfabético y con cuántas piezas las tienen
  readonly opcionesHabilidad = computed<Record<TipoHabilidadArmadura, OpcionHabilidad[]>>(() => {
    const opciones: Record<TipoHabilidadArmadura, Map<number, OpcionHabilidad>> =
      { armor: new Map(), set: new Map() };

    for (const pieza of this.piezasRanura()) {
      for (const { skill } of pieza.skills) {
        const porTipo = opciones[tipoHabilidad(skill.kind)];
        const actual = porTipo.get(skill.id);
        porTipo.set(skill.id, { id: skill.id, nombre: skill.name, total: (actual?.total ?? 0) + 1 });
      }
    }

    const ordenar = (mapa: Map<number, OpcionHabilidad>) =>
      [...mapa.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
    return { armor: ordenar(opciones.armor), set: ordenar(opciones.set) };
  });

  // Todas las habilidades buscadas (de las dos secciones): se resaltan en cada fila y, con el
  // orden por defecto, suben arriba las piezas que más niveles aportan de ellas
  private readonly idsBuscados = computed(() => {
    const { habilidades, habilidadesSet } = this.filtros();
    return new Set([...habilidades, ...habilidadesSet]);
  });

  readonly filtrosActivos = computed(() => {
    const f = this.filtros();
    return f.habilidades.length + f.habilidadesSet.length + f.rangos.length +
      f.rarezas.length + (f.huecoMinimo === null ? 0 : 1) + (f.orden === 'default' ? 0 : 1);
  });

  // Piezas de la ranura que pasan el buscador (sin distinguir mayúsculas ni tildes) y los
  // filtros del panel, ordenadas según "Ordenar por". Con el orden por defecto y alguna
  // habilidad buscada, primero van las piezas que más niveles aportan de las buscadas
  // (no hace falta un criterio aparte para eso: si buscas habilidades, es lo que quieres ver)
  readonly piezasFiltradas = computed<ArmorPiece[]>(() => {
    const texto = normalizar(this.textoBusqueda().trim());
    const f = this.filtros();

    const filtradas = this.piezasRanura().filter(pieza => {
      const ids = pieza.skills.map(habilidad => habilidad.skill.id);
      const tiene = (id: number) => ids.includes(id);

      return (!texto || normalizar(pieza.name).includes(texto)) &&
        (f.habilidades.length === 0 ||
          (f.modoHabilidades === 'all' ? f.habilidades.every(tiene) : f.habilidades.some(tiene))) &&
        (f.habilidadesSet.length === 0 || f.habilidadesSet.some(tiene)) &&
        (f.huecoMinimo === null || pieza.slots.some(nivel => nivel >= f.huecoMinimo!)) &&
        (f.rangos.length === 0 || f.rangos.includes(pieza.rank as RangoArmadura)) &&
        (f.rarezas.length === 0 || f.rarezas.includes(pieza.rarity));
    });

    // sort() es estable: a igualdad de valor se conserva el orden del juego
    if (f.orden === 'default') {
      const buscados = this.idsBuscados();
      if (buscados.size === 0) return filtradas;
      return [...filtradas].sort((a, b) => nivelesBuscados(b, buscados) - nivelesBuscados(a, buscados));
    }

    const signo = f.descendente ? -1 : 1;
    return [...filtradas].sort((a, b) => signo * (valorOrden(a, f.orden) - valorOrden(b, f.orden)));
  });

  readonly filas = computed<FilaArmadura[]>(() => {
    const buscados = this.idsBuscados();
    return this.piezasFiltradas().map(pieza => ({
      pieza,
      habilidades: pieza.skills.map(({ skill, level }) => ({
        id: skill.id,
        nombre: skill.name,
        nivel: level,
        tipo: tipoHabilidad(skill.kind),
        buscada: buscados.has(skill.id)
      }))
    }));
  });

  // Cuántas piezas de la ranura tiene cada opción de filtro (las que tienen 0 se desactivan)
  readonly conteoRangos = computed(() => contar(this.piezasRanura(), pieza => pieza.rank as RangoArmadura));
  readonly conteoRarezas = computed(() => contar(this.piezasRanura(), pieza => pieza.rarity));
  readonly conteoHuecos = computed(() => {
    const conteo = new Map<number, number>();
    for (const nivel of NIVELES_HUECO) {
      conteo.set(nivel, this.piezasRanura().filter(pieza => pieza.slots.some(hueco => hueco >= nivel)).length);
    }
    return conteo;
  });

  // Al ordenar por resistencia se muestra en cada fila la de ese elemento
  readonly elementoOrden = computed(() => {
    const orden = this.filtros().orden;
    return orden in ICONOS_ELEMENTO ? orden as keyof typeof ICONOS_ELEMENTO : null;
  });

  // Si el popup se abre con una pieza ya elegida, en cuanto llegue la lista se baja hasta ella
  private desplazamientoPendiente = this.seleccionada !== null;

  constructor() {
    // Con ratón, el buscador queda listo para escribir nada más abrir
    this.dialogRef.afterOpened().subscribe(() => this.enfocarBuscador());

    effect(() => {
      if (this.filas().length === 0 || !this.desplazamientoPendiente) return;
      this.desplazamientoPendiente = false;
      afterNextRender(() => {
        this.lista()?.nativeElement
          .querySelector('.fila-armadura.seleccionada')
          ?.scrollIntoView({ block: 'center' });
      }, { injector: this.injector });
    });
  }

  onBusquedaInput(texto: string): void {
    this.textoBusqueda.set(texto);
    this.subirLista();
  }

  cambiarHabilidades(tipo: TipoHabilidadArmadura, ids: number[]): void {
    this.actualizarFiltros(f => ({ ...f, [CLAVE_FILTRO[tipo]]: ids }));
  }

  elegirModoHabilidades(modo: ModoHabilidades): void {
    this.actualizarFiltros(f => ({ ...f, modoHabilidades: modo }));
  }

  // Pulsar el nivel ya marcado lo desmarca
  elegirHuecoMinimo(nivel: number): void {
    this.actualizarFiltros(f => ({ ...f, huecoMinimo: f.huecoMinimo === nivel ? null : nivel }));
  }

  alternarRango(rango: RangoArmadura): void {
    this.actualizarFiltros(f => ({ ...f, rangos: alternar(f.rangos, rango) }));
  }

  alternarRareza(rareza: number): void {
    this.actualizarFiltros(f => ({ ...f, rarezas: alternar(f.rarezas, rareza) }));
  }

  // Al elegir un criterio nuevo se empieza de mayor a menor
  elegirOrden(orden: CriterioOrdenArmadura): void {
    this.actualizarFiltros(f => ({ ...f, orden, descendente: f.orden === orden ? f.descendente : true }));
  }

  alternarSentido(): void {
    this.actualizarFiltros(f => ({ ...f, descendente: !f.descendente }));
  }

  borrarFiltros(): void {
    this.actualizarFiltros(() => FILTROS_ARMADURA_VACIOS);
  }

  // Cada cambio de filtros vuelve la lista al principio, como al escribir en el buscador
  private actualizarFiltros(cambio: (filtros: FiltrosArmadura) => FiltrosArmadura): void {
    this.filtros.update(cambio);
    this.subirLista();
  }

  reintentarCarga(): void {
    this.catalogo.reload();
  }

  elegirPieza(pieza: ArmorPiece): void {
    this.dialogRef.close(pieza);
  }

  cerrar(): void {
    this.dialogRef.close();
  }

  private subirLista(): void {
    const lista = this.lista()?.nativeElement;
    if (lista) lista.scrollTop = 0;
  }

  // Solo con ratón: en móvil enfocar el buscador abriría el teclado tapando media lista
  private enfocarBuscador(): void {
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      this.buscador()?.enfocar();
    }
  }
}

// La API marca cada habilidad como "armor", "set" o "group". "set" y "group" son las dos
// habilidades de set (ver TipoHabilidadArmadura); cualquier otro valor es una habilidad normal
function tipoHabilidad(kind: string): TipoHabilidadArmadura {
  return kind === 'set' || kind === 'group' ? 'set' : 'armor';
}

// Niveles que aporta la pieza de las habilidades buscadas
function nivelesBuscados(pieza: ArmorPiece, buscados: ReadonlySet<number>): number {
  return pieza.skills.reduce((total, { skill, level }) => total + (buscados.has(skill.id) ? level : 0), 0);
}

function valorOrden(pieza: ArmorPiece, orden: CriterioOrdenArmadura): number {
  switch (orden) {
    case 'defense': return pieza.defense.max;
    case 'rarity': return pieza.rarity;
    // Suma de niveles de hueco: [3, 1] (4) vale más que [2] (2)
    case 'slots': return pieza.slots.reduce((total, nivel) => total + nivel, 0);
    case 'default': return 0;
    default: return pieza.resistances[orden];
  }
}
