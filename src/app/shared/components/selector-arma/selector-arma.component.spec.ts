import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';

import { SelectorArmaComponent } from './selector-arma.component';
import { Weapon } from '../../../core/models/wilds.models';

const ARCO: Weapon = { id: 1, name: 'Arco de hierro', kind: 'bow', rarity: 1, affinity: 0, damage: { raw: 100, display: 100 }, slots: [], specials: [] };

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

  function simularCierre(resultado: Weapon | undefined): void {
    dialog.open.and.returnValue({ afterClosed: () => of(resultado) } as ReturnType<MatDialog['open']>);
  }

  it('guarda el arma que devuelve el popup y la muestra con el icono de su tipo', () => {
    simularCierre(ARCO);
    fixture.nativeElement.querySelector('.campo-boton').click();
    fixture.detectChanges();

    expect(component.valor()).toEqual(ARCO);
    expect(fixture.nativeElement.querySelector('.campo-texto').textContent).toContain('Arco de hierro');
    expect(fixture.nativeElement.querySelector('.campo-icono').getAttribute('src')).toEqual('images/arms/bow.png');
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
