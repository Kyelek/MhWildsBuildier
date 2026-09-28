import { Component, computed, inject, input, model } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import {
  ArmaEquipada,
  DatosDialogoArmas,
  HUECOS_GOGMA,
  OPCIONES_ESPECIAL,
  OpcionEspecial,
  habilidadesSetDeGogma,
  iconoTipoArma
} from '../../models/tipos-arma.models';
import { CONFIG_DIALOGO_ARMAS, DialogoArmasComponent } from './dialogo-armas/dialogo-armas.component';

// 🗡️ Botón para elegir arma: imita el aspecto de <app-selector-buscable> (campo con
// contorno, etiqueta y flecha ▾) pero, en lugar de desplegar una lista, abre un popup
// (ver dialogo-armas) donde se elige primero el tipo de arma y después el arma concreta.
// La selección se muestra en el propio botón junto al icono de su tipo; si es un arma Gogma,
// con su elemento, sus habilidades de set y sus huecos como etiquetas.
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

  readonly valor = model<ArmaEquipada | null>(null);

  readonly iconoTipo = iconoTipoArma;
  readonly huecosGogma = HUECOS_GOGMA;
  readonly habilidadesSet = habilidadesSetDeGogma;

  // Elemento o estado elegido en un arma Gogma (null si es "Sin elemento" o no es Gogma)
  readonly especialGogma = computed<OpcionEspecial | null>(() => {
    const clave = this.valor()?.gogma?.especial;
    return clave && clave !== 'none' ? OPCIONES_ESPECIAL.find(opcion => opcion.clave === clave) ?? null : null;
  });

  abrir(): void {
    const datos: DatosDialogoArmas = { seleccionada: this.valor() };

    this.dialog
      .open<DialogoArmasComponent, DatosDialogoArmas, ArmaEquipada>(DialogoArmasComponent, { ...CONFIG_DIALOGO_ARMAS, data: datos })
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
