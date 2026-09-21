import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectorBuscableComponent } from './selector-buscable.component';

interface ItemDePrueba {
  id: number;
  name: string;
}

describe('SelectorBuscableComponent', () => {
  let component: SelectorBuscableComponent<ItemDePrueba>;
  let fixture: ComponentFixture<SelectorBuscableComponent<ItemDePrueba>>;

  const items: ItemDePrueba[] = [
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
    fixture.componentRef.setInput('items', items);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('muestra todos los items cuando no hay texto de búsqueda', () => {
    expect(component.itemsFiltrados()).toEqual(items);
  });

  it('filtra por nombre al escribir en el buscador (sin importar mayúsculas)', () => {
    component.onBusquedaInput('espada');
    expect(component.itemsFiltrados()).toEqual([items[0], items[2]]);
  });

  it('actualiza el value seleccionado al elegir una opción', () => {
    component.onSelectionChange(items[1]);
    expect(component.value()).toEqual(items[1]);
  });
});
