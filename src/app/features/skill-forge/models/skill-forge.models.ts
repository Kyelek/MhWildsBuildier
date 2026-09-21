// 📊 Habilidad ya acumulada entre todas las piezas equipadas (nivel total + descripción del nivel alcanzado)
export interface HabilidadAcumulada {
  skillId: number;
  nombre: string;
  kind: string;
  nivel: number;
  descripcion: string;
}

// 🎖️ Bonificación de conjunto actualmente activada (puede haber varias a la vez, una por cada
// conjunto del que se tengan 2 o más piezas equipadas simultáneamente)
export interface BonificacionSetActiva {
  setId: number;
  nombreSet: string;
  piezasEquipadas: number;
  piezasRequeridas: number;
  nombreHabilidad: string;
  nivel: number;
  descripcion: string;
}

// 🔢 Conteo interno de cuántas piezas seleccionadas pertenecen a un mismo conjunto de armadura
export interface ConteoPorSet {
  nombre: string;
  cantidad: number;
}

// 📖 Entrada unificada para el panel de descripciones detalladas
export interface DescripcionHabilidad {
  clave: string;
  nombre: string;
  nivel: number;
  descripcion: string;
  esBonificacionSet: boolean;
}
