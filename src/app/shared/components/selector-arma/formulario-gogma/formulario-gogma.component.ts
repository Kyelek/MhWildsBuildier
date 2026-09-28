import { Component, computed, inject, input, linkedSignal, model, output } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { SkillInfo } from '../../../../core/models/wilds.models';
import { WildsApiService } from '../../../../core/services/wilds-api.service';
import {
  ClaveEspecial,
  ConfiguracionGogma,
  HUECOS_GOGMA,
  IMAGEN_GOGMA,
  OPCIONES_ESPECIAL,
  iconoTipoArma
} from '../../../models/tipos-arma.models';
import { SelectorBuscableComponent } from '../../selector-buscable/selector-buscable.component';

// Opción del desplegable "Elemento / Estado" (<app-selector-buscable> necesita id y name)
export interface OpcionElementoGogma {
  id: number;
  name: string; // Nombre ya traducido
  clave: ClaveEspecial;
  icono: string;
}

// ⚒️ Formulario del arma Gogma (pantalla "Arma Gogma" del popup de armas):
//   - A la izquierda, la imagen del tipo de arma. Al pulsarla se avisa a quien lo contiene
//     (ver dialogo-armas) para que muestre la rejilla de tipos y elegirlo. De momento el arma
//     Gogma no se basa en ningún arma concreta: solo en su tipo ("Martillo Gogma").
//   - A la derecha, el elemento o estado, dos habilidades de set distintas entre sí (las
//     mismas que el filtro de habilidades de set de las armaduras) y los tres huecos de
//     nivel 3 para gemas (de momento solo se muestran).
// "Aceptar" solo se activa con un tipo elegido; las habilidades pueden quedar vacías.
@Component({
  selector: 'app-formulario-gogma',
  standalone: true,
  imports: [TranslatePipe, SelectorBuscableComponent],
  templateUrl: './formulario-gogma.component.html',
  styleUrl: './formulario-gogma.component.scss'
})
export class FormularioGogmaComponent {
  private readonly wildsApi = inject(WildsApiService);
  private readonly translate = inject(TranslateService);

  // Tipo de arma: lo guarda quien contiene el formulario, que es quien muestra la rejilla
  readonly tipo = model<string | null>(null);
  // Configuración con la que se abre (al editar un arma Gogma ya equipada)
  readonly inicial = input<ConfiguracionGogma | null>(null);

  readonly cambiarTipo = output<void>();
  readonly aceptar = output<ConfiguracionGogma>();

  readonly imagenGogma = IMAGEN_GOGMA;
  readonly iconoTipo = iconoTipoArma;
  readonly huecos = HUECOS_GOGMA;

  // "Sin elemento" primero y después elementos y estados, con su nombre traducido (el idioma
  // no puede cambiar con el popup abierto)
  readonly opcionesElemento: OpcionElementoGogma[] = [
    ...OPCIONES_ESPECIAL.filter(opcion => opcion.clave === 'none'),
    ...OPCIONES_ESPECIAL.filter(opcion => opcion.clave !== 'none')
  ].map((opcion, id) => ({
    id,
    name: this.translate.instant(opcion.claveNombre) as string,
    clave: opcion.clave,
    icono: opcion.icono
  }));

  readonly elemento = linkedSignal<OpcionElementoGogma | null>(() => {
    const clave = this.inicial()?.especial ?? 'none';
    return this.opcionesElemento.find(opcion => opcion.clave === clave) ?? this.opcionesElemento[0];
  });
  readonly habilidad1 = linkedSignal<SkillInfo | null>(() => this.inicial()?.habilidadesSet[0] ?? null);
  readonly habilidad2 = linkedSignal<SkillInfo | null>(() => this.inicial()?.habilidadesSet[1] ?? null);

  // 🌐 Catálogo de armaduras (ya cacheado por el servicio): de él salen las habilidades de set
  readonly catalogo = rxResource({
    request: () => this.wildsApi.locale(),
    loader: ({ request }) => this.wildsApi.getArmor(request)
  });

  // Habilidades de set de cualquier pieza de armadura ("set" y "group" en la API: en el juego
  // son lo mismo), por orden alfabético
  readonly habilidadesSet = computed<SkillInfo[]>(() => {
    const porId = new Map<number, SkillInfo>();
    for (const pieza of this.catalogo.value() ?? []) {
      for (const { skill } of pieza.skills) {
        if (skill.kind === 'set' || skill.kind === 'group') porId.set(skill.id, skill);
      }
    }
    return [...porId.values()].sort((a, b) => a.name.localeCompare(b.name));
  });

  // Cada desplegable ofrece todas menos la elegida en el otro: nunca pueden repetirse
  readonly opcionesHabilidad1 = computed(() => this.sinLaElegida(this.habilidad2()));
  readonly opcionesHabilidad2 = computed(() => this.sinLaElegida(this.habilidad1()));

  confirmar(): void {
    const tipo = this.tipo();
    if (!tipo) return;
    this.aceptar.emit({
      tipo,
      especial: this.elemento()?.clave ?? 'none',
      habilidadesSet: [this.habilidad1(), this.habilidad2()]
    });
  }

  private sinLaElegida(elegida: SkillInfo | null): SkillInfo[] {
    return this.habilidadesSet().filter(habilidad => habilidad.id !== elegida?.id);
  }
}
