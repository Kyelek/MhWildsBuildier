import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';

import { SelectorArmaComponent } from './selector-arma.component';
import { Weapon } from '../../../core/models/wilds.models';
import { ArmaEquipada } from '../../models/tipos-arma.models';

const ARCO: ArmaEquipada = {
  arma: { id: 1, name: 'Arco de hierro', kind: 'bow', rarity: 1, affinity: 0, damage: { raw: 100, display: 100 }, slots: [], specials: [] } satisfies Weapon,
  gogma: null
};

const ARCO_GOGMA: ArmaEquipada = {
  arma: ARCO.arma,
  gogma: {
    especial: 'thunder',
    habilidadesSet: [null, { id: 131, gameId: 131, name: 'Alma del amo', kind: 'group' }]
  }
};

describe('SelectorArmaComponent', () => {
  let fixture: ComponentFixture<SelectorArmaComponent>;
  let component: SelectorArmaComponent;
  let dialog: jasmine.SpyObj<MatDialog>;

  beforeEach(() => {
    dialog = jasmine.createSpyObj('MatDialog', ['open']);

    TestBed.configureTestingModule({
      imports: [SelectorArmaComponent],
      providers: [
        provideTranslateService(),
        { provide: MatDialog, useValue: dialog }
      ]
    });

    fixture = TestBed.createComponent(SelectorArmaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function simularCierre(resultado: ArmaEquipada | undefined): void {
    dialog.open.and.returnValue({ afterClosed: () => of(resultado) } as ReturnType<MatDialog['open']>);
  }

  it('guarda el arma que devuelve el popup y la muestra con el icono de su tipo', () => {
    simularCierre(ARCO);
    fixture.nativeElement.querySelector('.campo-boton').click();
    fixture.detectChanges();

    expect(component.valor()).toEqual(ARCO);
    expect(fixture.nativeElement.querySelector('.campo-texto').textContent).toContain('Arco de hierro');
    expect(fixture.nativeElement.querySelector('.campo-icono').getAttribute('src')).toEqual('images/arms/bow.png');
    expect(fixture.nativeElement.querySelector('.gogma-etiquetas')).toBeNull();
  });

  it('abre el popup con la Gogma permitida y el arma equipada', () => {
    component.valor.set(ARCO_GOGMA);
    simularCierre(undefined);
    component.abrir();
    expect(dialog.open.calls.mostRecent().args[1]?.data).toEqual({ seleccionada: ARCO_GOGMA, permitirGogma: true });
  });

  it('muestra el arma Gogma con su nombre y, como etiquetas, elemento, habilidades de set y 3 huecos', () => {
    simularCierre(ARCO_GOGMA);
    component.abrir();
    fixture.detectChanges();

    const campo: HTMLElement = fixture.nativeElement.querySelector('.campo-gogma');
    expect(campo.querySelector('.gogma-nombre')?.textContent).toContain('weaponPicker.gogmaName');
    const etiquetas = Array.from(campo.querySelectorAll('.gogma-etiqueta')).map(e => e.textContent?.trim());
    expect(etiquetas).toEqual(['⚡ weaponPicker.elements.thunder', '🎖️ Alma del amo']);
    expect(campo.querySelectorAll('.hueco').length).toEqual(3);
  });

  it('no cambia la selección si el popup se cierra sin elegir nada', () => {
    component.valor.set(ARCO);
    simularCierre(undefined);
    component.abrir();
    expect(component.valor()).toEqual(ARCO);
  });

  it('la X de fuera del popup quita el arma (solo si se permite)', () => {
    component.valor.set(ARCO);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.campo-quitar')).toBeNull();

    fixture.componentRef.setInput('permitirQuitar', true);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.campo-quitar').click();
    expect(component.valor()).toBeNull();
  });
});
