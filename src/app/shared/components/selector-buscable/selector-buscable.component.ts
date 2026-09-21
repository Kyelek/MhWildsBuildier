import { Component, ContentChild, TemplateRef, computed, input, model, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

// Cualquier catálogo consumido por este selector (armas, piezas de armadura...)
// necesita al menos un id estable y un nombre para poder buscarse/mostrarse.
export interface ItemSeleccionable {
  id: number;
  name: string;
}

interface GrupoDeOpciones<T> {
  etiqueta: string | null;
  items: T[];
}

// 🎯 Selector genérico con buscador interno, pensado para sustituir el patrón
// repetido "mat-select + caja de búsqueda + filtrado por texto" que existía por
// separado en el Constructor y en la Forja de Habilidades. Cualquier feature nueva
// que necesite "elegir un ítem de un catálogo con buscador" reutiliza este componente
// en vez de copiar el patrón otra vez.
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
  readonly items = input.required<T[]>();

  readonly label = input('');
  readonly searchPlaceholder = input('');
  readonly emptyText = input('');

  // Muestra una opción extra (p. ej. "— Sin equipar —") que resuelve a `null`
  readonly permitirVacio = input(false);
  readonly etiquetaVacio = input('');

  // Si se indica, agrupa las opciones con <mat-optgroup> (p. ej. por tipo de arma).
  // Solo aparecen los grupos que tengan alguna opción tras aplicar el buscador.
  readonly agruparPor = input<((item: T) => string) | null>(null);

  readonly value = model<T | null>(null);

  @ContentChild(TemplateRef)
  readonly plantillaOpcion?: TemplateRef<{ $implicit: T }>;

  readonly textoBusqueda = signal('');

  readonly itemsFiltrados = computed<T[]>(() => {
    const texto = this.textoBusqueda().trim().toLowerCase();
    const todos = this.items();
    if (!texto) return todos;
    return todos.filter(item => item.name.toLowerCase().includes(texto));
  });

  readonly grupos = computed<GrupoDeOpciones<T>[]>(() => {
    const agrupador = this.agruparPor();
    const items = this.itemsFiltrados();

    if (!agrupador) {
      return [{ etiqueta: null, items }];
    }

    const porGrupo = new Map<string, T[]>();
    for (const item of items) {
      const clave = agrupador(item);
      const lista = porGrupo.get(clave);
      if (lista) {
        lista.push(item);
      } else {
        porGrupo.set(clave, [item]);
      }
    }
    return Array.from(porGrupo.entries()).map(([etiqueta, items]) => ({ etiqueta, items }));
  });

  onBusquedaInput(valor: string): void {
    this.textoBusqueda.set(valor);
  }

  onSelectionChange(item: T | null): void {
    this.value.set(item);
  }
}
