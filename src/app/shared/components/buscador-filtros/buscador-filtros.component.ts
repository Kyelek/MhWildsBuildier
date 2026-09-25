import { Component, ElementRef, HostListener, inject, input, model, output, signal, viewChild } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

// 🔍 Buscador con panel de filtros: un campo de texto con un botón de filtro al final
// (tres líneas de mayor a menor) que despliega un panel bajo el campo. El CONTENIDO del
// panel lo proyecta quien lo usa, así sirve para cualquier catálogo (armas, armaduras...):
//
//   <app-buscador-filtros [(texto)]="busqueda" [filtrosActivos]="n" [resultados]="total"
//                         (limpiar)="borrarFiltros()">
//     ...casillas, botones de orden, etc...
//   </app-buscador-filtros>
//
// El panel trae su propia cabecera con X (imprescindible en móvil, donde apenas hay hueco
// para cerrarlo pulsando fuera) y un pie con "Borrar filtros" y "Ver resultados (N)".
@Component({
  selector: 'app-buscador-filtros',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './buscador-filtros.component.html',
  styleUrl: './buscador-filtros.component.scss'
})
export class BuscadorFiltrosComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly placeholder = input('');
  // Número de filtros aplicados: se muestra sobre el botón para saber que la lista está
  // filtrada aunque el panel esté cerrado
  readonly filtrosActivos = input(0);
  // Resultados que quedan con los filtros actuales (para el botón "Ver resultados")
  readonly resultados = input<number | null>(null);

  // 🐛 El texto solo fluye del campo hacia fuera: el <input> NO enlaza [value] a este
  // modelo, porque reescribir el valor mientras se teclea puede corromper el texto (ver el
  // mismo problema documentado en selector-buscable.component.ts).
  readonly texto = model('');
  readonly limpiar = output<void>();

  readonly abierto = signal(false);

  private readonly campo = viewChild<ElementRef<HTMLInputElement>>('campo');

  alternarPanel(): void {
    this.abierto.update(abierto => !abierto);
  }

  cerrarPanel(): void {
    this.abierto.set(false);
  }

  onInput(texto: string): void {
    this.texto.set(texto);
  }

  enfocar(): void {
    this.campo()?.nativeElement.focus();
  }

  // Un click fuera del buscador (y de su panel) cierra el panel
  @HostListener('document:click', ['$event'])
  onClickDocumento(evento: MouseEvent): void {
    if (this.abierto() && !this.host.nativeElement.contains(evento.target as Node)) {
      this.cerrarPanel();
    }
  }

  // Escape cierra solo el panel. Se corta la propagación para que no llegue a un popup
  // contenedor (MatDialog también se cierra con Escape).
  @HostListener('keydown.escape', ['$event'])
  onEscape(evento: Event): void {
    if (this.abierto()) {
      evento.stopPropagation();
      this.cerrarPanel();
    }
  }
}
