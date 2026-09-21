import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { rxResource } from '@angular/core/rxjs-interop';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { WildsApiService } from '../../core/services/wilds-api.service';
import { ArmorPiece } from '../../core/models/wilds.models';

// Importaciones Standalone de Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';

type TipoPieza = 'head' | 'chest' | 'arms' | 'waist' | 'legs';

// 📊 Habilidad ya acumulada entre todas las piezas equipadas (nivel total + descripción del nivel alcanzado)
interface HabilidadAcumulada {
  skillId: number;
  nombre: string;
  kind: string;
  nivel: number;
  descripcion: string;
}

// 🎖️ Bonificación de conjunto actualmente activada (puede haber varias a la vez, una por cada
// conjunto del que se tengan 2 o más piezas equipadas simultáneamente)
interface BonificacionSetActiva {
  setId: number;
  nombreSet: string;
  piezasEquipadas: number;
  piezasRequeridas: number;
  nombreHabilidad: string;
  nivel: number;
  descripcion: string;
}

// 🔢 Conteo interno de cuántas piezas seleccionadas pertenecen a un mismo conjunto de armadura
interface ConteoPorSet {
  nombre: string;
  cantidad: number;
}

// 📖 Entrada unificada para el panel de descripciones detalladas
interface DescripcionHabilidad {
  clave: string;
  nombre: string;
  nivel: number;
  descripcion: string;
  esBonificacionSet: boolean;
}

@Component({
  selector: 'app-skill-forge',
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
  templateUrl: './skill-forge.component.html',
  styleUrl: './skill-forge.component.scss'
})
export class SkillForgeComponent {
  private readonly wildsApi = inject(WildsApiService);
  private readonly translateService = inject(TranslateService);

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
    this.armorResource.isLoading() || this.armorSetsResource.isLoading() || this.skillsResource.isLoading()
  );

  // 🚨 Si cualquiera de los tres catálogos falló al cargar, mostramos el primer error
  readonly error = computed(() =>
    this.armorResource.error() ?? this.armorSetsResource.error() ?? this.skillsResource.error()
  );

  // Vuelve a pedir los tres catálogos (usado por el botón "Reintentar")
  reintentar(): void {
    this.armorResource.reload();
    this.armorSetsResource.reload();
    this.skillsResource.reload();
  }

  // 2. Estado de las piezas seleccionadas para construir el conjunto personalizado
  readonly selectedHead = signal<ArmorPiece | null>(null);
  readonly selectedChest = signal<ArmorPiece | null>(null);
  readonly selectedArms = signal<ArmorPiece | null>(null);
  readonly selectedWaist = signal<ArmorPiece | null>(null);
  readonly selectedLegs = signal<ArmorPiece | null>(null);

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
    if (!armadura) return; // seguimos esperando el catálogo en el nuevo idioma

    this.selectedHead.update(actual => this.buscarPorId(actual, armadura));
    this.selectedChest.update(actual => this.buscarPorId(actual, armadura));
    this.selectedArms.update(actual => this.buscarPorId(actual, armadura));
    this.selectedWaist.update(actual => this.buscarPorId(actual, armadura));
    this.selectedLegs.update(actual => this.buscarPorId(actual, armadura));
  });

  // Busca en el catálogo (ya en el idioma nuevo) la pieza con el mismo id que la seleccionada
  // actualmente. Si no la encuentra (no debería pasar, los id son estables entre idiomas),
  // mantiene el objeto anterior en vez de perder la selección de golpe.
  private buscarPorId(actual: ArmorPiece | null, catalogo: ArmorPiece[]): ArmorPiece | null {
    if (!actual) return null;
    return catalogo.find(pieza => pieza.id === actual.id) ?? actual;
  }

  // 🔍 Texto de búsqueda independiente para cada selector
  readonly headSearch = signal<string>('');
  readonly chestSearch = signal<string>('');
  readonly armsSearch = signal<string>('');
  readonly waistSearch = signal<string>('');
  readonly legsSearch = signal<string>('');

  // 3. Listas filtradas reactivamente por tipo de pieza y texto de búsqueda
  readonly helmets = computed(() => this.filterArmorBySlot('head', this.headSearch()));
  readonly chests = computed(() => this.filterArmorBySlot('chest', this.chestSearch()));
  readonly arms = computed(() => this.filterArmorBySlot('arms', this.armsSearch()));
  readonly waists = computed(() => this.filterArmorBySlot('waist', this.waistSearch()));
  readonly legs = computed(() => this.filterArmorBySlot('legs', this.legsSearch()));

  // Piezas actualmente equipadas (sin huecos vacíos)
  readonly piezasSeleccionadas = computed<ArmorPiece[]>(() => {
    const piezas = [
      this.selectedHead(),
      this.selectedChest(),
      this.selectedArms(),
      this.selectedWaist(),
      this.selectedLegs()
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
          descripcion: this.obtenerDescripcionPorNivel(habilidad.skill.id, nivelTotal, habilidad.description)
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

  // Lista de TODAS las bonificaciones de conjunto activas a la vez (una por cada set con 2+ piezas)
  readonly bonificacionesSet = computed<BonificacionSetActiva[]>(() => {
    const todosLosSets = this.armorSetsResource.value() ?? [];
    const bonificaciones: BonificacionSetActiva[] = [];

    for (const [setId, info] of this.conteoPorSet()) {
      if (info.cantidad < 2) continue; // La bonificación de conjunto mínima requiere al menos 2 piezas

      const conjuntoCompleto = todosLosSets.find(set => set.id === setId);
      const bonus = conjuntoCompleto?.bonus;
      if (!bonus) continue;

      // De todos los rangos cuyo requisito de piezas se cumple, activamos el más alto alcanzado
      const rangoActivo = bonus.ranks
        .filter(rango => rango.pieces <= info.cantidad)
        .sort((a, b) => b.pieces - a.pieces)[0];

      if (!rangoActivo) continue;

      bonificaciones.push({
        setId,
        nombreSet: info.nombre,
        piezasEquipadas: info.cantidad,
        piezasRequeridas: rangoActivo.pieces,
        nombreHabilidad: rangoActivo.skill.name ?? bonus.skill.name,
        nivel: rangoActivo.skill.level,
        descripcion: rangoActivo.skill.description
      });
    }

    // Mostramos primero el conjunto con más piezas equipadas (el más "completo")
    return bonificaciones.sort((a, b) => b.piezasEquipadas - a.piezasEquipadas);
  });

  // ==========================================
  // 📋 REQUISITO 4: Panel de resumen — descripciones detalladas de todo lo obtenido
  // ==========================================
  readonly descripcionesDetalladas = computed<DescripcionHabilidad[]>(() => {
    const lista: DescripcionHabilidad[] = this.habilidadesActivas().map(habilidad => ({
      clave: `pieza-${habilidad.skillId}`,
      nombre: habilidad.nombre,
      nivel: habilidad.nivel,
      descripcion: habilidad.descripcion,
      esBonificacionSet: false
    }));

    // Añadimos una entrada de descripción por CADA bonificación de conjunto activa a la vez
    const sufijoBonificacion = this.translateService.instant('skillForge.descriptions.setBonusOf');
    for (const bono of this.bonificacionesSet()) {
      lista.push({
        clave: `set-${bono.setId}`,
        nombre: `${bono.nombreHabilidad} (${sufijoBonificacion} ${bono.nombreSet})`,
        nivel: bono.nivel,
        descripcion: bono.descripcion,
        esBonificacionSet: true
      });
    }

    return lista;
  });

  // ==========================================
  // ⚙️ MÉTODOS INTERNOS
  // ==========================================

  private filterArmorBySlot(slotType: TipoPieza, searchTerm: string): ArmorPiece[] {
    const allArmor = this.armorResource.value() ?? [];
    const piecesOfSlot = allArmor.filter(piece => piece.kind === slotType);

    if (searchTerm.trim()) {
      return piecesOfSlot.filter(piece =>
        piece.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return piecesOfSlot;
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
