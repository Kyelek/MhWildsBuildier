import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';

import { DialogoArmasComponent } from './dialogo-armas.component';
import { Weapon } from '../../../../core/models/wilds.models';
import { DatosDialogoArmas } from '../../../models/tipos-arma.models';

function arma(id: number, name: string, kind: string): Weapon {
  return { id, name, kind, rarity: 1, affinity: 0, damage: { raw: 100, display: 100 }, slots: [], specials: [] };
}

const CATALOGO: Weapon[] = [
  arma(1, 'Arco de hierro', 'bow'),
  arma(2, 'Arco Rey Dau', 'bow'),
  arma(3, 'Gran espada de hierro', 'great-sword'),
  arma(4, 'Glaive Rathalos', 'insect-glaive')
];

describe('DialogoArmasComponent', () => {
  let fixture: ComponentFixture<DialogoArmasComponent>;
  let component: DialogoArmasComponent;
  let dialogRef: jasmine.SpyObj<MatDialogRef<DialogoArmasComponent, Weapon>>;

  function crear(seleccionada: Weapon | null = null): void {
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close', 'afterOpened']);
    dialogRef.afterOpened.and.returnValue(of(undefined));
    const datos: DatosDialogoArmas = { armas: CATALOGO, seleccionada };

    TestBed.configureTestingModule({
      imports: [DialogoArmasComponent],
      providers: [
        provideTranslateService(),
        { provide: MAT_DIALOG_DATA, useValue: datos },
        { provide: MatDialogRef, useValue: dialogRef }
      ]
    });

    fixture = TestBed.createComponent(DialogoArmasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('empieza en la pantalla de tipos si no hay arma elegida: 14 tipos + Arma Gogma, sin flecha de volver', () => {
    crear();
    expect(component.tipoElegido()).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.tarjeta-tipo').length).toEqual(15);
    expect(fixture.nativeElement.querySelector('.tarjeta-gogma')).not.toBeNull();
    // Solo la X de cerrar
    expect(fixture.nativeElement.querySelectorAll('.btn-cabecera').length).toEqual(1);
  });

  it('"Arma Gogma" lleva al aviso de en desarrollo y la flecha vuelve a los tipos', () => {
    crear();
    fixture.nativeElement.querySelector('.tarjeta-gogma').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-en-desarrollo')).not.toBeNull();
    expect(dialogRef.close).not.toHaveBeenCalled();

    fixture.nativeElement.querySelectorAll('.btn-cabecera')[0].click();
    fixture.detectChanges();
    expect(component.viendoGogma()).toBeFalse();
    expect(fixture.nativeElement.querySelectorAll('.tarjeta-tipo').length).toEqual(15);
  });

  it('muestra el elemento o el estado del arma con su icono, y null si no tiene', () => {
    crear();
    const conFuego: Weapon = {
      ...CATALOGO[0],
      specials: [{ id: 1, kind: 'element', element: 'fire', damage: { raw: 11, display: 110 }, hidden: true }]
    };
    const conVeneno: Weapon = {
      ...CATALOGO[0],
      specials: [{ id: 2, kind: 'status', status: 'poison', damage: { raw: 20, display: 200 }, hidden: false }]
    };
    expect(component.especialDe(conFuego)).toEqual(
      { icono: '🔥', claveNombre: 'weaponPicker.elements.fire', valor: 110, oculto: true });
    expect(component.especialDe(conVeneno)).toEqual(
      { icono: '☠️', claveNombre: 'weaponPicker.statuses.poison', valor: 200, oculto: false });
    expect(component.especialDe(CATALOGO[0])).toBeNull();
  });

  it('al elegir un tipo lista solo sus armas y el buscador filtra dentro de ese tipo (sin tildes)', () => {
    crear();
    component.elegirTipo('bow');
    expect(component.armasFiltradas().map(a => a.id)).toEqual([1, 2]);

    component.onBusquedaInput('HIÉRRO');
    expect(component.armasFiltradas().map(a => a.id)).toEqual([1]);
  });

  it('abre directamente en la lista del tipo del arma ya elegida, con el botón de volver', () => {
    crear(CATALOGO[3]);
    expect(component.tipoElegido()).toEqual('insect-glaive');
    // Flecha de volver + X de cerrar
    expect(fixture.nativeElement.querySelectorAll('.btn-cabecera').length).toEqual(2);

    component.volverATipos();
    expect(component.tipoElegido()).toBeNull();
  });

  it('cierra devolviendo el arma elegida, o sin nada al pulsar la X', () => {
    crear();
    component.elegirArma(CATALOGO[2]);
    expect(dialogRef.close).toHaveBeenCalledWith(CATALOGO[2]);

    component.cerrar();
    expect(dialogRef.close).toHaveBeenCalledWith();
  });
});
