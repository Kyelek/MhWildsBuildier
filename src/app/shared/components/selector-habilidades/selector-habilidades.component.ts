import { Component, ElementRef, computed, input, model, signal, viewChild } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { OpcionHabilidad } from '../../models/filtros-armadura.models';
import { alternar, normalizar } from '../../utils/listas';

// 🏷️ Selector múltiple de habilidades para los paneles de filtros: un campo de texto que
// al enfocarlo (o al escribir) despliega debajo las habilidades que coinciden, y las
// elegidas quedan como chips con una X para quitarlas. Pensado para listas largas (hay
// más de 60 habilidades de armadura) donde una casilla por opción no cabría en el panel.
//
// La lista de sugerencias va dentro del flujo del panel (no flotando encima) para que el
// scroll del panel de filtros no la recorte.
@Component({
  selector: 'app-selector-habilidades',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './selector-habilidades.component.html',
  styleUrl: './selector-habilidades.component.scss'
})
export class SelectorHabilidadesComponent {
  readonly opciones = input<OpcionHabilidad[]>([]);
  readonly placeholder = input('');
  // Nombre de las habilidades elegidas que no están entre las opciones (p. ej. una
  // habilidad que no sale en ninguna pieza de esta ranura): así el chip sigue mostrando
  // su nombre en vez de desaparecer
  readonly nombres = input<ReadonlyMap<number, string>>(new Map());

  readonly seleccionadas = model<number[]>([]);

  readonly texto = signal('');
  readonly abierto = signal(false);

  private readonly campo = viewChild<ElementRef<HTMLInputElement>>('campo');

  // Opciones no elegidas que contienen el texto (sin distinguir mayúsculas ni tildes)
  readonly sugerencias = computed<OpcionHabilidad[]>(() => {
    const texto = normalizar(this.texto().trim());
    const elegidas = this.seleccionadas();
    return this.opciones().filter(opcion =>
      !elegidas.includes(opcion.id) && (!texto || normalizar(opcion.nombre).includes(texto)));
  });

  readonly chips = computed(() => {
    const porId = new Map(this.opciones().map(opcion => [opcion.id, opcion]));
    return this.seleccionadas().map(id => ({
      id,
      nombre: porId.get(id)?.nombre ?? this.nombres().get(id) ?? `#${id}`,
      total: porId.get(id)?.total ?? 0
    }));
  });

  // 🐛 Igual que en buscador-filtros: el <input> no enlaza [value] para no reescribir el
  // texto mientras se teclea; solo se vacía a mano tras elegir una habilidad.
  onInput(texto: string): void {
    this.texto.set(texto);
    this.abierto.set(true);
  }

  elegir(opcion: OpcionHabilidad): void {
    this.seleccionadas.update(ids => alternar(ids, opcion.id));
    this.vaciarCampo();
  }

  // Al salir del campo se cierran las sugerencias y se descarta lo escrito sin elegir: si
  // no, al volver al panel quedaría un texto suelto que ya no filtra nada
  onBlur(): void {
    this.abierto.set(false);
    this.vaciarCampo();
  }

  quitar(id: number): void {
    this.seleccionadas.update(ids => ids.filter(actual => actual !== id));
  }

  // Enter elige la primera sugerencia, como en cualquier autocompletado
  onEnter(evento: Event): void {
    const primera = this.sugerencias()[0];
    if (primera && this.abierto()) {
      evento.preventDefault();
      this.elegir(primera);
    }
  }

  // Escape cierra primero las sugerencias; si ya estaban cerradas deja que el evento
  // siga y cierre el panel de filtros
  onEscape(evento: Event): void {
    if (this.abierto()) {
      evento.stopPropagation();
      this.abierto.set(false);
    }
  }

  private vaciarCampo(): void {
    this.texto.set('');
    const campo = this.campo()?.nativeElement;
    if (campo) campo.value = '';
  }
}
