import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';

import { SelectorArmaduraComponent } from './selector-armadura.component';
import { ArmorPiece } from '../../../core/models/wilds.models';
import { DatosDialogoArmaduras, FILTROS_ARMADURA_VACIOS } from '../../models/filtros-armadura.models';

const YELMO: ArmorPiece = {
  id: 1,
  name: 'Yelmo Rathalos',
  description: '',
  kind: 'head',
  rank: 'high',
  rarity: 6,
  resistances: { fire: 0, water: 0, ice: 0, thunder: 0, dragon: 0 },
  defense: { base: 50, max: 80 },
  skills: [],
  slots: [],
  armorSet: { id: 1, name: 'Rathalos' }
};

describe('SelectorArmaduraComponent', () => {
  let fixture: ComponentFixture<SelectorArmaduraComponent>;
  let component: SelectorArmaduraComponent;
  let dialog: jasmine.SpyObj<MatDialog>;

  beforeEach(() => {
    dialog = jasmine.createSpyObj('MatDialog', ['open']);

    TestBed.configureTestingModule({
      imports: [SelectorArmaduraComponent],
      providers: [
        provideTranslateService(),
        { provide: MatDialog, useValue: dialog }
      ]
    });

    fixture = TestBed.createComponent(SelectorArmaduraComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('ranura', 'head');
    fixture.detectChanges();
  });

  function simularCierre(resultado: ArmorPiece | undefined): void {
    dialog.open.and.returnValue({ afterClosed: () => of(resultado) } as ReturnType<MatDialog['open']>);
  }

  it('muestra el icono de su ranura y guarda la pieza que devuelve el popup', () => {
    expect(fixture.nativeElement.querySelector('.campo-icono').getAttribute('src'))
      .toEqual('images/armor/48px-MHWilds-Helmet.png');

    simularCierre(YELMO);
    fixture.nativeElement.querySelector('.campo-boton').click();
    fixture.detectChanges();

    expect(component.valor()).toEqual(YELMO);
    expect(fixture.nativeElement.querySelector('.campo-texto').textContent).toContain('Yelmo Rathalos');
  });

  it('pasa al popup la ranura, la pieza elegida y el signal de filtros compartido', () => {
    component.valor.set(YELMO);
    simularCierre(undefined);
    component.abrir();

    const datos = dialog.open.calls.mostRecent().args[1]!.data as DatosDialogoArmaduras;
    expect(datos.ranura).toEqual('head');
    expect(datos.seleccionada).toEqual(YELMO);

    // Lo que el popup escribe en los filtros llega a quien usa el selector
    datos.filtros.set({ ...FILTROS_ARMADURA_VACIOS, rarezas: [8] });
    expect(component.filtros().rarezas).toEqual([8]);
  });

  it('no cambia la selección si el popup se cierra sin elegir nada', () => {
    component.valor.set(YELMO);
    simularCierre(undefined);
    component.abrir();
    expect(component.valor()).toEqual(YELMO);
  });

  it('la X de fuera del popup quita la pieza (solo si se permite)', () => {
    component.valor.set(YELMO);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.campo-quitar')).toBeNull();

    fixture.componentRef.setInput('permitirQuitar', true);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.campo-quitar').click();
    expect(component.valor()).toBeNull();
  });
});
