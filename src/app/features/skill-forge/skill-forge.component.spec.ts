import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideTranslateService } from '@ngx-translate/core';

import { SkillForgeComponent } from './skill-forge.component';
import { ArmorPiece, ArmorSet, ArmorSkill, Weapon } from '../../core/models/wilds.models';

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

function crearArmaDePrueba(overrides: Partial<Weapon> = {}): Weapon {
  return {
    id: 1,
    name: 'Arma de prueba',
    kind: 'great-sword',
    rarity: 1,
    affinity: 0,
    damage: { raw: 100, display: 100 },
    slots: [],
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
    // El servicio cachea los catálogos en localStorage: lo limpiamos antes de cada prueba
    // para que una prueba anterior no "esconda" la petición HTTP que este test espera.
    localStorage.clear();

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

  // Responde los 4 catálogos que pide el componente al crearse (rxResource).
  // Por defecto, vacíos; cada test pasa los que necesite.
  function flushCatalogos(armorSets: ArmorSet[] = []): void {
    httpMock.expectOne(req => req.url.endsWith('/armor')).flush([]);
    httpMock.expectOne(req => req.url.endsWith('/armor/sets')).flush(armorSets);
    httpMock.expectOne(req => req.url.endsWith('/skills')).flush([]);
    httpMock.expectOne(req => req.url.endsWith('/weapons')).flush([]);
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

    component.piezaCabeza.set(crearPiezaDePrueba({ id: 10, kind: 'head', skills: [habilidadDePrueba()] }));
    component.piezaPecho.set(crearPiezaDePrueba({ id: 11, kind: 'chest', skills: [habilidadDePrueba()] }));
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
    component.piezaCabeza.set(crearPiezaDePrueba({ id: 20, kind: 'head', armorSet: { id: 1, name: 'Set A' } }));
    component.piezaPecho.set(crearPiezaDePrueba({ id: 21, kind: 'chest', armorSet: { id: 1, name: 'Set A' } }));
    // 3 piezas del Set B (supera el rango de 2 y alcanza también el de 3)
    component.piezaBrazos.set(crearPiezaDePrueba({ id: 22, kind: 'arms', armorSet: { id: 2, name: 'Set B' } }));
    component.piezaCintura.set(crearPiezaDePrueba({ id: 23, kind: 'waist', armorSet: { id: 2, name: 'Set B' } }));
    component.piezaPiernas.set(crearPiezaDePrueba({ id: 24, kind: 'legs', armorSet: { id: 2, name: 'Set B' } }));
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

  // ==========================================
  // 📊 PESTAÑA "ESTADÍSTICAS TOTALES" (mismo comportamiento que en el Constructor)
  // ==========================================
  it('sin nada equipado, todas las estadísticas totales son 0', () => {
    flushCatalogos();
    expect(component.defensaTotal()).toEqual(0);
    expect(component.ataqueTotal()).toEqual(0);
    expect(component.afinidadTotal()).toEqual(0);
    expect(component.resistenciasTotales()).toEqual({ fire: 0, water: 0, thunder: 0, ice: 0, dragon: 0 });
  });

  it('suma la defensa máxima de las piezas equipadas', () => {
    flushCatalogos();
    component.piezaCabeza.set(crearPiezaDePrueba({ defense: { base: 5, max: 10 } }));
    component.piezaPecho.set(crearPiezaDePrueba({ defense: { base: 5, max: 20 } }));
    fixture.detectChanges();

    expect(component.defensaTotal()).toEqual(30);
  });

  it('usa el ataque bruto y la afinidad del arma equipada', () => {
    flushCatalogos();
    component.armaSeleccionada.set(crearArmaDePrueba({ damage: { raw: 150, display: 150 }, affinity: 25 }));
    fixture.detectChanges();

    expect(component.ataqueTotal()).toEqual(150);
    expect(component.afinidadTotal()).toEqual(25);
  });

  it('suma las resistencias elementales (positivas y negativas) de todas las piezas', () => {
    flushCatalogos();
    component.piezaCabeza.set(crearPiezaDePrueba({ resistances: { fire: 3, water: -2, ice: 0, thunder: 1, dragon: 0 } }));
    component.piezaPiernas.set(crearPiezaDePrueba({ resistances: { fire: 2, water: 0, ice: 0, thunder: 0, dragon: 5 } }));
    fixture.detectChanges();

    expect(component.resistenciasTotales()).toEqual({ fire: 5, water: -2, thunder: 1, ice: 0, dragon: 5 });
  });
});
