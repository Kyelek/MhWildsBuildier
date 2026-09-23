import { Component, ContentChild, ElementRef, TemplateRef, computed, effect, input, model, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { TranslatePipe } from '@ngx-translate/core';
import { GrupoDeOpciones, ItemSeleccionable } from '../../models/selector-buscable.models';

// 🎯 Selector genérico con buscador integrado, pensado para sustituir el patrón
// repetido "elegir un elemento de un catálogo con texto" que existía por separado
// en el Constructor y en la Forja de Habilidades. Cualquier feature nueva que lo
// necesite reutiliza este componente en vez de copiar el patrón otra vez.
//
// 🔍 El propio campo ES el buscador (patrón "combobox" con <mat-autocomplete>):
// no hay una caja de búsqueda aparte dentro de un desplegable. Al hacer click o
// tab, el texto actual queda seleccionado listo para sobreescribir; si el usuario
// no elige nada nuevo y sale del campo, se restaura el nombre que ya hubiera.
//
// El texto de cada opción es personalizable proyectando un <ng-template let-item>
// dentro de <app-selector-buscable>; si no se proyecta ninguno, se usa `item.name`.
@Component({
  selector: 'app-selector-buscable',
  standalone: true,
  imports: [CommonModule, MatFormFieldModule, MatInputModule, MatAutocompleteModule, TranslatePipe],
  templateUrl: './selector-buscable.component.html',
  styleUrl: './selector-buscable.component.scss'
})
export class SelectorBuscableComponent<T extends ItemSeleccionable> {
  // Catálogo ya acotado por el consumidor (p. ej. solo las piezas de la ranura "head")
  readonly elementos = input.required<T[]>();

  readonly etiqueta = input('');
  // Placeholder del campo cuando no hay nada seleccionado ni escrito todavía
  readonly textoBuscador = input('');
  readonly textoVacio = input('');

  // Muestra una opción extra (p. ej. "— Sin equipar —") que resuelve a `null`
  readonly permitirVacio = input(false);
  readonly etiquetaVacio = input('');

  // Si se indica, agrupa las opciones con <mat-optgroup> (p. ej. por tipo de arma).
  // Solo aparecen los grupos que tengan alguna opción tras aplicar el buscador.
  // 🌐 La etiqueta devuelta se muestra pasada por el pipe "translate": si es una clave
  // de traducción (p. ej. "weaponTypes.bow") sale en el idioma activo y se actualiza
  // sola al cambiarlo; si no lo es, ngx-translate la devuelve tal cual.
  readonly agruparPor = input<((elemento: T) => string) | null>(null);

  readonly valor = model<T | null>(null);

  @ContentChild(TemplateRef)
  readonly plantillaOpcion?: TemplateRef<{ $implicit: T }>;

  private readonly campoBusqueda = viewChild<ElementRef<HTMLInputElement>>('campoBusqueda');

  // Texto usado para filtrar el catálogo. 🐛 IMPORTANTE: el <input> del HTML NO tiene
  // un binding [value] reactivo a este signal -solo lee su valor real vía (input)-,
  // a propósito. Si se le añade [value]="textoBusqueda()", cada tecla que el usuario
  // escribe dispara un ciclo (evento input -> signal -> re-render -> el binding vuelve
  // a escribir el <input>.value), y ese "pisado" puede llegar reñido con lo que el
  // usuario sigue tecleando, corrompiendo el texto (se comprobó de verdad: al buscar
  // una segunda vez sobre un campo con texto ya seleccionado, aparecían mezclas como
  // "Rereyy" al escribir "rey"). Por eso el <input> se trata como "no controlado" para
  // teclear: solo se le fuerza el texto de forma IMPERATIVA (ver `fijarTexto`) cuando
  // hay que sincronizarlo desde fuera (selección nueva, o al cancelar la búsqueda).
  readonly textoBusqueda = signal('');

  constructor() {
    // Cuando el elemento seleccionado cambia desde fuera del campo -el usuario elige
    // uno nuevo, o se sustituye por su versión traducida al cambiar idioma (ver
    // "persistirSeleccionAlCambiarIdioma" en Builder/SkillForge)-, el campo muestra su
    // nombre. Mientras el usuario solo está escribiendo para buscar, `valor` no ha
    // cambiado todavía, así que este efecto no se dispara y no le "pisa" lo tecleado.
    effect(() => {
      this.fijarTexto(this.valor()?.name ?? '');
    });
  }

  // 🐛 IMPORTANTE: `grupos` agrupa SIEMPRE el catálogo COMPLETO (sin filtrar por
  // texto), y cada <mat-option>/<mat-optgroup> del HTML queda SIEMPRE montada en el
  // DOM: lo que hace el filtro de texto es ocultarlas con `coincide()` (ver abajo),
  // no añadirlas/quitarlas del @for. Se comprobó de verdad que, si el @for reacciona
  // directamente al texto filtrado (destruyendo y creando <mat-option> en cada
  // tecla), <mat-autocomplete> pierde la suscripción a la opción clicada nada más
  // cambiar la lista: el click seguía llegando al DOM (mousedown/mouseup/click se
  // registraban bien) pero el evento (optionSelected) dejaba de dispararse, así que
  // la selección con ratón simplemente no hacía nada (con teclado + Enter sí
  // funcionaba, porque ese flujo no depende del QueryList de opciones de la misma
  // forma). Mantener las opciones siempre montadas evita el problema de raíz.
  readonly grupos = computed<GrupoDeOpciones<T>[]>(() => {
    const agrupador = this.agruparPor();
    const elementos = this.elementos();

    if (!agrupador) {
      return [{ etiqueta: null, elementos }];
    }

    const porGrupo = new Map<string, T[]>();
    for (const elemento of elementos) {
      const clave = agrupador(elemento);
      const lista = porGrupo.get(clave);
      if (lista) {
        lista.push(elemento);
      } else {
        porGrupo.set(clave, [elemento]);
      }
    }
    return Array.from(porGrupo.entries()).map(([etiqueta, elementos]) => ({ etiqueta, elementos }));
  });

  // ¿Este elemento concreto coincide con el texto de búsqueda actual? Mientras el
  // campo siga mostrando el nombre íntegro de lo ya seleccionado (aún no se ha
  // tocado para buscar), todo coincide, para poder explorar el catálogo completo.
  coincide(elemento: T): boolean {
    const texto = this.textoBusqueda().trim().toLowerCase();
    const nombreActual = this.valor()?.name?.toLowerCase() ?? '';
    if (!texto || texto === nombreActual) return true;
    return elemento.name.toLowerCase().includes(texto);
  }

  // ¿Al menos un elemento de este grupo coincide? (para ocultar el <mat-optgroup>
  // entero cuando ninguno de sus elementos pasa el filtro)
  grupoTieneCoincidencias(grupo: GrupoDeOpciones<T>): boolean {
    return grupo.elementos.some(elemento => this.coincide(elemento));
  }

  // ¿Hay algún resultado en todo el catálogo tras el filtro? (para el mensaje de
  // "no se encontraron resultados")
  readonly hayResultados = computed(() => this.elementos().some(elemento => this.coincide(elemento)));

  onBusquedaInput(texto: string): void {
    this.textoBusqueda.set(texto);
  }

  onSelectionChange(elemento: T | null): void {
    this.valor.set(elemento);
  }

  // Selecciona todo el texto del campo: si ya había algo elegido, basta con empezar
  // a teclear para reemplazarlo de golpe y buscar.
  //
  // 🐛 FIX: al enfocar por CLICK, el navegador coloca el cursor en el punto exacto
  // del click DESPUÉS de disparar "focus" -así que un `campo.select()` en (focus)
  // quedaba sobreescrito, dejando el cursor suelto en vez de todo seleccionado (se
  // comprobó de verdad: al reabrir un campo ya relleno y escribir, cada letra se
  // INSERTABA ahí en vez de reemplazar, produciendo mezclas como "Rereyy"). Un primer
  // intento con (mouseup) + preventDefault() sí ganaba esa carrera, pero rompía OTRA
  // cosa: interfería con el propio mecanismo de Material para registrar el click en
  // una opción del panel (la selección dejaba de aplicarse). El evento (click) del
  // campo, en cambio, se dispara DESPUÉS de que el navegador ya terminó de posicionar
  // el cursor por el mousedown/mouseup -así que seleccionar ahí gana la carrera sin
  // necesidad de tocar preventDefault ni interferir con nada más. (focus) se mantiene
  // aparte para cubrir el foco por teclado (Tab), donde no hay click que reposicione
  // el cursor.
  onFocus(campo: HTMLInputElement): void {
    campo.select();
  }

  // Si el panel se cierra sin haber elegido nada nuevo, descartamos lo que se haya
  // escrito y restauramos el nombre de lo que ya estuviera seleccionado.
  //
  // 🐛 FIX: esto antes reaccionaba al "blur" del campo con un setTimeout adivinado
  // (probamos 0ms y luego 200ms). El problema de fondo: el navegador dispara "blur"
  // nada más hacer MOUSEDOWN sobre una opción (antes de soltar el botón), así que
  // cualquier temporizador fijo es una apuesta -si el usuario tarda más en soltar el
  // click de lo que dura el temporizador, `fijarTexto` ya ha reescrito
  // `textoBusqueda`, reapareciendo de golpe todas las opciones ocultas por el filtro
  // y desplazando el layout del panel MIENTRAS el ratón seguía pulsado: al soltarlo,
  // la opción original ya no estaba ahí y el click no se registraba. En vez de
  // adivinar un tiempo, escuchamos el propio evento (closed) de <mat-autocomplete>:
  // es Material quien decide cuándo el panel ha terminado de cerrarse de verdad
  // -tanto si fue por una selección como por hacer click fuera o pulsar Escape-, y
  // para entonces cualquier selección ya ha actualizado `valor` de forma síncrona.
  // Sin temporizadores que adivinar ni carreras que perder.
  onPanelCerrado(): void {
    this.fijarTexto(this.valor()?.name ?? '');
  }

  // Único punto que escribe el texto del campo "desde fuera" de la escritura del
  // usuario: actualiza el signal (para el filtrado) y el <input> del DOM a la vez.
  private fijarTexto(texto: string): void {
    this.textoBusqueda.set(texto);
    const elemento = this.campoBusqueda()?.nativeElement;
    if (elemento && elemento.value !== texto) {
      elemento.value = texto;
    }
  }
}
