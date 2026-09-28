import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WritableSignal, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';

import { DialogoArmasComponent } from './dialogo-armas.component';
import { Weapon } from '../../../../core/models/wilds.models';
import { ArmaEquipada, ConfiguracionGogma, DatosDialogoArmas } from '../../../models/tipos-arma.models';
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
  let dialogRef: jasmine.SpyObj<MatDialogRef<DialogoArmasComponent, ArmaEquipada>>;
  let wildsApi: { locale: WritableSignal<ApiLocale>; getWeaponsPorTipo: jasmine.Spy; getArmor: jasmine.Spy };

  function crear(seleccionada: ArmaEquipada | null = null): void {
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close', 'afterOpened']);
    dialogRef.afterOpened.and.returnValue(of(undefined));
    const datos: DatosDialogoArmas = { seleccionada };
    // La API devuelve solo las armas del tipo pedido
    wildsApi = {
      locale: signal<ApiLocale>('es'),
      getWeaponsPorTipo: jasmine.createSpy('getWeaponsPorTipo')
        .and.callFake((tipo: string) => of(CATALOGO.filter(arma => arma.kind === tipo))),
      // Catálogo de armaduras del que el formulario Gogma saca las habilidades de set
      getArmor: jasmine.createSpy('getArmor').and.returnValue(of([]))
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

  it('"Arma Gogma" muestra la imagen de la interrogación y lleva a su formulario; la flecha vuelve a los tipos', () => {
    crear();
    const tarjeta: HTMLElement = fixture.nativeElement.querySelector('.tarjeta-gogma');
    expect(tarjeta.querySelector('img')?.getAttribute('src')).toEqual('images/recursos/armagogmapng.png');

    tarjeta.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-formulario-gogma')).not.toBeNull();
    expect(dialogRef.close).not.toHaveBeenCalled();

    fixture.nativeElement.querySelectorAll('.btn-cabecera')[0].click();
    fixture.detectChanges();
    expect(component.viendoGogma()).toBeFalse();
    expect(fixture.nativeElement.querySelectorAll('.tarjeta-tipo').length).toEqual(15);
  });

  describe('arma Gogma', () => {
    const CONFIGURACION: ConfiguracionGogma = {
      tipo: 'hammer',
      especial: 'fire',
      habilidadesSet: [{ id: 131, gameId: 131, name: 'Alma del amo', kind: 'group' }, null]
    };

    it('la imagen del formulario muestra la rejilla de tipos (sin "Arma Gogma"): el tipo elegido es el del arma, sin buscador', () => {
      crear();
      component.verGogma();
      fixture.detectChanges();

      component.cambiarTipoGogma();
      fixture.detectChanges();
      // Rejilla sin la tarjeta Gogma, y el formulario sigue montado (oculto) para no perder lo rellenado
      expect(fixture.nativeElement.querySelectorAll('.tarjeta-tipo').length).toEqual(14);
      expect(fixture.nativeElement.querySelector('.tarjeta-gogma')).toBeNull();
      expect(fixture.nativeElement.querySelector('.pantalla-gogma').hidden).toBeTrue();

      fixture.nativeElement.querySelectorAll('.tarjeta-tipo')[4].click(); // Martillo
      fixture.detectChanges();
      expect(component.tipoGogma()).toEqual('hammer');
      expect(component.eligiendoTipoGogma()).toBeFalse();
      expect(component.tipoElegido()).toBeNull();
      expect(wildsApi.getWeaponsPorTipo).not.toHaveBeenCalled();
      expect(fixture.nativeElement.querySelector('.pantalla-gogma').hidden).toBeFalse();
      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('desde la rejilla del arma Gogma, la flecha vuelve al formulario sin cambiar el tipo', () => {
      crear();
      component.verGogma();
      component.tipoGogma.set('bow');
      component.cambiarTipoGogma();
      component.volver();
      expect(component.eligiendoTipoGogma()).toBeFalse();
      expect(component.viendoGogma()).toBeTrue();
      expect(component.tipoGogma()).toEqual('bow');

      // Desde el formulario, la flecha sí vuelve a la rejilla normal
      component.volver();
      expect(component.viendoGogma()).toBeFalse();
    });

    it('"Aceptar" cierra devolviendo el arma Gogma', () => {
      crear();
      component.aceptarGogma(CONFIGURACION);
      expect(dialogRef.close).toHaveBeenCalledWith({ arma: null, gogma: CONFIGURACION });
    });

    it('con un arma Gogma equipada abre directamente en su formulario, con sus datos', () => {
      crear({ arma: null, gogma: CONFIGURACION });
      expect(component.viendoGogma()).toBeTrue();
      expect(component.tipoElegido()).toBeNull();
      expect(component.tipoGogma()).toEqual('hammer');
      expect(component.gogmaInicial).toEqual(CONFIGURACION);
      expect(component.seleccionada).toBeNull();
    });
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
    crear({ arma: CATALOGO[3], gogma: null });
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

  it('cierra devolviendo el arma elegida (como arma normal), o sin nada al pulsar la X', () => {
    crear();
    component.elegirArma(CATALOGO[2]);
    expect(dialogRef.close).toHaveBeenCalledWith({ arma: CATALOGO[2], gogma: null });

    component.cerrar();
    expect(dialogRef.close).toHaveBeenCalledWith();
  });
});
