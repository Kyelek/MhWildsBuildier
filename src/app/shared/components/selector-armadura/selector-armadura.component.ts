import { Component, inject, input, model } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import { ArmorPiece } from '../../../core/models/wilds.models';
import {
  DatosDialogoArmaduras,
  FILTROS_ARMADURA_VACIOS,
  FiltrosArmadura,
  ICONOS_RANURA,
  RanuraArmadura
} from '../../models/filtros-armadura.models';
import { DialogoArmadurasComponent } from './dialogo-armaduras/dialogo-armaduras.component';

// 🛡️ Botón para elegir la pieza de una ranura (casco, pecho...): mismo aspecto que
// <app-selector-arma> y, como él, abre un popup (ver dialogo-armaduras) con buscador y
// filtros en vez de desplegar una lista.
//
// Los filtros se enlazan con [(filtros)] desde la página: si las 5 ranuras comparten el
// mismo signal, lo que se filtra en una (habilidades, rango...) sigue puesto en las demás.
@Component({
  selector: 'app-selector-armadura',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './selector-armadura.component.html',
  styleUrl: './selector-armadura.component.scss'
})
export class SelectorArmaduraComponent {
  private readonly dialog = inject(MatDialog);

  readonly ranura = input.required<RanuraArmadura>();
  // Muestra una X junto al botón para quitar la pieza sin abrir el popup
  readonly permitirQuitar = input(false);

  readonly valor = model<ArmorPiece | null>(null);
  readonly filtros = model<FiltrosArmadura>(FILTROS_ARMADURA_VACIOS);

  readonly iconos = ICONOS_RANURA;

  abrir(): void {
    const datos: DatosDialogoArmaduras = {
      ranura: this.ranura(),
      seleccionada: this.valor(),
      filtros: this.filtros
    };

    this.dialog
      .open<DialogoArmadurasComponent, DatosDialogoArmaduras, ArmorPiece>(DialogoArmadurasComponent, {
        data: datos,
        panelClass: 'dialogo-armas-panel',
        width: '760px',
        maxWidth: '95vw',
        height: '720px',
        maxHeight: '90vh',
        autoFocus: false // El propio popup enfoca el buscador (solo con ratón)
      })
      .afterClosed()
      .subscribe(pieza => {
        // Cerrar con la X, Escape o click fuera devuelve undefined: no cambia nada
        if (pieza) this.valor.set(pieza);
      });
  }

  quitar(): void {
    this.valor.set(null);
  }
}
