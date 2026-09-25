import { ElementoArma, EstadoArma, Weapon } from '../../core/models/wilds.models';

// 🗡️ Tipos de arma (campo "kind" de la API) en el mismo orden en que los presenta el juego.
// Cada uno tiene su icono en public/images/arms/<tipo>.png y su nombre traducido en
// "weaponTypes.<tipo>" de los ficheros de idioma.
export const TIPOS_ARMA = [
  'great-sword',
  'long-sword',
  'sword-shield',
  'dual-blades',
  'hammer',
  'hunting-horn',
  'lance',
  'gunlance',
  'switch-axe',
  'charge-blade',
  'insect-glaive',
  'bow',
  'heavy-bowgun',
  'light-bowgun'
] as const;

export function iconoTipoArma(tipo: string): string {
  return `images/arms/${tipo}.png`;
}

// ⚡ Iconos de elemento: los mismos que usa el bloque de Resistencias de "Estadísticas Totales"
export const ICONOS_ELEMENTO: Record<ElementoArma, string> = {
  fire: '🔥',
  water: '💧',
  thunder: '⚡',
  ice: '❄️',
  dragon: '🐉'
};

// ☠️ Iconos de estado (no aparecen en "Estadísticas Totales", son propios de la lista de armas)
export const ICONOS_ESTADO: Record<EstadoArma, string> = {
  poison: '☠️',
  paralysis: '💫',
  sleep: '💤',
  blastblight: '💥'
};

// Elemento o estado de un arma ya preparado para mostrarse en la lista del popup
export interface EspecialArma {
  icono: string;
  claveNombre: string; // Clave de traducción del nombre (p. ej. "weaponPicker.elements.fire")
  valor: number;       // Valor que muestra el juego (p. ej. 110)
  oculto: boolean;     // Elemento oculto: se muestra entre paréntesis, como en el juego
}

// Datos que recibe el popup de selección de armas al abrirse (las armas las pide él mismo
// a la API, solo las del tipo que se elija)
export interface DatosDialogoArmas {
  seleccionada: Weapon | null;
}

// ==========================================
// 🔍 FILTROS DE LA LISTA DE ARMAS (ver dialogo-armas)
// ==========================================

// Opción de la sección "Elemento / Estado": un elemento, un estado o "Sin elemento"
export type ClaveEspecial = ElementoArma | EstadoArma | 'none';

export interface OpcionEspecial {
  clave: ClaveEspecial;
  icono: string;
  claveNombre: string; // Clave de traducción del nombre
}

export const OPCIONES_ESPECIAL: readonly OpcionEspecial[] = [
  ...(Object.entries(ICONOS_ELEMENTO) as [ElementoArma, string][]).map(([clave, icono]) =>
    ({ clave, icono, claveNombre: `weaponPicker.elements.${clave}` })),
  ...(Object.entries(ICONOS_ESTADO) as [EstadoArma, string][]).map(([clave, icono]) =>
    ({ clave, icono, claveNombre: `weaponPicker.statuses.${clave}` })),
  { clave: 'none', icono: '⚔️', claveNombre: 'weaponPicker.filters.noElement' }
];

// Criterios de "Ordenar por". "default" respeta el orden de la API (el del juego,
// agrupado por árbol de mejora); el resto admiten ambos sentidos.
export type CriterioOrden = 'default' | 'rarity' | 'attack' | 'affinity' | 'special';
export const CRITERIOS_ORDEN: readonly CriterioOrden[] = ['default', 'rarity', 'attack', 'affinity', 'special'];

export const RAREZAS: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8];

export interface FiltrosArmas {
  especiales: ClaveEspecial[]; // Vacío = sin filtrar. Varias = armas con CUALQUIERA de ellas
  rarezas: number[];           // Vacío = todas las rarezas
  orden: CriterioOrden;
  descendente: boolean;        // true = de mayor a menor
}

export const FILTROS_VACIOS: FiltrosArmas = { especiales: [], rarezas: [], orden: 'default', descendente: true };
