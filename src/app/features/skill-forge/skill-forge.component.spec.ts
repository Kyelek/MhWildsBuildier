import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideTranslateService } from '@ngx-translate/core';

import { SkillForgeComponent } from './skill-forge.component';
import { ArmorPiece, ArmorSet, ArmorSkill } from '../../core/models/wilds.models';

function crearPiezaDePrueba(overrides: Partial<ArmorPiece> = {}): ArmorPiece {
  return {
    id: 1,
    name: 'Pieza de prueba',
    description: '',
    kind: 'head',
    rank: 'low',
    rarity: 1,
    resistances: { fire: 0, water: 0, ice: 0, thunder: 0, dragon: 0 },
    defense: { base: 10, max: 20 },
    skills: [],
    slots: [],
    armorSet: { id: 1, name: 'Set de prueba' },
    ...overrides
  };
}

// Habilidad de pieza individual que aporta 1 nivel de la misma skill (id 500)
function habilidadDePrueba(): ArmorSkill {
  return {
    id: 1,
    level: 1,
    description: 'Descripción de respaldo (pieza)',
    skill: { id: 500, gameId: 500, name: 'Aguante', kind: 'armor' },
    setPiecesRequired: null
  };
}

describe('SkillForgeComponent', () => {
  let component: SkillForgeComponent;
  let fixture: ComponentFixture<SkillForgeComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SkillForgeComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTranslateService({ lang: 'en', fallbackLang: 'en' })
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SkillForgeComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  // Responde los 3 catálogos que pide el componente al crearse (rxResource).
  // Por defecto, vacíos; cada test pasa los que necesite.
  function flushCatalogos(armorSets: ArmorSet[] = []): void {
    httpMock.expectOne(req => req.url.endsWith('/armor')).flush([]);
    httpMock.expectOne(req => req.url.endsWith('/armor/sets')).flush(armorSets);
    httpMock.expectOne(req => req.url.endsWith('/skills')).flush([]);
  }

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    flushCatalogos();
    expect(component).toBeTruthy();
  });

  it('sin piezas equipadas, no hay habilidades activas ni bonificaciones de set', () => {
    flushCatalogos();
    expect(component.habilidadesActivas()).toEqual([]);
    expect(component.bonificacionesSet()).toEqual([]);
  });

  it('acumula el nivel de una misma habilidad entre varias piezas equipadas', () => {
    flushCatalogos();

    component.selectedHead.set(crearPiezaDePrueba({ id: 10, kind: 'head', skills: [habilidadDePrueba()] }));
    component.selectedChest.set(crearPiezaDePrueba({ id: 11, kind: 'chest', skills: [habilidadDePrueba()] }));
    fixture.detectChanges();

    expect(component.habilidadesActivas()).toEqual([
      { skillId: 500, nombre: 'Aguante', kind: 'armor', nivel: 2, descripcion: 'Descripción de respaldo (pieza)' }
    ]);
  });

  it('activa dos bonificaciones de set distintas a la vez, cada una con su rango más alto alcanzado', async () => {
    const armorSets: ArmorSet[] = [
      {
        id: 1,
        gameId: 1,
        name: 'Set A',
        pieces: [],
        groupBonus: null,
        bonus: {
          id: 1,
          skill: { id: 900, name: 'Bono Set A' },
          ranks: [
            {
              id: 1,
              pieces: 2,
              bonus: { id: 1 },
              skill: { id: 1, level: 1, name: 'Bono Set A', description: 'Descripción bono A', setPiecesRequired: 2, skill: { id: 900 } }
            }
          ]
        }
      },
      {
        id: 2,
        gameId: 2,
        name: 'Set B',
        pieces: [],
        groupBonus: null,
        bonus: {
          id: 2,
          skill: { id: 901, name: 'Bono Set B' },
          ranks: [
            {
              id: 2,
              pieces: 2,
              bonus: { id: 2 },
              skill: { id: 2, level: 1, name: 'Bono Set B Nv1', description: 'Descripción B nv1', setPiecesRequired: 2, skill: { id: 901 } }
            },
            {
              id: 3,
              pieces: 3,
              bonus: { id: 2 },
              skill: { id: 3, level: 2, name: 'Bono Set B Nv2', description: 'Descripción B nv2', setPiecesRequired: 3, skill: { id: 901 } }
            }
          ]
        }
      }
    ];
    flushCatalogos(armorSets);
    // El flush del HTTP de prueba resuelve la petición, pero rxResource actualiza su
    // signal `value()` en un microtask: hay que dejarlo asentarse antes de seguir.
    await fixture.whenStable();

    // 2 piezas del Set A (llega justo al único rango, de 2 piezas)
    component.selectedHead.set(crearPiezaDePrueba({ id: 20, kind: 'head', armorSet: { id: 1, name: 'Set A' } }));
    component.selectedChest.set(crearPiezaDePrueba({ id: 21, kind: 'chest', armorSet: { id: 1, name: 'Set A' } }));
    // 3 piezas del Set B (supera el rango de 2 y alcanza también el de 3)
    component.selectedArms.set(crearPiezaDePrueba({ id: 22, kind: 'arms', armorSet: { id: 2, name: 'Set B' } }));
    component.selectedWaist.set(crearPiezaDePrueba({ id: 23, kind: 'waist', armorSet: { id: 2, name: 'Set B' } }));
    component.selectedLegs.set(crearPiezaDePrueba({ id: 24, kind: 'legs', armorSet: { id: 2, name: 'Set B' } }));
    fixture.detectChanges();

    const bonificaciones = component.bonificacionesSet();
    expect(bonificaciones.length).toEqual(2);

    // Orden: el set con más piezas equipadas va primero
    expect(bonificaciones[0].setId).toEqual(2);
    expect(bonificaciones[0].piezasEquipadas).toEqual(3);
    expect(bonificaciones[0].piezasRequeridas).toEqual(3); // el rango más alto alcanzado, no el primero
    expect(bonificaciones[0].nombreHabilidad).toEqual('Bono Set B Nv2');
    expect(bonificaciones[0].nivel).toEqual(2);

    expect(bonificaciones[1].setId).toEqual(1);
    expect(bonificaciones[1].piezasEquipadas).toEqual(2);
    expect(bonificaciones[1].piezasRequeridas).toEqual(2);
    expect(bonificaciones[1].nombreHabilidad).toEqual('Bono Set A');
  });
});
