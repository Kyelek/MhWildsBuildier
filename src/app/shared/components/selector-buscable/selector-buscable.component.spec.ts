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

  it('muestra todos los elementos cuando no hay texto de búsqueda', () => {
    expect(component.elementosFiltrados()).toEqual(elementos);
  });

  it('filtra por nombre al escribir en el buscador (sin importar mayúsculas)', () => {
    component.onBusquedaInput('espada');
    expect(component.elementosFiltrados()).toEqual([elementos[0], elementos[2]]);
  });

  it('actualiza el valor seleccionado al elegir una opción', () => {
    component.onSelectionChange(elementos[1]);
    expect(component.valor()).toEqual(elementos[1]);
  });
});
