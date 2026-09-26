import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WritableSignal, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';

import { DialogoArmadurasComponent } from './dialogo-armaduras.component';
import { ArmorPiece, ArmorSkill } from '../../../../core/models/wilds.models';
import {
  DatosDialogoArmaduras,
  FILTROS_ARMADURA_VACIOS,
  FiltrosArmadura
} from '../../../models/filtros-armadura.models';
import { ApiLocale, WildsApiService } from '../../../../core/services/wilds-api.service';

function habilidad(id: number, name: string, level = 1, kind = 'armor'): ArmorSkill {
  return { id: id * 10 + level, level, description: '', setPiecesRequired: null, skill: { id, gameId: id, name, kind } };
}

function pieza(id: number, name: string, overrides: Partial<ArmorPiece> = {}): ArmorPiece {
  return {
    id,
    name,
    description: '',
    kind: 'head',
    rank: 'high',
    rarity: 5,
    resistances: { fire: 0, water: 0, ice: 0, thunder: 0, dragon: 0 },
    defense: { base: 40, max: 70 },
    skills: [],
    slots: [],
    armorSet: { id, name },
    ...overrides
  };
}

const PUNTO_DEBIL = 1;
const AGUANTE = 2;
// Habilidades de set: la API marca unas como "set" y otras como "group"
const FULGOR = 50;     // kind "set"
const ALMA_AMO = 131;  // kind "group"

const CATALOGO: ArmorPiece[] = [
  pieza(1, 'Yelmo Rathalos', {
    rarity: 6, defense: { base: 50, max: 80 }, slots: [2, 1],
    skills: [habilidad(PUNTO_DEBIL, 'Punto débil'), habilidad(FULGOR, 'Fulgor de Rathalos', 1, 'set')]
  }),
  pieza(2, 'Casco Ámbar', {
    rank: 'low', rarity: 2, defense: { base: 20, max: 30 }, slots: [1],
    resistances: { fire: 3, water: 0, ice: 0, thunder: 0, dragon: 0 },
    skills: [habilidad(AGUANTE, 'Aguante', 2)]
  }),
  pieza(3, 'Yelmo Arkveld', {
    rarity: 8, defense: { base: 60, max: 90 }, slots: [3],
    skills: [habilidad(PUNTO_DEBIL, 'Punto débil', 2), habilidad(AGUANTE, 'Aguante'), habilidad(ALMA_AMO, 'Alma del amo', 1, 'group')]
  }),
  // Otra ranura: nunca sale en la lista de cascos
  pieza(4, 'Cota Rathalos', { kind: 'chest', skills: [habilidad(PUNTO_DEBIL, 'Punto débil', 3)] })
];

describe('DialogoArmadurasComponent', () => {
  let fixture: ComponentFixture<DialogoArmadurasComponent>;
  let component: DialogoArmadurasComponent;
  let dialogRef: jasmine.SpyObj<MatDialogRef<DialogoArmadurasComponent, ArmorPiece>>;
  let filtros: WritableSignal<FiltrosArmadura>;

  async function crear(seleccionada: ArmorPiece | null = null, filtrosIniciales = FILTROS_ARMADURA_VACIOS): Promise<void> {
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close', 'afterOpened']);
    dialogRef.afterOpened.and.returnValue(of(undefined));
    filtros = signal(filtrosIniciales);
    const datos: DatosDialogoArmaduras = { ranura: 'head', seleccionada, filtros };
    const wildsApi = { locale: signal<ApiLocale>('es'), getArmor: () => of(CATALOGO) };

    TestBed.configureTestingModule({
      imports: [DialogoArmadurasComponent],
      providers: [
        provideTranslateService(),
        { provide: MAT_DIALOG_DATA, useValue: datos },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: WildsApiService, useValue: wildsApi }
      ]
    });

    fixture = TestBed.createComponent(DialogoArmadurasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const nombres = () => component.piezasFiltradas().map(p => p.name);

  it('lista solo las piezas de su ranura, en el orden del juego', async () => {
    await crear();
    expect(nombres()).toEqual(['Yelmo Rathalos', 'Casco Ámbar', 'Yelmo Arkveld']);
    expect(fixture.nativeElement.querySelectorAll('.fila-armadura').length).toEqual(3);
  });

  it('el buscador filtra por nombre sin distinguir mayúsculas ni tildes', async () => {
    await crear();
    component.onBusquedaInput('AMBAR');
    expect(nombres()).toEqual(['Casco Ámbar']);
  });

  it('separa habilidades normales y de set ("set" y "group" juntas), con cuántas piezas las tienen', async () => {
    await crear();
    const opciones = component.opcionesHabilidad();
    expect(opciones.armor).toEqual([
      { id: AGUANTE, nombre: 'Aguante', total: 2 },
      { id: PUNTO_DEBIL, nombre: 'Punto débil', total: 2 } // La cota (otra ranura) no cuenta
    ]);
    expect(opciones.set).toEqual([
      { id: ALMA_AMO, nombre: 'Alma del amo', total: 1 },
      { id: FULGOR, nombre: 'Fulgor de Rathalos', total: 1 }
    ]);
  });

  it('con varias habilidades muestra las piezas con alguna o, si se pide, con todas', async () => {
    await crear();
    component.cambiarHabilidades('armor', [PUNTO_DEBIL, AGUANTE]);
    expect(nombres()).toEqual(jasmine.arrayWithExactContents(['Yelmo Rathalos', 'Casco Ámbar', 'Yelmo Arkveld']));

    component.elegirModoHabilidades('all');
    expect(nombres()).toEqual(['Yelmo Arkveld']);
  });

  it('filtra por habilidades de set, sean "set" o "group" en la API (cualquiera de las marcadas)', async () => {
    await crear();
    component.cambiarHabilidades('set', [FULGOR]);
    expect(nombres()).toEqual(['Yelmo Rathalos']);

    component.cambiarHabilidades('set', [ALMA_AMO]);
    expect(nombres()).toEqual(['Yelmo Arkveld']);

    component.cambiarHabilidades('set', [FULGOR, ALMA_AMO]);
    expect(nombres()).toEqual(jasmine.arrayWithExactContents(['Yelmo Rathalos', 'Yelmo Arkveld']));
  });

  it('una pieza con dos habilidades de set aparece al buscar cualquiera de las dos', async () => {
    await crear();
    const fulgurea = pieza(9, 'Yelmo Fulgúreo G. α', {
      skills: [habilidad(60, 'Afán de Anjanath Fulgúreo', 1, 'set'), habilidad(27, 'Pulso de Guardián', 1, 'group')]
    });
    CATALOGO.push(fulgurea);
    try {
      component.catalogo.set([...CATALOGO]);
      expect(component.opcionesHabilidad().set.map(o => o.nombre))
        .toEqual(jasmine.arrayContaining(['Afán de Anjanath Fulgúreo', 'Pulso de Guardián']));

      component.cambiarHabilidades('set', [27]);
      expect(nombres()).toEqual(['Yelmo Fulgúreo G. α']);
      component.cambiarHabilidades('set', [60]);
      expect(nombres()).toEqual(['Yelmo Fulgúreo G. α']);
    } finally {
      CATALOGO.pop();
    }
  });

  it('al buscar una habilidad ordena por los niveles que aporta cada pieza, y al quitarla vuelve al orden por defecto', async () => {
    await crear();
    component.cambiarHabilidades('armor', [PUNTO_DEBIL]);
    expect(component.filtros().orden).toEqual('match');
    expect(nombres()).toEqual(['Yelmo Arkveld', 'Yelmo Rathalos']); // Nv 2 antes que Nv 1

    component.cambiarHabilidades('armor', []);
    expect(component.filtros().orden).toEqual('default');
  });

  it('no cambia un orden elegido a mano al buscar una habilidad', async () => {
    await crear();
    component.elegirOrden('defense');
    component.cambiarHabilidades('armor', [PUNTO_DEBIL]);
    expect(component.filtros().orden).toEqual('defense');
  });

  it('filtra por hueco mínimo (ese nivel o superior), rango y rareza', async () => {
    await crear();
    component.elegirHuecoMinimo(2);
    expect(nombres()).toEqual(['Yelmo Rathalos', 'Yelmo Arkveld']);
    expect(component.conteoHuecos().get(1)).toEqual(3);
    expect(component.conteoHuecos().get(3)).toEqual(1);

    // Pulsar el mismo nivel lo desmarca
    component.elegirHuecoMinimo(2);
    expect(component.filtros().huecoMinimo).toBeNull();

    component.alternarRango('low');
    expect(nombres()).toEqual(['Casco Ámbar']);

    component.alternarRango('low');
    component.alternarRareza(8);
    expect(nombres()).toEqual(['Yelmo Arkveld']);
  });

  it('ordena por defensa, huecos o resistencia en ambos sentidos', async () => {
    await crear();
    component.elegirOrden('defense');
    expect(nombres()).toEqual(['Yelmo Arkveld', 'Yelmo Rathalos', 'Casco Ámbar']);

    component.alternarSentido();
    expect(nombres()).toEqual(['Casco Ámbar', 'Yelmo Rathalos', 'Yelmo Arkveld']);

    component.elegirOrden('slots'); // Criterio nuevo: vuelve a empezar de mayor a menor
    expect(nombres()).toEqual(['Yelmo Rathalos', 'Yelmo Arkveld', 'Casco Ámbar']);

    component.elegirOrden('fire');
    expect(nombres()[0]).toEqual('Casco Ámbar');
    expect(component.elementoOrden()).toEqual('fire');
  });

  it('escribe los filtros en el signal de quien abre el popup y "Borrar filtros" los quita todos', async () => {
    await crear();
    component.cambiarHabilidades('armor', [PUNTO_DEBIL]);
    component.alternarRareza(6);
    component.elegirHuecoMinimo(1);

    expect(filtros().habilidades).toEqual([PUNTO_DEBIL]);
    // El orden automático por habilidades buscadas no cuenta como filtro
    expect(component.filtrosActivos()).toEqual(3);

    component.borrarFiltros();
    expect(filtros()).toEqual(FILTROS_ARMADURA_VACIOS);
    expect(component.filtrosActivos()).toEqual(0);
  });

  it('abre con los filtros que ya traía (p. ej. puestos en otra ranura)', async () => {
    await crear(null, { ...FILTROS_ARMADURA_VACIOS, habilidades: [AGUANTE] });
    expect(nombres()).toEqual(jasmine.arrayWithExactContents(['Casco Ámbar', 'Yelmo Arkveld']));
  });

  it('resalta en cada fila las habilidades buscadas y marca las de set', async () => {
    await crear();
    component.cambiarHabilidades('armor', [PUNTO_DEBIL]);
    fixture.detectChanges();

    const primera = fixture.nativeElement.querySelector('.fila-armadura');
    expect(primera.querySelector('.fila-habilidad.buscada').textContent).toContain('Punto débil');
    expect(primera.querySelector('.fila-habilidad.bonus').textContent).toContain('Alma del amo');
  });

  it('marca la pieza ya elegida y cierra devolviendo la que se pulse, o nada con la X', async () => {
    await crear(CATALOGO[1]);
    const filas = fixture.nativeElement.querySelectorAll('.fila-armadura');
    expect(filas[1].classList).toContain('seleccionada');

    filas[2].click();
    expect(dialogRef.close).toHaveBeenCalledWith(CATALOGO[2]);

    fixture.nativeElement.querySelector('.btn-cabecera').click();
    expect(dialogRef.close).toHaveBeenCalledWith();
  });
});
