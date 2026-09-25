import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';

import { DialogoArmasComponent } from './dialogo-armas.component';
import { Weapon } from '../../../../core/models/wilds.models';
import { DatosDialogoArmas } from '../../../models/tipos-arma.models';

function arma(id: number, name: string, kind: string): Weapon {
  return { id, name, kind, rarity: 1, affinity: 0, damage: { raw: 100, display: 100 }, slots: [] };
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

  it('empieza en la pantalla de tipos si no hay arma elegida, mostrando los 14 tipos', () => {
    crear();
    expect(component.tipoElegido()).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.tarjeta-tipo').length).toEqual(14);
    expect(fixture.nativeElement.querySelector('.btn-volver')).toBeNull();
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
    expect(fixture.nativeElement.querySelector('.btn-volver')).not.toBeNull();

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
