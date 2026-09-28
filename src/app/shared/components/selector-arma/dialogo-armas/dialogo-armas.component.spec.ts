import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WritableSignal, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
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
  let dialog: jasmine.SpyObj<MatDialog>;
  let wildsApi: { locale: WritableSignal<ApiLocale>; getWeaponsPorTipo: jasmine.Spy; getArmor: jasmine.Spy };

  function crear(seleccionada: ArmaEquipada | null = null, permitirGogma = true): void {
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close', 'afterOpened']);
    dialogRef.afterOpened.and.returnValue(of(undefined));
    // Popup de armas que se abre encima para elegir el arma base del arma Gogma
    dialog = jasmine.createSpyObj('MatDialog', ['open']);
    const datos: DatosDialogoArmas = { seleccionada, permitirGogma };
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
        { provide: MatDialog, useValue: dialog },
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
    expect(tarjeta.querySelector('img')?.getAttribute('src')).toEqual('images/recursos/armagogma.jpg');

    tarjeta.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-formulario-gogma')).not.toBeNull();
    expect(dialogRef.close).not.toHaveBeenCalled();

    fixture.nativeElement.querySelectorAll('.btn-cabecera')[0].click();
    fixture.detectChanges();
    expect(component.viendoGogma()).toBeFalse();
    expect(fixture.nativeElement.querySelectorAll('.tarjeta-tipo').length).toEqual(15);
  });

  it('sin la Gogma permitida (al elegir el arma base) solo están los 14 tipos, para no entrar en bucle', () => {
    crear(null, false);
    expect(fixture.nativeElement.querySelectorAll('.tarjeta-tipo').length).toEqual(14);
    expect(fixture.nativeElement.querySelector('.tarjeta-gogma')).toBeNull();
  });

  describe('arma Gogma', () => {
    const CONFIGURACION: ConfiguracionGogma = {
      especial: 'fire',
      habilidadesSet: [{ id: 131, gameId: 131, name: 'Alma del amo', kind: 'group' }, null]
    };

    it('elige el arma base en otro popup de armas sin la Gogma, y solo cambia la imagen', () => {
      crear();
      component.verGogma();
      dialog.open.and.returnValue({ afterClosed: () => of({ arma: CATALOGO[3], gogma: null }) } as ReturnType<MatDialog['open']>);

      component.elegirBaseGogma();
      expect(dialog.open.calls.mostRecent().args[1]?.data).toEqual({ seleccionada: null, permitirGogma: false });
      expect(component.baseGogma()).toEqual(CATALOGO[3]);
      expect(dialogRef.close).not.toHaveBeenCalled();

      // Al volver a elegirla, el popup de encima se abre con la base actual
      component.elegirBaseGogma();
      expect(dialog.open.calls.mostRecent().args[1]?.data)
        .toEqual({ seleccionada: { arma: CATALOGO[3], gogma: null }, permitirGogma: false });
    });

    it('si se cierra el popup de encima sin elegir nada, la base no cambia', () => {
      crear();
      component.baseGogma.set(CATALOGO[0]);
      dialog.open.and.returnValue({ afterClosed: () => of(undefined) } as ReturnType<MatDialog['open']>);
      component.elegirBaseGogma();
      expect(component.baseGogma()).toEqual(CATALOGO[0]);
    });

    it('"Aceptar" cierra devolviendo el arma base con la configuración Gogma', () => {
      crear();
      component.baseGogma.set(CATALOGO[2]);
      component.aceptarGogma(CONFIGURACION);
      expect(dialogRef.close).toHaveBeenCalledWith({ arma: CATALOGO[2], gogma: CONFIGURACION });
    });

    it('con un arma Gogma equipada abre directamente en su formulario, con sus datos', () => {
      crear({ arma: CATALOGO[1], gogma: CONFIGURACION });
      expect(component.viendoGogma()).toBeTrue();
      expect(component.tipoElegido()).toBeNull();
      expect(component.baseGogma()).toEqual(CATALOGO[1]);
      expect(component.gogmaInicial).toEqual(CONFIGURACION);
      // No se resalta como arma normal en la lista de su tipo
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
