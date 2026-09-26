import { ElementoArma, EstadoArma } from './wilds.models';

// ==========================================
// 🐉 MODELOS DE LA API DE MONSTRUOS (https://wilds.mhdb.io/{locale}/monsters)
//
// Reflejan el JSON tal cual lo devuelve la API (por eso los campos van en inglés, igual
// que en wilds.models.ts). Solo se tipan los campos que usa el Bestiario.
// ==========================================

// Resumen de un monstruo para la lista del Bestiario (pedido con la proyección "p")
export interface MonsterResumen {
  id: number;
  name: string;
  species: string;
}

// Efectos que no son elemento ni estado (bombas luminosas/sónicas, aturdir, agotar)
export type EfectoMonstruo = 'stun' | 'exhaust' | 'flash' | 'noise';

// Debilidad a un elemento, estado o efecto. "level" = 1-3 (estrellas del juego) y
// "condition" = nota opcional (p. ej. "Más efectivo una vez destrozado el manto.")
export interface MonsterWeakness {
  id: number;
  kind: 'element' | 'status' | 'effect';
  element?: ElementoArma;
  status?: EstadoArma;
  effect?: EfectoMonstruo;
  level: number;
  condition: string | null;
}

// Elemento, estado o efecto que el monstruo resiste (mismo formato sin "level")
export interface MonsterResistance {
  id: number;
  kind: 'element' | 'status' | 'effect';
  element?: ElementoArma;
  status?: EstadoArma;
  effect?: EfectoMonstruo;
  condition: string | null;
}

export interface MonsterLocation {
  id: number;
  name: string;
  zoneCount: number;
}

// Variantes del monstruo: curtido, archicurtido, frenético, alfa...
export interface MonsterVariant {
  id: number;
  name: string;
  kind: string;
}

// Multiplicadores de daño de una parte (0 - 1): cuánto daño recibe según el tipo de ataque
export interface MultiplicadoresParte {
  slash: number;
  blunt: number;
  pierce: number;
  fire: number;
  water: number;
  thunder: number;
  ice: number;
  dragon: number;
  stun: number;
}

// Parte del cuerpo. "kind" viene en inglés en todos los idiomas (p. ej. "left-wing"),
// así que se traduce en la app con "bestiary.parts.<kind>".
export interface MonsterPart {
  id: number;
  kind: string;
  multipliers: MultiplicadoresParte;
  kinsectEssence: 'red' | 'white' | 'green' | 'orange' | null;
}

export type RangoRecompensa = 'low' | 'high';

// Forma de conseguir un objeto: tallar, recompensa de misión, romper una parte...
// "part" solo viene en las de tipo "broken-part" (la parte que hay que romper).
export interface RewardCondition {
  id: number;
  kind: string;
  rank: RangoRecompensa;
  quantity: number;
  chance: number;
  part: string | null;
}

export interface RewardItem {
  id: number;
  name: string;
  rarity: number;
}

export interface MonsterReward {
  id: number;
  item: RewardItem;
  conditions: RewardCondition[];
}

// Ficha completa de un monstruo (/monsters/{id})
export interface MonsterDetalle {
  id: number;
  name: string;
  kind: string;
  species: string;
  description: string;
  features: string;
  tips: string;
  ailments: unknown[]; // ⚠️ La API lo devuelve siempre vacío: ver ESTADOS_QUE_APLICA
  locations: MonsterLocation[];
  weaknesses: MonsterWeakness[];
  resistances: MonsterResistance[];
  variants: MonsterVariant[];
  parts: MonsterPart[];
  rewards: MonsterReward[];
}

// ⚔️🛡️ Equipo relacionado con un monstruo (pantalla IV). Solo descriptivo: se piden
// únicamente los campos que se muestran, con la proyección "p" de la API.
export interface ArmaRelacionada {
  id: number;
  name: string;
  kind: string;
  rarity: number;
}

export interface ArmaduraRelacionada {
  id: number;
  name: string;
  kind: 'head' | 'chest' | 'arms' | 'waist' | 'legs';
  rarity: number;
  armorSet: { id: number; name: string };
}
