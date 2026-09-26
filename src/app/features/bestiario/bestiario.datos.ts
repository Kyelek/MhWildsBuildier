import { ElementoArma, EstadoArma } from '../../core/models/wilds.models';
import {
  EfectoMonstruo,
  MonsterDetalle,
  MultiplicadoresParte,
  RangoRecompensa
} from '../../core/models/monster.models';
import { ICONOS_ELEMENTO, ICONOS_ESTADO } from '../../shared/models/tipos-arma.models';

// ==========================================
// 📖 DATOS Y CÁLCULOS DEL BESTIARIO DE BOLSILLO
//
// Funciones puras (sin Angular) que preparan la ficha de un monstruo de la API para
// mostrarla en cada pantalla de la tarjeta. Así se pueden probar sin montar componentes.
// ==========================================

// 🖼️ Imagen de cada monstruo en public/images/monsters. Se indexa por id (estable entre
// idiomas) porque el nombre cambia según el idioma: "Rathalos Guardián" / "Guardian Rathalos".
const IMAGENES_MONSTRUO: Record<number, string> = {
  1: 'zoh-shia',
  2: 'guardian-doshaguma',
  3: 'rey-dau',
  4: 'lala-barina',
  5: 'congalala',
  6: 'nerscylla',
  7: 'gore-magala',
  8: 'gravios',
  9: 'guardian-arkveld',
  10: 'quematrice',
  11: 'doshaguma',
  12: 'balahara',
  13: 'rathian',
  14: 'chatacabra',
  15: 'mizutsune',
  16: 'guardian-fulgur-anjanath',
  17: 'hirabami',
  18: 'yian-kut-ku',
  19: 'rompopolo',
  20: 'arkveld',
  21: 'ajarakan',
  22: 'gypceros',
  23: 'xu-wu',
  24: 'guardian-rathalos',
  25: 'uth-duna',
  26: 'jin-dahaad',
  27: 'nu-udra',
  28: 'guardian-ebony-odogaron',
  29: 'rathalos',
  30: 'blangonga',
  31: 'lagiacrus',
  32: 'seregios',
  33: 'omega-planetes',
  34: 'gogmazios'
};

// Si la API añade un monstruo nuevo sin imagen todavía, la tarjeta oculta la foto
export function imagenMonstruo(id: number): string | null {
  const nombre = IMAGENES_MONSTRUO[id];
  return nombre ? `images/monsters/${nombre}.png` : null;
}

// ==========================================
// ☠️ ESTADOS / PLAGAS QUE APLICA CADA MONSTRUO
//
// ⚠️ El campo "ailments" de la API viene VACÍO en todos los monstruos (comprobado en los
// 34, incluido Seregios), así que esta tabla se mantiene a mano con lo que aplican en el
// juego. Un monstruo sin entrada (o con la lista vacía) muestra "No aplica".
// Los iconos son emojis, salvo los que no existen como emoji (p. ej. la red de
// "Enmarañado"), que son una imagen de public/images/estados (ver esIconoImagen).
// ==========================================
export type EstadoQueAplica =
  | 'fireblight' | 'waterblight' | 'thunderblight' | 'iceblight' | 'dragonblight'
  | 'poison' | 'paralysis' | 'sleep' | 'blastblight' | 'bleeding'
  | 'bubbleblight' | 'entangled' | 'frenzy' | 'stun';

export const ICONOS_ESTADO_APLICADO: Record<EstadoQueAplica, string> = {
  fireblight: ICONOS_ELEMENTO.fire,
  waterblight: ICONOS_ELEMENTO.water,
  thunderblight: ICONOS_ELEMENTO.thunder,
  iceblight: ICONOS_ELEMENTO.ice,
  dragonblight: ICONOS_ELEMENTO.dragon,
  poison: ICONOS_ESTADO.poison,
  paralysis: ICONOS_ESTADO.paralysis,
  sleep: ICONOS_ESTADO.sleep,
  blastblight: ICONOS_ESTADO.blastblight,
  bleeding: '🩸',
  bubbleblight: '🫧',
  entangled: 'images/estados/enmaranado.svg',
  frenzy: '🦠',
  stun: '😵'
};

export const ESTADOS_QUE_APLICA: Record<number, EstadoQueAplica[]> = {
  1: ['dragonblight'],                  // Zoh Shia
  2: [],                                // Doshaguma Guardián
  3: ['thunderblight'],                 // Rey Dau
  4: ['paralysis'],                     // Lala Barina
  5: ['poison', 'fireblight'],          // Congalala
  6: ['poison', 'sleep', 'entangled'],  // Nerscylla
  7: ['frenzy'],                        // Gore Magala
  8: ['fireblight', 'sleep'],           // Gravios
  9: ['dragonblight'],                  // Arkveld Guardián
  10: ['fireblight'],                   // Quematrice
  11: [],                               // Doshaguma
  12: [],                               // Balahara
  13: ['fireblight', 'poison'],         // Rathian
  14: [],                               // Chatacabra
  15: ['bubbleblight'],                 // Mizutsune
  16: ['thunderblight'],                // Anjanath Fulgúreo Guardián
  17: ['iceblight', 'entangled'],       // Hirabami
  18: ['fireblight'],                   // Yian Kut-Ku
  19: ['poison'],                       // Rompopolo
  20: ['dragonblight'],                 // Arkveld
  21: ['fireblight', 'blastblight'],    // Ajarakan
  22: ['poison', 'stun'],               // Gypceros
  23: [],                               // Xu Wu
  24: ['fireblight', 'poison'],         // Rathalos Guardián
  25: ['waterblight'],                  // Uth Duna
  26: ['iceblight'],                    // Jin Dahaad
  27: ['fireblight'],                   // Nu Udra
  28: ['bleeding', 'dragonblight'],     // Odogaron Ébano Guardián
  29: ['fireblight', 'poison'],         // Rathalos
  30: ['iceblight'],                    // Blangonga
  31: ['thunderblight'],                // Lagiacrus
  32: ['bleeding'],                     // Seregios
  33: ['fireblight'],                   // Omega Planetes
  34: ['fireblight']                    // Gogmazios
};

// ¿El icono es una ruta de imagen en vez de un emoji?
export function esIconoImagen(icono: string): boolean {
  return icono.startsWith('images/');
}

export function estadosQueAplica(id: number): EstadoQueAplica[] {
  return ESTADOS_QUE_APLICA[id] ?? [];
}

// ==========================================
// 🎯 PANTALLA 2: DEBILIDADES Y RESISTENCIAS
// ==========================================
export const ICONOS_EFECTO: Record<EfectoMonstruo, string> = {
  stun: '😵',
  exhaust: '💨',
  flash: '✨',
  noise: '🔊'
};

type TipoDebilidad = 'element' | 'status' | 'effect';
type ClaveDebilidad = ElementoArma | EstadoArma | EfectoMonstruo;

export interface FilaDebilidad {
  tipo: TipoDebilidad;
  clave: ClaveDebilidad;
  icono: string;
  claveNombre: string;       // Clave de traducción del nombre
  estrellas: number;         // 1 = sin debilidad (base); cada nivel de la API suma una más
  resiste: boolean;
  condiciones: string[];     // Notas de la API (p. ej. "Solo al enterrarse")
}

// Todas las filas de la tabla, en el orden del juego: elementos, estados y efectos
const FILAS_BASE: readonly Pick<FilaDebilidad, 'tipo' | 'clave' | 'icono' | 'claveNombre'>[] = [
  ...(Object.entries(ICONOS_ELEMENTO) as [ElementoArma, string][]).map(([clave, icono]) =>
    ({ tipo: 'element' as const, clave, icono, claveNombre: `weaponPicker.elements.${clave}` })),
  ...(Object.entries(ICONOS_ESTADO) as [EstadoArma, string][]).map(([clave, icono]) =>
    ({ tipo: 'status' as const, clave, icono, claveNombre: `weaponPicker.statuses.${clave}` })),
  ...(Object.entries(ICONOS_EFECTO) as [EfectoMonstruo, string][]).map(([clave, icono]) =>
    ({ tipo: 'effect' as const, clave, icono, claveNombre: `bestiary.effects.${clave}` }))
];

function claveDe(entrada: { element?: string; status?: string; effect?: string }): string | undefined {
  return entrada.element ?? entrada.status ?? entrada.effect;
}

// Una fila por cada elemento/estado/efecto. La eficacia va en estrellas con 1 como base
// (sin debilidad) y una más por cada nivel de debilidad de la API (1-3 → 2-4 estrellas).
// Si la API trae varias entradas para el mismo
// (p. ej. dos debilidades al sonido con condiciones distintas), se queda el nivel más alto
// y se juntan todas las condiciones.
export function calcularDebilidades(monstruo: MonsterDetalle): FilaDebilidad[] {
  return FILAS_BASE.map(base => {
    const debilidades = monstruo.weaknesses.filter(d => d.kind === base.tipo && claveDe(d) === base.clave);
    const resistencias = monstruo.resistances.filter(r => r.kind === base.tipo && claveDe(r) === base.clave);
    const condiciones = [...debilidades, ...resistencias]
      .map(entrada => entrada.condition)
      .filter((condicion): condicion is string => !!condicion);

    return {
      ...base,
      estrellas: 1 + Math.max(0, ...debilidades.map(d => d.level)),
      resiste: resistencias.length > 0,
      condiciones: [...new Set(condiciones)]
    };
  });
}

// Columnas de la tabla de zonas de daño (multiplicadores de cada parte)
export const COLUMNAS_ZONAS: readonly { clave: keyof MultiplicadoresParte; icono: string; claveNombre: string }[] = [
  { clave: 'slash', icono: '🗡️', claveNombre: 'bestiary.hitzones.slash' },
  { clave: 'blunt', icono: '🔨', claveNombre: 'bestiary.hitzones.blunt' },
  { clave: 'pierce', icono: '🏹', claveNombre: 'bestiary.hitzones.pierce' },
  ...(Object.entries(ICONOS_ELEMENTO) as [ElementoArma, string][]).map(([clave, icono]) =>
    ({ clave, icono, claveNombre: `weaponPicker.elements.${clave}` })),
  { clave: 'stun', icono: ICONOS_EFECTO.stun, claveNombre: 'bestiary.effects.stun' }
];

export interface FilaZona {
  parte: string;       // "kind" de la API, se traduce con "bestiary.parts.<parte>"
  indice: number;      // 0 si la parte es única; 1, 2, 3... si el monstruo tiene varias iguales
  valores: Record<keyof MultiplicadoresParte, number>; // En % (0 - 100)
}

// Algunas partes se repiten con distinto multiplicador (p. ej. las 8 "hide" de Lagiacrus,
// que son zonas distintas del cuerpo): se numeran para distinguirlas.
export function calcularZonas(monstruo: MonsterDetalle): FilaZona[] {
  const totales = contarPorParte(monstruo);
  const vistas = new Map<string, number>();

  return monstruo.parts.map(parte => {
    const n = (vistas.get(parte.kind) ?? 0) + 1;
    vistas.set(parte.kind, n);
    const valores = Object.fromEntries(
      Object.entries(parte.multipliers).map(([clave, valor]) => [clave, Math.round(valor * 100)])
    ) as Record<keyof MultiplicadoresParte, number>;
    return { parte: parte.kind, indice: (totales.get(parte.kind) ?? 0) > 1 ? n : 0, valores };
  });
}

function contarPorParte(monstruo: MonsterDetalle): Map<string, number> {
  const totales = new Map<string, number>();
  for (const parte of monstruo.parts) {
    totales.set(parte.kind, (totales.get(parte.kind) ?? 0) + 1);
  }
  return totales;
}

// 🏷️ Nombres de parte propios de un monstruo concreto: la clave de traducción que se usa en
// vez de la genérica "bestiary.parts.<parte>". Gogmazios tiene pecho ("chest"), vientre
// ("stomach") y lomo ("back"): se muestran como Pecho, Lomo y Espalda para no repetir nombres.
const NOMBRES_PARTE_MONSTRUO: Record<number, Record<string, string>> = {
  34: { stomach: 'back', back: 'upper-back' }
};

export function claveParte(idMonstruo: number, parte: string): string {
  return `bestiary.parts.${NOMBRES_PARTE_MONSTRUO[idMonstruo]?.[parte] ?? parte}`;
}

// ==========================================
// 🦴 PANTALLA 3: PARTES ROMPIBLES / CORTABLES Y RECOMPENSAS
//
// La API no marca qué partes se rompen o se cortan, así que se deduce de las recompensas:
//  - Rompible: tiene una recompensa "broken-part" que indica esa parte.
//  - Cortable: el monstruo tiene recompensas por tallar la parte cortada
//    ("carve-severed" / "carve-rotten-severed"), que no dicen qué parte es. Se asigna a la
//    cola, o a los tentáculos si no tiene cola (Xu Wu, Nu Udra).
// ==========================================
const TIPOS_CORTE = ['carve-severed', 'carve-rotten-severed'];

export interface FilaParte {
  parte: string;
  rompible: boolean;
  cortable: boolean;
  esencia: 'red' | 'white' | 'green' | 'orange' | null; // Esencia de kinsecto
}

export function calcularPartes(monstruo: MonsterDetalle): FilaParte[] {
  const condiciones = monstruo.rewards.flatMap(recompensa => recompensa.conditions);
  const rompibles = new Set(
    condiciones.filter(c => c.kind === 'broken-part' && c.part).map(c => c.part as string)
  );
  const tieneCorte = condiciones.some(c => TIPOS_CORTE.includes(c.kind));
  const kinds = new Set(monstruo.parts.map(parte => parte.kind));
  const parteCortable = !tieneCorte ? null : kinds.has('tail') ? 'tail' : kinds.has('tentacle') ? 'tentacle' : null;

  // Una fila por tipo de parte (sin repetir las "hide" duplicadas)
  const filas = new Map<string, FilaParte>();
  for (const parte of monstruo.parts) {
    if (filas.has(parte.kind)) continue;
    filas.set(parte.kind, {
      parte: parte.kind,
      rompible: rompibles.has(parte.kind),
      cortable: parte.kind === parteCortable,
      esencia: parte.kinsectEssence
    });
  }
  // Partes rompibles que la API cita en recompensas pero no en "parts"
  for (const parte of rompibles) {
    if (!filas.has(parte)) {
      filas.set(parte, { parte, rompible: true, cortable: false, esencia: null });
    }
  }

  // Primero las que se pueden romper o cortar
  const peso = (fila: FilaParte) => (fila.rompible || fila.cortable ? 0 : 1);
  return [...filas.values()].sort((a, b) => peso(a) - peso(b));
}

export interface FormaObtener {
  tipo: string;          // "kind" de la condición, traducido con "bestiary.rewardKinds.<tipo>"
  parte: string | null;  // Parte a romper (solo en "broken-part")
  cantidad: number;
  probabilidadMin: number;
  probabilidadMax: number;
}

export interface FilaRecompensa {
  id: number;
  nombre: string;
  rareza: number;
  formas: FormaObtener[];
}

// Formas de obtener que no se muestran en la lista de materiales (desollar zonas podridas)
const TIPOS_OCULTOS = ['carve-rotten', 'carve-rotten-severed'];

// Objetos que se consiguen del monstruo en el rango indicado, con cada forma de obtenerlos.
// La API repite a veces la misma forma con distinta probabilidad y nada más que las
// distinga (p. ej. tres "target-reward" al 8, 10 y 21 %, que corresponden a misiones de
// distinta dificultad): se juntan en una sola línea con el rango de probabilidades.
export function recompensasPorRango(monstruo: MonsterDetalle, rango: RangoRecompensa): FilaRecompensa[] {
  return monstruo.rewards
    .map(recompensa => {
      const formas = new Map<string, FormaObtener>();
      const condiciones = recompensa.conditions.filter(
        condicion => condicion.rank === rango && !TIPOS_OCULTOS.includes(condicion.kind)
      );
      for (const c of condiciones) {
        const clave = `${c.kind}|${c.part}|${c.quantity}`;
        const forma = formas.get(clave);
        if (forma) {
          forma.probabilidadMin = Math.min(forma.probabilidadMin, c.chance);
          forma.probabilidadMax = Math.max(forma.probabilidadMax, c.chance);
        } else {
          formas.set(clave, { tipo: c.kind, parte: c.part, cantidad: c.quantity, probabilidadMin: c.chance, probabilidadMax: c.chance });
        }
      }
      return {
        id: recompensa.item.id,
        nombre: recompensa.item.name,
        rareza: recompensa.item.rarity,
        formas: [...formas.values()]
      };
    })
    .filter(fila => fila.formas.length > 0);
}

// ==========================================
// ⚔️🛡️ PANTALLA 5: EQUIPO RELACIONADO
// ==========================================

// Ids de todos los objetos que suelta el monstruo (en cualquier rango): el equipo que use
// alguno de ellos en su fabricación o mejora se considera relacionado con el monstruo.
export function idsMateriales(monstruo: MonsterDetalle): number[] {
  return [...new Set(monstruo.rewards.map(recompensa => recompensa.item.id))];
}

// Agrupa una lista por una clave conservando el orden de aparición
export function agrupar<T>(elementos: readonly T[], clave: (elemento: T) => string): { clave: string; elementos: T[] }[] {
  const grupos = new Map<string, T[]>();
  for (const elemento of elementos) {
    const k = clave(elemento);
    const grupo = grupos.get(k);
    if (grupo) {
      grupo.push(elemento);
    } else {
      grupos.set(k, [elemento]);
    }
  }
  return [...grupos.entries()].map(([k, lista]) => ({ clave: k, elementos: lista }));
}
