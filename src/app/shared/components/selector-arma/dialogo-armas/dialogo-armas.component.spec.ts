import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WritableSignal, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';

import { DialogoArmasComponent } from './dialogo-armas.component';
import { Weapon } from '../../../../core/models/wilds.models';
import { DatosDialogoArmas } from '../../../models/tipos-arma.models';
import { ApiLocale, WildsApiService } from '../../../../core/services/wilds-api.service';

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
  let wildsApi: { locale: WritableSignal<ApiLocale>; getWeaponsPorTipo: jasmine.Spy };

  function crear(seleccionada: Weapon | null = null): void {
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close', 'afterOpened']);
    dialogRef.afterOpened.and.returnValue(of(undefined));
    const datos: DatosDialogoArmas = { seleccionada };
    // La API devuelve solo las armas del tipo pedido
    wildsApi = {
      locale: signal<ApiLocale>('es'),
      getWeaponsPorTipo: jasmine.createSpy('getWeaponsPorTipo')
        .and.callFake((tipo: string) => of(CATALOGO.filter(arma => arma.kind === tipo)))
    };

    TestBed.configureTestingModule({
      imports: [DialogoArmasComponent],
      providers: [
        provideTranslateService(),
        { provide: MAT_DIALOG_DATA, useValue: datos },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: WildsApiService, useValue: wildsApi }
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

  it('al elegir un tipo pide a la API solo sus armas y el buscador filtra dentro de ellas (sin tildes)', async () => {
    crear();
    expect(wildsApi.getWeaponsPorTipo).not.toHaveBeenCalled(); // en la pantalla de tipos no se pide nada

    component.elegirTipo('bow');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(wildsApi.getWeaponsPorTipo).toHaveBeenCalledOnceWith('bow', 'es');
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

  describe('filtros', () => {
    // Arcos de prueba: [id, rareza, ataque, afinidad, elemento/estado]
    const ARCOS: Weapon[] = ([
      [10, 3, 120, 0, 'fire'],
      [11, 8, 220, 10, 'water'],
      [12, 8, 200, 20, 'poison'],
      [13, 5, 180, -10, null]
    ] as const).map(([id, rarity, raw, affinity, especial]) => ({
      ...arma(id, `Arco ${id}`, 'bow'),
      rarity,
      affinity,
      damage: { raw, display: raw },
      specials: especial === null ? [] : [{
        id,
        kind: especial === 'poison' ? 'status' as const : 'element' as const,
        ...(especial === 'poison' ? { status: especial } : { element: especial }),
        damage: { raw: 10, display: 100 + id },
        hidden: false
      }]
    }));

    async function listaDeArcos(): Promise<void> {
      crear();
      wildsApi.getWeaponsPorTipo.and.returnValue(of(ARCOS));
      component.elegirTipo('bow');
      fixture.detectChanges();
      await fixture.whenStable();
    }

    const ids = () => component.armasFiltradas().map(a => a.id);

    it('filtra por varios elementos/estados a la vez (cualquiera de ellos) y por "Sin elemento"', async () => {
      await listaDeArcos();
      component.alternarEspecial('fire');
      component.alternarEspecial('poison');
      expect(ids()).toEqual([10, 12]);

      component.alternarEspecial('fire');
      component.alternarEspecial('poison');
      component.alternarEspecial('none');
      expect(ids()).toEqual([13]);
    });

    it('filtra por rareza y cuenta cuántas armas tiene cada opción', async () => {
      await listaDeArcos();
      component.alternarRareza(8);
      expect(ids()).toEqual([11, 12]);
      expect(component.conteoRarezas().get(8)).toEqual(2);
      expect(component.conteoEspeciales().get('none')).toEqual(1);
      expect(component.conteoEspeciales().get('thunder')).toBeUndefined();
    });

    it('ordena por el criterio elegido en ambos sentidos, empezando de mayor a menor', async () => {
      await listaDeArcos();
      component.elegirOrden('attack');
      expect(ids()).toEqual([11, 12, 13, 10]);
      component.alternarSentido();
      expect(ids()).toEqual([10, 13, 12, 11]);

      component.elegirOrden('affinity');
      expect(component.filtros().descendente).toBeTrue();
      expect(ids()).toEqual([12, 11, 10, 13]);
    });

    it('cuenta los filtros activos y "Borrar filtros" los quita todos', async () => {
      await listaDeArcos();
      component.alternarEspecial('fire');
      component.alternarRareza(3);
      component.elegirOrden('rarity');
      expect(component.filtrosActivos()).toEqual(3);

      component.borrarFiltros();
      expect(component.filtrosActivos()).toEqual(0);
      expect(ids()).toEqual([10, 11, 12, 13]);
    });

    it('mantiene los filtros al volver a los tipos y elegir otro', async () => {
      await listaDeArcos();
      component.alternarEspecial('fire');
      component.volverATipos();
      component.elegirTipo('great-sword');
      expect(component.filtros().especiales).toEqual(['fire']);
    });
  });

  it('cierra devolviendo el arma elegida, o sin nada al pulsar la X', () => {
    crear();
    component.elegirArma(CATALOGO[2]);
    expect(dialogRef.close).toHaveBeenCalledWith(CATALOGO[2]);

    component.cerrar();
    expect(dialogRef.close).toHaveBeenCalledWith();
  });
});
