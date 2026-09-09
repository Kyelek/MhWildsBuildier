export interface SkillInfo {
  id: number;
  gameId: number;
  name: string;
  kind: string;
}

export interface ArmorSkill {
  id: number;
  level: number;
  description: string;
  skill: SkillInfo;
  setPiecesRequired: number | null;
}

// 🎯 Representa un nivel concreto (rango) de una habilidad, con su descripción específica.
// Se usa tanto en el catálogo de /skills como en las bonificaciones de conjunto de /armor/sets.
export interface SkillRank {
  id: number;
  level: number;
  name: string | null;
  description: string;
  setPiecesRequired: number | null;
  skill: { id: number };
}

// 📖 Ficha completa de una habilidad (catálogo de /skills), con la descripción de cada nivel.
export interface SkillDetail extends SkillInfo {
  description: string;
  ranks: SkillRank[];
}

// 🎖️ Bonificación de conjunto: la habilidad especial que se activa al equipar
// un número mínimo de piezas del mismo conjunto (armorSet).
export interface ArmorSetBonus {
  id: number;
  skill: {
    id: number;
    name: string;
  };
  ranks: {
    id: number;
    pieces: number; // Nº de piezas del conjunto necesarias para activar este rango
    bonus: { id: number };
    skill: SkillRank;
  }[];
}

export interface ArmorSet {
  id: number;
  gameId: number;
  name: string;
  pieces: ArmorPiece[];
  bonus: ArmorSetBonus | null; // Bonificación propia del conjunto (2/4 piezas)
  groupBonus: ArmorSetBonus | null; // Bonificación de grupo/serie (piezas de distintos conjuntos)
}

export interface ArmorPiece {
  id: number;
  name: string;
  description: string;
  kind: 'head' | 'chest' | 'arms' | 'waist' | 'legs'; // Mapeado al campo 'kind' de la API
  rank: string;
  rarity: number;
  resistances: {
    fire: number;
    water: number;
    ice: number;
    thunder: number;
    dragon: number;
  };
  defense: {
    base: number;
    max: number;
  };
  skills: ArmorSkill[];
  slots: number[];
  armorSet: {
    id: number;
    name: string;
  };
}
export interface Weapon {
  id: number;
  name: string;
  kind: string;       // 🌟 Cambiado de 'type' a 'kind' (ej: "bow")
  rarity: number;
  affinity: number;   // Este viene como 0 directamente, está bien
  damage: {           // 🌟 Cambiado de 'attack' a objeto 'damage'
    raw: number;
    display: number;
  };
  slots: any[];
}