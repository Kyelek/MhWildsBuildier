import { WritableSignal } from '@angular/core';
import { ArmorPiece } from '../../core/models/wilds.models';

export type RanuraArmadura = ArmorPiece['kind'];
export type RangoArmadura = 'low' | 'high';
export type ElementoResistencia = keyof ArmorPiece['resistances'];

// 🛡️ Ranuras en el orden del juego, cada una con su icono (public/images/armor). Hay un
// icono por tipo de pieza, no uno por armadura.
export const RANURAS_ARMADURA: readonly RanuraArmadura[] = ['head', 'chest', 'arms', 'waist', 'legs'];

export const ICONOS_RANURA: Record<RanuraArmadura, string> = {
  head: 'images/armor/48px-MHWilds-Helmet.png',
  chest: 'images/armor/48px-MHWilds-Chestplate.png',
  arms: 'images/armor/48px-MHWilds-Armguards.png',
  waist: 'images/armor/48px-MHWilds-Waist.png',
  legs: 'images/armor/48px-MHWilds-Leggings.png'
};

// ==========================================
// 🔍 FILTROS DE LA LISTA DE ARMADURAS (ver dialogo-armaduras)
// ==========================================

// Las habilidades de cada pieza vienen de la API con un "kind" que las separa en tres
// secciones de filtro distintas:
//   - "armor": habilidades normales (Ojo crítico, Bonus crítico...)
//   - "set":   bonificación de conjunto (Tiranía de Gore Magala: 2/4 piezas del set)
//   - "group": bonificación de grupo, compartida por piezas de varios conjuntos (Alma del amo)
export type TipoHabilidadArmadura = 'armor' | 'set' | 'group';
export const TIPOS_HABILIDAD_ARMADURA: readonly TipoHabilidadArmadura[] = ['armor', 'set', 'group'];

// Cómo se combinan varias habilidades normales marcadas: piezas con ALGUNA de ellas o
// solo las que las tienen TODAS
export type ModoHabilidades = 'any' | 'all';

// Habilidad que se puede elegir en un filtro, con cuántas piezas de la ranura la tienen
export interface OpcionHabilidad {
  id: number;
  nombre: string;
  total: number;
}

// Criterios de "Ordenar por". "default" respeta el orden de la API (el del juego) y
// "match" pone arriba las piezas que más niveles aportan de las habilidades buscadas.
export type CriterioOrdenArmadura = 'default' | 'match' | 'defense' | 'rarity' | 'slots' | ElementoResistencia;
export const CRITERIOS_ORDEN_ARMADURA: readonly CriterioOrdenArmadura[] =
  ['default', 'match', 'defense', 'rarity', 'slots', 'fire', 'water', 'thunder', 'ice', 'dragon'];

export const RANGOS_ARMADURA: readonly RangoArmadura[] = ['low', 'high'];

// Niveles de hueco para decoraciones que puede tener una pieza
export const NIVELES_HUECO: readonly number[] = [1, 2, 3];

export interface FiltrosArmadura {
  habilidades: number[];          // Habilidades normales (id). Vacío = sin filtrar
  modoHabilidades: ModoHabilidades;
  bonusConjunto: number[];        // Piezas con CUALQUIERA de estas bonificaciones de conjunto
  bonusGrupo: number[];           // Piezas con CUALQUIERA de estas bonificaciones de grupo
  huecoMinimo: number | null;     // Piezas con al menos un hueco de este nivel o superior
  rangos: RangoArmadura[];        // Vacío = rango bajo y alto
  rarezas: number[];              // Vacío = todas las rarezas
  orden: CriterioOrdenArmadura;
  descendente: boolean;           // true = de mayor a menor
}

export const FILTROS_ARMADURA_VACIOS: FiltrosArmadura = {
  habilidades: [],
  modoHabilidades: 'any',
  bonusConjunto: [],
  bonusGrupo: [],
  huecoMinimo: null,
  rangos: [],
  rarezas: [],
  orden: 'default',
  descendente: true
};

// Datos que recibe el popup de selección de armaduras al abrirse (el catálogo lo pide él
// mismo a la API). Los filtros llegan como signal para que el popup los cambie en vivo y
// quien lo abre los conserve para las demás ranuras: si buscas "Ojo crítico" en el casco,
// al abrir el pecho ya viene filtrado.
export interface DatosDialogoArmaduras {
  ranura: RanuraArmadura;
  seleccionada: ArmorPiece | null;
  filtros: WritableSignal<FiltrosArmadura>;
}
