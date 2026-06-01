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