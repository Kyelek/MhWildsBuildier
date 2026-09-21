import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideTranslateService } from '@ngx-translate/core';

import { BuilderComponent } from './builder.component';
import { ArmorPiece, Weapon } from '../../core/models/wilds.models';

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

describe('BuilderComponent', () => {
  let component: BuilderComponent;
  let fixture: ComponentFixture<BuilderComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BuilderComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTranslateService({ lang: 'en', fallbackLang: 'en' })
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BuilderComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    // El componente pide su catálogo de armas/armaduras nada más crearse (rxResource);
    // en estas pruebas de cálculo no necesitamos catálogo real, así que respondemos vacío.
    httpMock.expectOne(req => req.url.endsWith('/armor')).flush([]);
    httpMock.expectOne(req => req.url.endsWith('/weapons')).flush([]);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('sin nada equipado, todas las estadísticas totales son 0', () => {
    expect(component.totalDefense()).toEqual(0);
    expect(component.totalAttack()).toEqual(0);
    expect(component.totalAffinity()).toEqual(0);
    expect(component.totalResistances()).toEqual({ fire: 0, water: 0, thunder: 0, ice: 0, dragon: 0 });
  });

  it('suma la defensa máxima de las piezas equipadas', () => {
    component.selectedHead.set(crearPiezaDePrueba({ defense: { base: 5, max: 10 } }));
    component.selectedChest.set(crearPiezaDePrueba({ defense: { base: 5, max: 20 } }));
    fixture.detectChanges();

    expect(component.totalDefense()).toEqual(30);
  });

  it('usa el ataque bruto y la afinidad del arma equipada', () => {
    component.selectedWeapon.set(crearArmaDePrueba({ damage: { raw: 150, display: 150 }, affinity: 25 }));
    fixture.detectChanges();

    expect(component.totalAttack()).toEqual(150);
    expect(component.totalAffinity()).toEqual(25);
  });

  it('suma las resistencias elementales (positivas y negativas) de todas las piezas', () => {
    component.selectedHead.set(crearPiezaDePrueba({ resistances: { fire: 3, water: -2, ice: 0, thunder: 1, dragon: 0 } }));
    component.selectedLegs.set(crearPiezaDePrueba({ resistances: { fire: 2, water: 0, ice: 0, thunder: 0, dragon: 5 } }));
    fixture.detectChanges();

    expect(component.totalResistances()).toEqual({ fire: 5, water: -2, thunder: 1, ice: 0, dragon: 5 });
  });
});
