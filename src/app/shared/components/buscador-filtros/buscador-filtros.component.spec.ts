import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';

import { BuscadorFiltrosComponent } from './buscador-filtros.component';

describe('BuscadorFiltrosComponent', () => {
  let fixture: ComponentFixture<BuscadorFiltrosComponent>;
  let component: BuscadorFiltrosComponent;
  let elemento: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [BuscadorFiltrosComponent],
      providers: [provideTranslateService()]
    });
    fixture = TestBed.createComponent(BuscadorFiltrosComponent);
    component = fixture.componentInstance;
    elemento = fixture.nativeElement;
    document.body.appendChild(elemento); // Para que los clicks "fuera" lleguen al document
    fixture.detectChanges();
  });

  afterEach(() => elemento.remove());

  function abrir(): void {
    elemento.querySelector<HTMLButtonElement>('.buscador-boton-filtros')!.click();
    fixture.detectChanges();
  }

  it('el botón de filtros abre y cierra el panel', () => {
    abrir();
    expect(elemento.querySelector('.panel-filtros')).not.toBeNull();
    abrir();
    expect(elemento.querySelector('.panel-filtros')).toBeNull();
  });

  it('muestra el número de filtros activos solo si hay alguno', () => {
    expect(elemento.querySelector('.buscador-contador')).toBeNull();
    fixture.componentRef.setInput('filtrosActivos', 3);
    fixture.detectChanges();
    expect(elemento.querySelector('.buscador-contador')?.textContent).toContain('3');
  });

  it('se cierra con la X, con "Ver resultados", con Escape y con un click fuera', () => {
    const cerrarCon = (accion: () => void) => {
      abrir();
      accion();
      fixture.detectChanges();
      expect(elemento.querySelector('.panel-filtros')).toBeNull();
    };

    cerrarCon(() => elemento.querySelector<HTMLButtonElement>('.panel-cerrar')!.click());
    cerrarCon(() => elemento.querySelector<HTMLButtonElement>('.panel-ver')!.click());
    cerrarCon(() => elemento.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
    cerrarCon(() => document.body.click());
  });

  it('no se cierra si lo pulsado dentro del panel desaparece con el propio click (la X de un chip)', () => {
    abrir();
    const chip = document.createElement('button');
    elemento.querySelector('.panel-cuerpo')!.appendChild(chip);
    chip.addEventListener('click', () => chip.remove());

    chip.click();
    fixture.detectChanges();
    expect(elemento.querySelector('.panel-filtros')).not.toBeNull();
  });

  it('Escape no se propaga (no cierra un popup contenedor) mientras el panel está abierto', () => {
    abrir();
    const evento = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
    const espia = spyOn(evento, 'stopPropagation').and.callThrough();
    elemento.dispatchEvent(evento);
    expect(espia).toHaveBeenCalled();
  });

  it('"Borrar filtros" está desactivado sin filtros y avisa al pulsarlo con filtros', () => {
    let limpiado = false;
    component.limpiar.subscribe(() => limpiado = true);
    abrir();
    const boton = elemento.querySelector<HTMLButtonElement>('.panel-limpiar')!;
    expect(boton.disabled).toBeTrue();

    fixture.componentRef.setInput('filtrosActivos', 1);
    fixture.detectChanges();
    boton.click();
    expect(limpiado).toBeTrue();
  });

  it('emite el texto escrito', () => {
    const campo = elemento.querySelector<HTMLInputElement>('.buscador-campo')!;
    campo.value = 'rey';
    campo.dispatchEvent(new Event('input'));
    expect(component.texto()).toEqual('rey');
  });
});
