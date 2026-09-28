import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';

import { FormularioGogmaComponent } from './formulario-gogma.component';
import { ArmorPiece, SkillInfo, Weapon } from '../../../../core/models/wilds.models';
import { WildsApiService } from '../../../../core/services/wilds-api.service';
import { ConfiguracionGogma } from '../../../models/tipos-arma.models';

const ESPADA: Weapon = { id: 3, name: 'Gran espada de hierro', kind: 'great-sword', rarity: 1, affinity: 0, damage: { raw: 100, display: 100 }, slots: [], specials: [] };

const ECLIPSE: SkillInfo = { id: 900, gameId: 900, name: 'Eclipse negro', kind: 'set' };
const ALMA: SkillInfo = { id: 131, gameId: 131, name: 'Alma del amo', kind: 'group' };
const AGUANTE: SkillInfo = { id: 500, gameId: 500, name: 'Aguante', kind: 'armor' };

function pieza(id: number, habilidades: SkillInfo[]): ArmorPiece {
  return {
    id, name: `Pieza ${id}`, description: '', kind: 'head', rank: 'high', rarity: 5,
    resistances: { fire: 0, water: 0, ice: 0, thunder: 0, dragon: 0 },
    defense: { base: 10, max: 20 },
    skills: habilidades.map(skill => ({ id: skill.id, level: 1, description: '', skill, setPiecesRequired: null })),
    slots: [],
    armorSet: { id: 1, name: 'Set' }
  };
}

describe('FormularioGogmaComponent', () => {
  let fixture: ComponentFixture<FormularioGogmaComponent>;
  let component: FormularioGogmaComponent;

  async function crear(inicial: ConfiguracionGogma | null = null): Promise<void> {
    TestBed.configureTestingModule({
      imports: [FormularioGogmaComponent],
      providers: [
        provideNoopAnimations(),
        provideTranslateService(),
        {
          provide: WildsApiService,
          // La misma habilidad de set en varias piezas sale una sola vez
          useValue: { locale: () => 'es', getArmor: () => of([pieza(1, [ECLIPSE, AGUANTE]), pieza(2, [ALMA, ECLIPSE])]) }
        }
      ]
    });

    fixture = TestBed.createComponent(FormularioGogmaComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('inicial', inicial);
    fixture.detectChanges();
    await fixture.whenStable(); // Espera al catálogo de armaduras (rxResource)
  }

  it('ofrece solo las habilidades de set de las armaduras (set y group), sin repetir y por orden alfabético', async () => {
    await crear();
    expect(component.habilidadesSet().map(h => h.name)).toEqual(['Alma del amo', 'Eclipse negro']);
  });

  it('cada desplegable ofrece todas menos la elegida en el otro: no pueden repetirse', async () => {
    await crear();
    component.habilidad1.set(ECLIPSE);
    expect(component.opcionesHabilidad2().map(h => h.id)).toEqual([ALMA.id]);
    expect(component.opcionesHabilidad1().map(h => h.id)).toEqual([ALMA.id, ECLIPSE.id]);
  });

  it('empieza sin elemento y con "Sin elemento" como primera opción, seguida de elementos y estados', async () => {
    await crear();
    expect(component.elemento()?.clave).toEqual('none');
    expect(component.opcionesElemento.map(o => o.clave)).toEqual(
      ['none', 'fire', 'water', 'thunder', 'ice', 'dragon', 'poison', 'paralysis', 'sleep', 'blastblight']);
  });

  it('se abre con la configuración del arma Gogma ya equipada', async () => {
    await crear({ especial: 'sleep', habilidadesSet: [null, ALMA] });
    expect(component.elemento()?.clave).toEqual('sleep');
    expect(component.habilidad1()).toBeNull();
    expect(component.habilidad2()).toEqual(ALMA);
  });

  it('"Aceptar" solo se activa con un arma base, y devuelve la configuración (habilidades vacías incluidas)', async () => {
    await crear();
    const emitidas: ConfiguracionGogma[] = [];
    component.aceptar.subscribe(configuracion => emitidas.push(configuracion));
    const aceptar: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-aceptar');
    expect(aceptar.disabled).toBeTrue();

    component.base.set(ESPADA);
    fixture.detectChanges();
    expect(aceptar.disabled).toBeFalse();

    component.elemento.set(component.opcionesElemento.find(o => o.clave === 'water')!);
    component.habilidad2.set(ECLIPSE);
    aceptar.click();
    expect(emitidas).toEqual([{ especial: 'water', habilidadesSet: [null, ECLIPSE] }]);
  });

  it('muestra la interrogación hasta elegir el arma base, y avisa al pulsarla para elegirla', async () => {
    await crear();
    let pedida = false;
    component.cambiarBase.subscribe(() => (pedida = true));
    const imagen = () => fixture.nativeElement.querySelector('.gogma-base img').getAttribute('src');
    expect(imagen()).toEqual('images/recursos/armagogma.jpg');

    fixture.nativeElement.querySelector('.gogma-base').click();
    expect(pedida).toBeTrue();

    component.base.set(ESPADA);
    fixture.detectChanges();
    expect(imagen()).toEqual('images/arms/great-sword.png');
  });

  it('muestra los tres huecos de nivel 3 para gemas', async () => {
    await crear();
    const huecos = Array.from(fixture.nativeElement.querySelectorAll('.gogma-huecos .hueco')) as HTMLElement[];
    expect(huecos.map(h => h.textContent?.trim())).toEqual(['3', '3', '3']);
  });
});
