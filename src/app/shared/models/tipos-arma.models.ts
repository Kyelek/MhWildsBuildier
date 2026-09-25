import { Weapon } from '../../core/models/wilds.models';

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

// Datos que recibe el popup de selección de armas al abrirse
export interface DatosDialogoArmas {
  armas: Weapon[];
  seleccionada: Weapon | null;
}
