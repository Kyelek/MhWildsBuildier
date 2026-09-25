import { Component, inject, input, model } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import { Weapon } from '../../../core/models/wilds.models';
import { DatosDialogoArmas, iconoTipoArma } from '../../models/tipos-arma.models';
import { DialogoArmasComponent } from './dialogo-armas/dialogo-armas.component';

// 🗡️ Botón para elegir arma: imita el aspecto de <app-selector-buscable> (campo con
// contorno, etiqueta y flecha ▾) pero, en lugar de desplegar una lista, abre un popup
// (ver dialogo-armas) donde se elige primero el tipo de arma y después el arma concreta.
// La selección se muestra en el propio botón junto al icono de su tipo.
@Component({
  selector: 'app-selector-arma',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './selector-arma.component.html',
  styleUrl: './selector-arma.component.scss'
})
export class SelectorArmaComponent {
  private readonly dialog = inject(MatDialog);

  readonly etiqueta = input('');
  // Muestra una X junto al botón para quitar el arma sin abrir el popup
  readonly permitirQuitar = input(false);

  readonly valor = model<Weapon | null>(null);

  readonly iconoTipo = iconoTipoArma;

  abrir(): void {
    const datos: DatosDialogoArmas = { seleccionada: this.valor() };

    this.dialog
      .open<DialogoArmasComponent, DatosDialogoArmas, Weapon>(DialogoArmasComponent, {
        data: datos,
        panelClass: 'dialogo-armas-panel',
        width: '760px',
        maxWidth: '95vw',
        height: '720px',
        maxHeight: '90vh',
        autoFocus: false // El propio popup decide qué enfocar (ver prepararLista)
      })
      .afterClosed()
      .subscribe(arma => {
        // Cerrar con la X, Escape o click fuera devuelve undefined: no cambia nada
        if (arma) this.valor.set(arma);
      });
  }

  quitar(): void {
    this.valor.set(null);
  }
}
