// 🎯 Contrato mínimo que debe cumplir cualquier catálogo (armas, piezas de armadura...)
// consumido por <app-selector-buscable>: necesita al menos un id estable y un "name" para
// poder buscarse/mostrarse. El campo se llama igual que en el JSON de la API (ArmorPiece.name,
// Weapon.name), así que se deja en inglés a propósito en vez de traducirlo a "nombre".
export interface ItemSeleccionable {
  id: number;
  name: string;
}

// Agrupación interna de opciones del selector (p. ej. armas agrupadas por tipo con `agruparPor`).
export interface GrupoDeOpciones<T> {
  etiqueta: string | null;
  elementos: T[];
}
