import { Component, ContentChild, TemplateRef, computed, input, model, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

// Cualquier catálogo consumido por este selector (armas, piezas de armadura...)
// necesita al menos un id estable y un "name" para poder buscarse/mostrarse: ese
// campo se llama igual que en el JSON de la API (ArmorPiece.name, Weapon.name),
// así que se deja en inglés a propósito en vez de traducirlo a "nombre".
export interface ItemSeleccionable {
  id: number;
  name: string;
}

interface GrupoDeOpciones<T> {
  etiqueta: string | null;
  elementos: T[];
}

// 🎯 Selector genérico con buscador interno, pensado para sustituir el patrón
// repetido "mat-select + caja de búsqueda + filtrado por texto" que existía por
// separado en el Constructor y en la Forja de Habilidades. Cualquier feature nueva
// que necesite "elegir un elemento de un catálogo con buscador" reutiliza este
// componente en vez de copiar el patrón otra vez.
//
// El texto de cada opción es personalizable proyectando un <ng-template let-item>
// dentro de <app-selector-buscable>; si no se proyecta ninguno, se usa `item.name`.
@Component({
  selector: 'app-selector-buscable',
  standalone: true,
  imports: [CommonModule, MatFormFieldModule, MatSelectModule],
  templateUrl: './selector-buscable.component.html',
  styleUrl: './selector-buscable.component.scss'
})
export class SelectorBuscableComponent<T extends ItemSeleccionable> {
  // Catálogo ya acotado por el consumidor (p. ej. solo las piezas de la ranura "head")
  readonly elementos = input.required<T[]>();

  readonly etiqueta = input('');
  readonly textoBuscador = input('');
  readonly textoVacio = input('');

  // Muestra una opción extra (p. ej. "— Sin equipar —") que resuelve a `null`
  readonly permitirVacio = input(false);
  readonly etiquetaVacio = input('');

  // Si se indica, agrupa las opciones con <mat-optgroup> (p. ej. por tipo de arma).
  // Solo aparecen los grupos que tengan alguna opción tras aplicar el buscador.
  readonly agruparPor = input<((elemento: T) => string) | null>(null);

  readonly valor = model<T | null>(null);

  @ContentChild(TemplateRef)
  readonly plantillaOpcion?: TemplateRef<{ $implicit: T }>;

  readonly textoBusqueda = signal('');

  readonly elementosFiltrados = computed<T[]>(() => {
    const texto = this.textoBusqueda().trim().toLowerCase();
    const todos = this.elementos();
    if (!texto) return todos;
    return todos.filter(elemento => elemento.name.toLowerCase().includes(texto));
  });

  readonly grupos = computed<GrupoDeOpciones<T>[]>(() => {
    const agrupador = this.agruparPor();
    const elementos = this.elementosFiltrados();

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

  onBusquedaInput(valor: string): void {
    this.textoBusqueda.set(valor);
  }

  onSelectionChange(elemento: T | null): void {
    this.valor.set(elemento);
  }
}
