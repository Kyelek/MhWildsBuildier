import { Component, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

// 🚧 Aviso "En desarrollo" para funciones que todavía no existen (p. ej. las armas Gogma).
// Es un bloque de contenido sin marco propio: se puede meter dentro de un popup, de una
// tarjeta o de una página entera, y ocupa y centra todo el hueco que le den.
//
//   <app-en-desarrollo [titulo]="'weaponPicker.gogma' | translate" />
@Component({
  selector: 'app-en-desarrollo',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './en-desarrollo.component.html',
  styleUrl: './en-desarrollo.component.scss'
})
export class EnDesarrolloComponent {
  // Función a la que se refiere el aviso; si se omite solo se muestra "En desarrollo"
  readonly titulo = input('');
}
