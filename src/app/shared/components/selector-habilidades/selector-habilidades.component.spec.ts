import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';

import { SelectorHabilidadesComponent } from './selector-habilidades.component';
import { OpcionHabilidad } from '../../models/filtros-armadura.models';

const OPCIONES: OpcionHabilidad[] = [
  { id: 1, nombre: 'Aguante', total: 3 },
  { id: 2, nombre: 'Punto débil', total: 5 },
  { id: 3, nombre: 'Plena forma', total: 2 }
];

describe('SelectorHabilidadesComponent', () => {
  let fixture: ComponentFixture<SelectorHabilidadesComponent>;
  let component: SelectorHabilidadesComponent;
  let campo: HTMLInputElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SelectorHabilidadesComponent],
      providers: [provideTranslateService()]
    });

    fixture = TestBed.createComponent(SelectorHabilidadesComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('opciones', OPCIONES);
    fixture.detectChanges();
    campo = fixture.nativeElement.querySelector('.habilidades-campo');
  });

  function escribir(texto: string): void {
    campo.value = texto;
    campo.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  const sugerencias = () =>
    [...fixture.nativeElement.querySelectorAll('.habilidades-nombre')].map((e: Element) => e.textContent?.trim());

  it('al enfocar muestra todas las opciones y al escribir filtra sin distinguir tildes', () => {
    campo.dispatchEvent(new Event('focus'));
    fixture.detectChanges();
    expect(sugerencias()).toEqual(['Aguante', 'Punto débil', 'Plena forma']);

    escribir('DEBIL');
    expect(sugerencias()).toEqual(['Punto débil']);
  });

  it('al elegir una opción la añade como chip, vacía el campo y deja de sugerirla', () => {
    escribir('pun');
    fixture.nativeElement.querySelector('.habilidades-opcion').click();
    fixture.detectChanges();

    expect(component.seleccionadas()).toEqual([2]);
    expect(campo.value).toEqual('');
    expect(fixture.nativeElement.querySelector('.habilidades-chip').textContent).toContain('Punto débil');
    expect(sugerencias()).not.toContain('Punto débil');
  });

  it('Enter elige la primera sugerencia', () => {
    escribir('pl');
    campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(component.seleccionadas()).toEqual([3]);
  });

  it('la X del chip quita la habilidad', () => {
    component.seleccionadas.set([1, 2]);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.habilidades-chip button').click();
    expect(component.seleccionadas()).toEqual([2]);
  });

  it('muestra con su nombre una habilidad elegida que no está entre las opciones', () => {
    fixture.componentRef.setInput('nombres', new Map([[99, 'Alma del amo']]));
    component.seleccionadas.set([99]);
    fixture.detectChanges();

    const chip = fixture.nativeElement.querySelector('.habilidades-chip');
    expect(chip.textContent).toContain('Alma del amo');
    expect(chip.classList).toContain('sin-piezas');
  });

  it('al salir del campo cierra las sugerencias y descarta lo escrito', () => {
    escribir('agu');
    campo.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(component.abierto()).toBeFalse();
    expect(campo.value).toEqual('');
    expect(fixture.nativeElement.querySelector('.habilidades-sugerencias')).toBeNull();
  });
});
