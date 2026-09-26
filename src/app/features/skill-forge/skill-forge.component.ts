import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { rxResource } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { ApiLocale, WildsApiService } from '../../core/services/wilds-api.service';
import { ArmorPiece, ArmorSetBonus, Weapon } from '../../core/models/wilds.models';
import { SelectorArmaComponent } from '../../shared/components/selector-arma/selector-arma.component';
import { SelectorArmaduraComponent } from '../../shared/components/selector-armadura/selector-armadura.component';
import { FILTROS_ARMADURA_VACIOS, FiltrosArmadura, ICONOS_RANURA } from '../../shared/models/filtros-armadura.models';
import {
  AportePieza,
  BonificacionSetActiva,
  DescripcionHabilidad,
  HabilidadAcumulada
} from './models/skill-forge.models';

// Importaciones Standalone de Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import {MatTooltipModule} from '@angular/material/tooltip';

@Component({
  selector: 'app-skill-forge',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    TranslatePipe,
    SelectorArmaComponent,
    SelectorArmaduraComponent,
    MatTooltipModule
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

  readonly cargando = computed(() =>
    this.armorResource.isLoading() || this.armorSetsResource.isLoading() ||
    this.skillsResource.isLoading()
  );

  // 🚨 Si cualquiera de los catálogos falló al cargar, mostramos el primer error
  readonly error = computed(() =>
    this.armorResource.error() ?? this.armorSetsResource.error() ??
    this.skillsResource.error()
  );

  // Vuelve a pedir los catálogos (usado por el botón "Reintentar")
  reintentar(): void {
    this.armorResource.reload();
    this.armorSetsResource.reload();
    this.skillsResource.reload();
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

    const armasDelTipo = this.armasDelTipoSeleccionado.value();
    if (armasDelTipo) {
      this.armaSeleccionada.update(actual => this.buscarPorId(actual, armasDelTipo));
    }
  });

  // 🗡️ El arma ya no sale de un catálogo completo (el popup pide solo las del tipo elegido):
  // para traducirla al cambiar de idioma se piden las armas de SU tipo en el idioma nuevo.
  // La petición es un texto "tipo|idioma" para que solo se repita si cambia alguno de los
  // dos (al elegir otra arma del mismo tipo no hace falta volver a pedir nada).
  private readonly armasDelTipoSeleccionado = rxResource({
    request: () => {
      const tipo = this.armaSeleccionada()?.kind;
      return tipo ? `${tipo}|${this.wildsApi.locale()}` : undefined;
    },
    loader: ({ request }) => {
      const [tipo, locale] = request.split('|') as [string, ApiLocale];
      return this.wildsApi.getWeaponsPorTipo(tipo, locale);
    }
  });

  // Busca en el catálogo (ya en el idioma nuevo) el elemento con el mismo id que el
  // seleccionado actualmente. Si no lo encuentra (no debería pasar, los id son estables entre
  // idiomas), mantiene el objeto anterior en vez de perder la selección de golpe.
  private buscarPorId<T extends { id: number }>(actual: T | null, catalogo: T[]): T | null {
    if (!actual) return null;
    return catalogo.find(item => item.id === actual.id) ?? actual;
  }

  // 3. 🔍 Filtros de los popups de armadura, compartidos por las 5 ranuras: lo que se
  // filtra al elegir el casco (habilidades, bonificaciones...) sigue puesto al abrir el pecho
  readonly filtrosArmadura = signal<FiltrosArmadura>(FILTROS_ARMADURA_VACIOS);

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
  // 🎖️ REQUISITO 3: Bonificaciones de set (bonus.ranks / groupBonus.ranks)
  //
  // 💡 IMPORTANTE: una bonificación se activa por las piezas que TRAEN su habilidad de set,
  // no por el conjunto al que pertenece cada pieza. Casi siempre coincide, pero no siempre:
  //   - Varios conjuntos comparten la misma habilidad (Gore α y Gore β dan "Tiranía de Gore
  //     Magala"): sus piezas suman juntas.
  //   - Hay piezas que traen la habilidad de otro conjunto (la Malla de Gogmazios β da
  //     "Fulgor de Rathalos", no la de su propio conjunto): cuenta para esa otra.
  // Un cazador puede mezclar piezas, así que se activan a la vez TODAS las bonificaciones que
  // alcancen el mínimo de piezas, no solo la "predominante".
  //
  // La API separa las habilidades de set en "set" (rangos en "bonus", 2/4 piezas) y "group"
  // (rangos en "groupBonus", 3 piezas: Alma del amo, Pulso de Guardián...). En el juego son lo
  // mismo; solo cambia cómo se muestran (ver el bucle de abajo).
  // ==========================================

  // Habilidades de set equipadas, con las piezas que aportan cada una (en orden de ranura)
  private readonly piezasPorHabilidadSet = computed<Map<number, { kind: string; piezas: ArmorPiece[] }>>(() => {
    const porHabilidad = new Map<number, { kind: string; piezas: ArmorPiece[] }>();
    for (const pieza of this.piezasSeleccionadas()) {
      for (const { skill } of pieza.skills) {
        if (skill.kind !== 'set' && skill.kind !== 'group') continue;
        const actual = porHabilidad.get(skill.id) ?? { kind: skill.kind, piezas: [] };
        actual.piezas.push(pieza);
        porHabilidad.set(skill.id, actual);
      }
    }
    return porHabilidad;
  });

  // Lista de TODAS las bonificaciones activas a la vez: una por cada habilidad de set con
  // piezas suficientes.
  readonly bonificacionesSet = computed<BonificacionSetActiva[]>(() => {
    const todosLosSets = this.armorSetsResource.value() ?? [];
    const bonificaciones: BonificacionSetActiva[] = [];

    for (const [skillId, { kind, piezas }] of this.piezasPorHabilidadSet()) {
      // Los rangos son los mismos en todos los conjuntos que comparten la habilidad
      if (kind === 'set') {
        const bonus = todosLosSets.find(set => set.bonus?.skill.id === skillId)?.bonus;
        if (!bonus) continue;

        // La tarjeta se titula con el rango activado ("Eclipse negro I") y su origen es la
        // habilidad de set ("Tiranía de Gore Magala")
        const bonificacion = this.construirBonificacion(`set-${skillId}`, bonus.skill.name, piezas, bonus);
        if (bonificacion) bonificaciones.push(bonificacion);
        continue;
      }

      const grupo = todosLosSets.find(set => set.groupBonus?.skill.id === skillId)?.groupBonus;
      if (!grupo) continue;

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
    // Habilidades de las piezas. Se excluyen las de set, tanto de conjunto (p. ej. "Tiranía
    // de Gore Magala") como de grupo ("Alma del amo", "Pulso de Guardián"): se describen al
    // activarse, las de conjunto en "Bonificaciones de Conjunto" ("Eclipse negro I") y las de
    // grupo aquí mismo con la habilidad que otorgan ("Agallas (tenacidad)", justo debajo).
    const deLasPiezas = this.habilidadesActivas()
      .filter(habilidad => habilidad.kind !== 'set' && habilidad.kind !== 'group')
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


  // Busca en el catálogo de /skills la descripción exacta del nivel total alcanzado.
  // Si no está disponible (catálogo cargando o nivel fuera de rango), usa la descripción de la pieza como respaldo.
  private obtenerDescripcionPorNivel(skillId: number, nivelTotal: number, descripcionRespaldo: string): string {
    const catalogo = this.skillsResource.value() ?? [];
    const habilidad = catalogo.find(item => item.id === skillId);
    const rango = habilidad?.ranks.find(r => r.level === nivelTotal);
    return rango?.description ?? descripcionRespaldo;
  }
}
