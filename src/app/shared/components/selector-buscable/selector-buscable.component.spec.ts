import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectorBuscableComponent } from './selector-buscable.component';

interface ItemDePrueba {
  id: number;
  name: string;
}

describe('SelectorBuscableComponent', () => {
  let component: SelectorBuscableComponent<ItemDePrueba>;
  let fixture: ComponentFixture<SelectorBuscableComponent<ItemDePrueba>>;

  const elementos: ItemDePrueba[] = [
    { id: 1, name: 'Espada larga' },
    { id: 2, name: 'Hacha cargada' },
    { id: 3, name: 'Espada y escudo' }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectorBuscableComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(SelectorBuscableComponent<ItemDePrueba>);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('elementos', elementos);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('todos los elementos coinciden cuando no hay texto de búsqueda', () => {
    expect(elementos.every(elemento => component.coincide(elemento))).toBeTrue();
  });

  it('filtra por nombre al escribir en el buscador (sin importar mayúsculas)', () => {
    component.onBusquedaInput('espada');
    expect(elementos.map(elemento => component.coincide(elemento))).toEqual([true, false, true]);
  });

  it('actualiza el valor seleccionado al elegir una opción', () => {
    component.onSelectionChange(elementos[1]);
    expect(component.valor()).toEqual(elementos[1]);
  });

  it('hayResultados es false cuando ningún elemento coincide con la búsqueda', () => {
    component.onBusquedaInput('no existe ninguno así');
    expect(component.hayResultados()).toBeFalse();
  });

  it('hayResultados es true mientras al menos un elemento coincida', () => {
    component.onBusquedaInput('espada');
    expect(component.hayResultados()).toBeTrue();
  });
});
