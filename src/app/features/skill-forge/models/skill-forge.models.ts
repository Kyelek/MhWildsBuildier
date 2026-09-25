import { ArmorPiece } from '../../../core/models/wilds.models';

// 🛡️ Pieza equipada que aporta una habilidad, con su icono de ranura (casco, pecho...).
// "nivel" es lo que aporta ESA pieza (solo se muestra como "xN" en Habilidades del Conjunto).
export interface AportePieza {
  ranura: ArmorPiece['kind'];
  nombrePieza: string;
  nivel: number;
  icono: string;
}

// 📊 Habilidad ya acumulada entre todas las piezas equipadas (nivel total + descripción del nivel alcanzado)
export interface HabilidadAcumulada {
  skillId: number;
  nombre: string;
  kind: string;
  nivel: number;
  descripcion: string;
  aportes: AportePieza[];  // Piezas que la aportan, en orden de ranura (casco → piernas)
}

// 🎖️ Bonificación de conjunto actualmente activada (puede haber varias a la vez, una por cada
// conjunto del que se tengan 2 o más piezas equipadas simultáneamente). También se usa para
// las bonificaciones de grupo tratadas como excepción (p. ej. "Alma del amo").
export interface BonificacionSetActiva {
  clave: string;           // Identificador único para la plantilla: "set-<id>" o "grupo-<skillId>"
  esGrupo: boolean;        // true en las bonificaciones de grupo ("Alma del amo")
  nombreSet: string;       // Conjunto de origen (en las de grupo, la propia habilidad de grupo)
  piezasEquipadas: number;
  piezasMaximas: number;   // Piezas que pide el rango MÁS ALTO de la bonificación (p. ej. 4)
  nombreHabilidad: string; // Conjuntos: nivel activado ("Eclipse negro I"). Grupo: "Alma del amo"
  nivel: number;
  // null en las de grupo: su efecto se describe aparte, en "Descripciones Detalladas"
  descripcion: string | null;
  // Habilidad que otorga una bonificación de grupo (p. ej. "Agallas (tenacidad)"); null en conjuntos
  efectoOtorgado: DescripcionHabilidad | null;
  aportes: AportePieza[];  // Piezas equipadas que cuentan para la bonificación
}

// 🔢 Conteo interno de cuántas piezas seleccionadas pertenecen a un mismo conjunto de armadura
export interface ConteoPorSet {
  nombre: string;
  cantidad: number;
}

// 📖 Entrada de la pestaña "Descripciones Detalladas" (habilidades aportadas por las piezas;
// las bonificaciones de conjunto se describen en su propia pestaña con BonificacionSetActiva)
export interface DescripcionHabilidad {
  clave: string;
  nombre: string;
  nivel: number;
  descripcion: string;
  aportes: AportePieza[];  // Piezas que aportan la habilidad
}
