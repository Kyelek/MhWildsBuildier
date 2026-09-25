import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { rxResource } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { WildsApiService } from '../../core/services/wilds-api.service';
import { ArmorPiece, ArmorSetBonus, Weapon } from '../../core/models/wilds.models';
import { SelectorBuscableComponent } from '../../shared/components/selector-buscable/selector-buscable.component';
import {
  AportePieza,
  BonificacionSetActiva,
  ConteoPorSet,
  DescripcionHabilidad,
  HabilidadAcumulada
} from './models/skill-forge.models';

// Importaciones Standalone de Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';

type TipoPieza = 'head' | 'chest' | 'arms' | 'waist' | 'legs';

// 🌟 EXCEPCIÓN: habilidades de GRUPO que se tratan como una bonificación de conjunto más.
// Se activan al llevar varias piezas (de cualquier conjunto) que tengan esa habilidad, con
// los rangos de su "groupBonus" en /armor/sets. De momento solo "Alma del amo" (id 131,
// el mismo en todos los idiomas: "Lord's Soul" / "ヌシの魂"); el resto de habilidades de
// grupo siguen mostrándose como habilidades normales.
const HABILIDADES_GRUPO_COMO_BONIFICACION: readonly number[] = [131];

// 🛡️ Icono de cada ranura de armadura (public/images/armor). Hay uno por tipo de pieza,
// no uno por armadura: sirve para ver de qué parte del equipo viene cada habilidad.
const ICONOS_RANURA: Record<TipoPieza, string> = {
  head: 'images/armor/48px-MHWilds-Helmet.png',
  chest: 'images/armor/48px-MHWilds-Chestplate.png',
  arms: 'images/armor/48px-MHWilds-Armguards.png',
  waist: 'images/armor/48px-MHWilds-Waist.png',
  legs: 'images/armor/48px-MHWilds-Leggings.png'
};

@Component({
  selector: 'app-skill-forge',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    TranslatePipe,
    SelectorBuscableComponent
  ],
  templateUrl: './skill-forge.component.html',
  styleUrl: './skill-forge.component.scss'
})
export class SkillForgeComponent {
  private readonly wildsApi = inject(WildsApiService);

  // 1. Catálogos completos desde la API
  // 🌐 `request` observa el idioma actual de la API: al cambiarlo (selector EN/ES/JP),
  // el `loader` se vuelve a ejecutar y los catálogos llegan ya traducidos.
  readonly armorResource = rxResource({
    request: () => this.wildsApi.locale(),
    loader: ({ request }) => this.wildsApi.getArmor(request)
  });

  readonly armorSetsResource = rxResource({
    request: () => this.wildsApi.locale(),
    loader: ({ request }) => this.wildsApi.getArmorSets(request)
  });

  readonly skillsResource = rxResource({
    request: () => this.wildsApi.locale(),
    loader: ({ request }) => this.wildsApi.getSkills(request)
  });

  // 🗡️ Catálogo de armas: solo lo necesita la pestaña "Estadísticas Totales" (ataque/afinidad),
  // pero se pide junto al resto para que esa pestaña ya tenga el dato listo al cambiar a ella.
  readonly weaponsResource = rxResource({
    request: () => this.wildsApi.locale(),
    loader: ({ request }) => this.wildsApi.getWeapons(request)
  });

  readonly cargando = computed(() =>
    this.armorResource.isLoading() || this.armorSetsResource.isLoading() ||
    this.skillsResource.isLoading() || this.weaponsResource.isLoading()
  );

  // 🚨 Si cualquiera de los catálogos falló al cargar, mostramos el primer error
  readonly error = computed(() =>
    this.armorResource.error() ?? this.armorSetsResource.error() ??
    this.skillsResource.error() ?? this.weaponsResource.error()
  );

  // Vuelve a pedir los catálogos (usado por el botón "Reintentar")
  reintentar(): void {
    this.armorResource.reload();
    this.armorSetsResource.reload();
    this.skillsResource.reload();
    this.weaponsResource.reload();
  }

  // 2. Estado de las piezas y el arma seleccionadas para construir el conjunto personalizado
  readonly piezaCabeza = signal<ArmorPiece | null>(null);
  readonly piezaPecho = signal<ArmorPiece | null>(null);
  readonly piezaBrazos = signal<ArmorPiece | null>(null);
  readonly piezaCintura = signal<ArmorPiece | null>(null);
  readonly piezaPiernas = signal<ArmorPiece | null>(null);
  readonly armaSeleccionada = signal<Weapon | null>(null);

  // 🗂️ Pestaña activa sobre "Habilidades del Conjunto" (ver plantilla): por defecto se
  // muestran las habilidades acumuladas; la otra pestaña muestra las Estadísticas Totales.
  readonly pestanaActiva = signal<'habilidades' | 'estadisticas'>('habilidades');

  // 🗂️ Pestaña activa de la tarjeta de detalle (bajo los selectores): las bonificaciones
  // de conjunto (con la descripción de su habilidad) o las descripciones detalladas de
  // las habilidades aportadas por las piezas.
  readonly pestanaDetalle = signal<'bonificaciones' | 'descripciones'>('bonificaciones');

  // 🌐 PERSISTENCIA DE LA SELECCIÓN ENTRE IDIOMAS
  //
  // Las piezas seleccionadas guardan nombre/descripción en el idioma con el que se cargaron.
  // Si el usuario cambia el idioma, el catálogo se recarga ya traducido, pero el objeto que
  // teníamos guardado en el signal seguiría "congelado" en el idioma anterior. En vez de
  // perder el equipamiento elegido, en cuanto llega el catálogo nuevo buscamos cada pieza ya
  // seleccionada por su "id" (estable entre idiomas) y sustituimos el objeto por su versión
  // traducida. Así el cazador conserva su conjunto y Habilidades del Conjunto / Bonificaciones
  // de Conjunto se actualizan solas al nuevo idioma sin resetearse.
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

  // 3. Piezas de armadura acotadas por ranura. El buscador de texto de cada selector ya lo
  // resuelve internamente <app-selector-buscable> (ver shared/components/selector-buscable).
  readonly cascos = computed(() => this.armorPorRanura('head'));
  readonly pechos = computed(() => this.armorPorRanura('chest'));
  readonly brazos = computed(() => this.armorPorRanura('arms'));
  readonly cinturas = computed(() => this.armorPorRanura('waist'));
  readonly piernas = computed(() => this.armorPorRanura('legs'));

  readonly armas = computed(() => this.weaponsResource.value() ?? []);

  // Referencia estable (no se recrea en cada ciclo) para agrupar el selector de armas
  // por tipo ('kind') dentro de <app-selector-buscable>. Devuelve la CLAVE de traducción
  // del tipo (p. ej. "weaponTypes.bow"): el selector la traduce al idioma activo.
  readonly agruparArmaPorTipo = (arma: Weapon) => `weaponTypes.${arma.kind}`;

  // Piezas actualmente equipadas (sin huecos vacíos)
  readonly piezasSeleccionadas = computed<ArmorPiece[]>(() => {
    const piezas = [
      this.piezaCabeza(),
      this.piezaPecho(),
      this.piezaBrazos(),
      this.piezaCintura(),
      this.piezaPiernas()
    ];
    return piezas.filter((pieza): pieza is ArmorPiece => pieza !== null);
  });

  // ==========================================
  // ⚔️ REQUISITO 2: Habilidades acumuladas por las piezas individuales
  // ==========================================
  readonly habilidadesActivas = computed<HabilidadAcumulada[]>(() => {
    const acumulado = new Map<number, HabilidadAcumulada>();

    for (const pieza of this.piezasSeleccionadas()) {
      for (const habilidad of pieza.skills) {
        const existente = acumulado.get(habilidad.skill.id);
        const nivelTotal = (existente?.nivel ?? 0) + habilidad.level;

        acumulado.set(habilidad.skill.id, {
          skillId: habilidad.skill.id,
          nombre: habilidad.skill.name,
          kind: habilidad.skill.kind,
          nivel: nivelTotal,
          descripcion: this.obtenerDescripcionPorNivel(habilidad.skill.id, nivelTotal, habilidad.description),
          // Las piezas se recorren en orden de ranura, así los iconos salen casco → piernas
          aportes: [...(existente?.aportes ?? []), this.crearAporte(pieza, habilidad.level)]
        });
      }
    }

    return Array.from(acumulado.values()).sort((a, b) => b.nivel - a.nivel || a.nombre.localeCompare(b.nombre));
  });

  // ==========================================
  // 🎖️ REQUISITO 3: Detección de conjuntos y bonificaciones de set (bonus.ranks)
  //
  // 💡 IMPORTANTE: un cazador puede mezclar piezas de varios conjuntos distintos (p. ej.
  // 2 piezas del Set A + 3 piezas del Set B). Por eso NO nos quedamos con "el conjunto
  // predominante": calculamos el conteo de piezas por CADA conjunto presente y activamos
  // la bonificación de TODOS los conjuntos que alcancen el mínimo de piezas requerido,
  // permitiendo que varias bonificaciones de set convivan de forma simultánea.
  // ==========================================

  // Cuenta cuántas piezas seleccionadas pertenecen a cada conjunto de armadura (armorSet.id)
  private readonly conteoPorSet = computed<Map<number, ConteoPorSet>>(() => {
    const conteo = new Map<number, ConteoPorSet>();

    for (const pieza of this.piezasSeleccionadas()) {
      const set = pieza.armorSet;
      if (!set) continue;

      const actual = conteo.get(set.id);
      conteo.set(set.id, {
        nombre: set.name,
        cantidad: (actual?.cantidad ?? 0) + 1
      });
    }

    return conteo;
  });

  // Lista de TODAS las bonificaciones activas a la vez: una por cada conjunto con piezas
  // suficientes, más las bonificaciones de grupo tratadas como excepción ("Alma del amo").
  readonly bonificacionesSet = computed<BonificacionSetActiva[]>(() => {
    const todosLosSets = this.armorSetsResource.value() ?? [];
    const bonificaciones: BonificacionSetActiva[] = [];

    for (const [setId, info] of this.conteoPorSet()) {
      const bonus = todosLosSets.find(set => set.id === setId)?.bonus;
      if (!bonus) continue;

      const piezasDelSet = this.piezasSeleccionadas().filter(pieza => pieza.armorSet?.id === setId);
      const bonificacion = this.construirBonificacion(`set-${setId}`, info.nombre, piezasDelSet, bonus);
      if (bonificacion) bonificaciones.push(bonificacion);
    }

    for (const skillId of HABILIDADES_GRUPO_COMO_BONIFICACION) {
      // Los rangos son los mismos en todos los conjuntos que comparten esta habilidad de grupo
      const grupo = todosLosSets.find(set => set.groupBonus?.skill.id === skillId)?.groupBonus;
      if (!grupo) continue;

      // Cuenta las piezas equipadas que aportan la habilidad, sean del conjunto que sean
      const piezas = this.piezasSeleccionadas()
        .filter(pieza => pieza.skills.some(habilidad => habilidad.skill.id === skillId));

      const bonificacion = this.construirBonificacion(`grupo-${skillId}`, grupo.skill.name, piezas, grupo);
      if (!bonificacion) continue;

      // La tarjeta se titula con la habilidad de grupo ("Alma del amo"); la habilidad que
      // otorga ("Agallas (tenacidad)") se describe en "Descripciones Detalladas".
      bonificaciones.push({
        ...bonificacion,
        esGrupo: true,
        nombreHabilidad: grupo.skill.name,
        descripcion: null,
        efectoOtorgado: {
          clave: `efecto-grupo-${skillId}`,
          nombre: bonificacion.nombreHabilidad,
          nivel: bonificacion.nivel,
          descripcion: bonificacion.descripcion ?? '',
          aportes: bonificacion.aportes
        }
      });
    }

    // Mostramos primero la bonificación con más piezas equipadas (la más "completa")
    return bonificaciones.sort((a, b) => b.piezasEquipadas - a.piezasEquipadas);
  });

  // Activa el rango más alto alcanzado con las piezas equipadas (o null si no llega ni al
  // primero). "piezasMaximas" son las piezas del rango MÁS ALTO de la bonificación, para
  // mostrar el progreso real (p. ej. Gore con 2 o 3 piezas: 2/4 y 3/4, no 2/2 ni 3/2).
  private construirBonificacion(
    clave: string,
    nombreOrigen: string,
    piezas: ArmorPiece[],
    bonus: ArmorSetBonus
  ): BonificacionSetActiva | null {
    const piezasEquipadas = piezas.length;
    const rangoActivo = bonus.ranks
      .filter(rango => rango.pieces <= piezasEquipadas)
      .sort((a, b) => b.pieces - a.pieces)[0];

    if (!rangoActivo) return null;

    return {
      clave,
      esGrupo: false,
      nombreSet: nombreOrigen,
      piezasEquipadas,
      piezasMaximas: Math.max(...bonus.ranks.map(rango => rango.pieces)),
      nombreHabilidad: rangoActivo.skill.name ?? bonus.skill.name,
      nivel: rangoActivo.skill.level,
      descripcion: rangoActivo.skill.description,
      efectoOtorgado: null,
      aportes: piezas.map(pieza => this.crearAporte(pieza, 1))
    };
  }

  // ==========================================
  // 📋 REQUISITO 4: Descripciones detalladas de las habilidades aportadas por las piezas
  // ==========================================
  readonly descripcionesDetalladas = computed<DescripcionHabilidad[]>(() => {
    // Habilidades de las piezas. Se excluyen las de tipo "set" (p. ej. "Tiranía de Gore
    // Magala") y las de grupo tratadas como bonificación ("Alma del amo"): su nivel activado
    // ya se describe en la pestaña "Bonificaciones de Conjunto" (p. ej. "Eclipse negro I").
    const deLasPiezas = this.habilidadesActivas()
      .filter(habilidad =>
        habilidad.kind !== 'set' && !HABILIDADES_GRUPO_COMO_BONIFICACION.includes(habilidad.skillId))
      .map(habilidad => ({
        clave: `pieza-${habilidad.skillId}`,
        nombre: habilidad.nombre,
        nivel: habilidad.nivel,
        descripcion: habilidad.descripcion,
        aportes: habilidad.aportes
      }));

    // Más las habilidades que otorgan las bonificaciones de grupo activas ("Agallas (tenacidad)")
    const otorgadas = this.bonificacionesSet()
      .map(bono => bono.efectoOtorgado)
      .filter((efecto): efecto is DescripcionHabilidad => efecto !== null);

    return [...deLasPiezas, ...otorgadas];
  });

  // ==========================================
  // 📊 PESTAÑA "ESTADÍSTICAS TOTALES" (mismo cálculo que el Constructor, ver
  // builder.component.ts, aplicado aquí a las piezas y el arma de esta pantalla)
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
    const piezas = this.piezasSeleccionadas();
    const totales = { fire: 0, water: 0, thunder: 0, ice: 0, dragon: 0 };

    for (const pieza of piezas) {
      if (pieza.resistances) {
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
  // ⚙️ MÉTODOS INTERNOS
  // ==========================================

  private crearAporte(pieza: ArmorPiece, nivel: number): AportePieza {
    return { ranura: pieza.kind, nombrePieza: pieza.name, nivel, icono: ICONOS_RANURA[pieza.kind] };
  }

  private armorPorRanura(ranura: TipoPieza): ArmorPiece[] {
    return (this.armorResource.value() ?? []).filter(piece => piece.kind === ranura);
  }

  // Busca en el catálogo de /skills la descripción exacta del nivel total alcanzado.
  // Si no está disponible (catálogo cargando o nivel fuera de rango), usa la descripción de la pieza como respaldo.
  private obtenerDescripcionPorNivel(skillId: number, nivelTotal: number, descripcionRespaldo: string): string {
    const catalogo = this.skillsResource.value() ?? [];
    const habilidad = catalogo.find(item => item.id === skillId);
    const rango = habilidad?.ranks.find(r => r.level === nivelTotal);
    return rango?.description ?? descripcionRespaldo;
  }
}
