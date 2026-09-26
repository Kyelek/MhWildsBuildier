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

// Las habilidades de cada pieza se reparten en dos secciones de filtro:
//   - "armor": habilidades normales (Punto débil, Aguante...)
//   - "set":   habilidades de set, las que se activan al llevar varias piezas que las tengan
//              (Tiranía de Gore Magala, Pulso de Guardián, Alma del amo...)
// La API separa las de set en "set" y "group", pero en el juego son lo mismo: una pieza puede
// traer dos (p. ej. Yelmo Fulgúreo G. α: Afán de Anjanath Fulgúreo y Pulso de Guardián) y las
// dos tienen que salir juntas en el filtro.
export type TipoHabilidadArmadura = 'armor' | 'set';

// Cómo se combinan varias habilidades normales marcadas: piezas con ALGUNA de ellas o
// solo las que las tienen TODAS
export type ModoHabilidades = 'any' | 'all';

// Habilidad que se puede elegir en un filtro, con cuántas piezas de la ranura la tienen
export interface OpcionHabilidad {
  id: number;
  nombre: string;
  total: number;
}

// Criterios de "Ordenar por". "default" respeta el orden de la API (el del juego), salvo si
// hay habilidades buscadas: entonces suben las piezas que más niveles aportan de ellas.
export type CriterioOrdenArmadura = 'default' | 'defense' | 'rarity' | 'slots' | ElementoResistencia;
export const CRITERIOS_ORDEN_ARMADURA: readonly CriterioOrdenArmadura[] =
  ['default', 'defense', 'rarity', 'slots', 'fire', 'water', 'thunder', 'ice', 'dragon'];

export const RANGOS_ARMADURA: readonly RangoArmadura[] = ['low', 'high'];

// Niveles de hueco para decoraciones que puede tener una pieza
export const NIVELES_HUECO: readonly number[] = [1, 2, 3];

export interface FiltrosArmadura {
  habilidades: number[];          // Habilidades normales (id). Vacío = sin filtrar
  modoHabilidades: ModoHabilidades;
  habilidadesSet: number[];       // Piezas con CUALQUIERA de estas habilidades de set
  huecoMinimo: number | null;     // Piezas con al menos un hueco de este nivel o superior
  rangos: RangoArmadura[];        // Vacío = rango bajo y alto
  rarezas: number[];              // Vacío = todas las rarezas
  orden: CriterioOrdenArmadura;
  descendente: boolean;           // true = de mayor a menor
}

export const FILTROS_ARMADURA_VACIOS: FiltrosArmadura = {
  habilidades: [],
  modoHabilidades: 'any',
  habilidadesSet: [],
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
