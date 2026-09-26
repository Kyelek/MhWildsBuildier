import { MonsterDetalle, MonsterPart, RewardCondition } from '../../core/models/monster.models';
import {
  calcularDebilidades,
  calcularPartes,
  calcularZonas,
  estadosQueAplica,
  idsMateriales,
  imagenMonstruo,
  recompensasPorRango
} from './bestiario.datos';

const MULTIPLICADORES = { slash: 0.5, blunt: 0.5, pierce: 0.5, fire: 0, water: 0, thunder: 0, ice: 0, dragon: 0.2, stun: 0 };

function parte(kind: string, id: number): MonsterPart {
  return { id, kind, multipliers: MULTIPLICADORES, kinsectEssence: 'red' };
}

function condicion(kind: string, rank: 'low' | 'high', part: string | null = null): RewardCondition {
  return { id: 0, kind, rank, quantity: 1, chance: 50, part };
}

// Rathalos simplificado: alas rompibles, cola cortable y dos "hide" repetidas
function crearMonstruo(parcial: Partial<MonsterDetalle> = {}): MonsterDetalle {
  return {
    id: 29,
    name: 'Rathalos',
    kind: 'large',
    species: 'flying-wyvern',
    description: '',
    features: '',
    tips: '',
    ailments: [],
    locations: [],
    variants: [],
    weaknesses: [
      { id: 1, kind: 'element', element: 'dragon', level: 3, condition: null },
      { id: 2, kind: 'effect', effect: 'noise', level: 1, condition: 'Solo al enterrarse.' },
      { id: 3, kind: 'effect', effect: 'noise', level: 2, condition: null }
    ],
    resistances: [{ id: 4, kind: 'element', element: 'fire', condition: null }],
    parts: [parte('head', 1), parte('left-wing', 2), parte('tail', 3), parte('hide', 4), parte('hide', 5)],
    rewards: [
      { id: 10, item: { id: 100, name: 'Escama', rarity: 4 }, conditions: [condicion('carve', 'low'), condicion('carve', 'high')] },
      { id: 11, item: { id: 101, name: 'Ala', rarity: 6 }, conditions: [condicion('broken-part', 'high', 'left-wing')] },
      { id: 12, item: { id: 102, name: 'Cola', rarity: 6 }, conditions: [condicion('carve-severed', 'high')] }
    ],
    ...parcial
  };
}

describe('bestiario.datos', () => {
  it('marca como rompibles las partes con recompensa "broken-part" y la cola como cortable', () => {
    const partes = calcularPartes(crearMonstruo());
    const porParte = new Map(partes.map(p => [p.parte, p]));

    expect(porParte.get('left-wing')).toEqual(jasmine.objectContaining({ rompible: true, cortable: false }));
    expect(porParte.get('tail')).toEqual(jasmine.objectContaining({ rompible: false, cortable: true }));
    expect(porParte.get('head')).toEqual(jasmine.objectContaining({ rompible: false, cortable: false }));
    // Las partes repetidas salen una sola vez y las rompibles/cortables van primero
    expect(partes.filter(p => p.parte === 'hide').length).toBe(1);
    expect(partes.slice(0, 2).map(p => p.parte).sort()).toEqual(['left-wing', 'tail']);
  });

  it('asigna el corte a los tentáculos cuando el monstruo no tiene cola', () => {
    const partes = calcularPartes(crearMonstruo({ parts: [parte('head', 1), parte('tentacle', 2)] }));
    expect(partes.find(p => p.parte === 'tentacle')?.cortable).toBeTrue();
  });

  it('no marca nada como cortable si no hay recompensas de corte', () => {
    const partes = calcularPartes(crearMonstruo({ rewards: [] }));
    expect(partes.some(p => p.cortable || p.rompible)).toBeFalse();
  });

  it('muestra todas las debilidades en estrellas (1 de base), resistencias y condiciones', () => {
    const filas = calcularDebilidades(crearMonstruo());
    const dragon = filas.find(f => f.clave === 'dragon');
    const fuego = filas.find(f => f.clave === 'fire');
    const agua = filas.find(f => f.clave === 'water');
    const sonido = filas.find(f => f.clave === 'noise');

    expect(filas.length).toBe(13); // 5 elementos + 4 estados + 4 efectos
    expect(dragon).toEqual(jasmine.objectContaining({ estrellas: 4, resiste: false }));
    expect(fuego).toEqual(jasmine.objectContaining({ estrellas: 1, resiste: true }));
    expect(agua).toEqual(jasmine.objectContaining({ estrellas: 1, resiste: false }));
    expect(sonido?.estrellas).toBe(3);
    expect(sonido?.condiciones).toEqual(['Solo al enterrarse.']);
  });

  it('numera las zonas de daño repetidas y pasa los multiplicadores a %', () => {
    const zonas = calcularZonas(crearMonstruo());
    expect(zonas.filter(z => z.parte === 'hide').map(z => z.indice)).toEqual([1, 2]);
    expect(zonas.find(z => z.parte === 'head')?.indice).toBe(0);
    expect(zonas[0].valores.slash).toBe(50);
  });

  it('junta en una sola forma las condiciones repetidas, con el rango de probabilidades', () => {
    const conRepetidas = crearMonstruo({
      rewards: [{
        id: 1,
        item: { id: 100, name: 'Médula', rarity: 6 },
        conditions: [
          { ...condicion('target-reward', 'high'), chance: 8 },
          { ...condicion('target-reward', 'high'), chance: 21 },
          { ...condicion('carve', 'high'), chance: 11 }
        ]
      }]
    });
    const formas = recompensasPorRango(conRepetidas, 'high')[0].formas;
    expect(formas.length).toBe(2);
    expect(formas[0]).toEqual(jasmine.objectContaining({ tipo: 'target-reward', probabilidadMin: 8, probabilidadMax: 21 }));
  });

  it('no muestra las formas de obtener de zonas podridas', () => {
    const conPodridas = crearMonstruo({
      rewards: [{
        id: 1,
        item: { id: 100, name: 'Escama', rarity: 6 },
        conditions: [condicion('carve', 'high'), condicion('carve-rotten', 'high'), condicion('carve-rotten-severed', 'high')]
      }, {
        id: 2,
        item: { id: 101, name: 'Solo podrida', rarity: 6 },
        conditions: [condicion('carve-rotten', 'high')]
      }]
    });
    const filas = recompensasPorRango(conPodridas, 'high');
    expect(filas.map(f => f.nombre)).toEqual(['Escama']);
    expect(filas[0].formas.map(f => f.tipo)).toEqual(['carve']);
  });

  it('filtra las recompensas por rango', () => {
    expect(recompensasPorRango(crearMonstruo(), 'low').map(r => r.nombre)).toEqual(['Escama']);
    expect(recompensasPorRango(crearMonstruo(), 'high').map(r => r.nombre)).toEqual(['Escama', 'Ala', 'Cola']);
  });

  it('devuelve los ids de materiales sin repetir, la imagen y los estados que aplica', () => {
    expect(idsMateriales(crearMonstruo())).toEqual([100, 101, 102]);
    expect(imagenMonstruo(29)).toBe('images/monsters/rathalos.png');
    expect(imagenMonstruo(999)).toBeNull();
    expect(estadosQueAplica(32)).toEqual(['bleeding']);
    expect(estadosQueAplica(999)).toEqual([]);
  });
});
