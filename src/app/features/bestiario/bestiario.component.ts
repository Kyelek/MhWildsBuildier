import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@ngx-translate/core';
import { WildsApiService } from '../../core/services/wilds-api.service';
import { MonsterResumen } from '../../core/models/monster.models';
import { SelectorBuscableComponent } from '../../shared/components/selector-buscable/selector-buscable.component';
import { TarjetaMonstruoComponent } from './tarjeta-monstruo/tarjeta-monstruo.component';
import { imagenMonstruo } from './bestiario.datos';

// 📖 Bestiario de bolsillo.
//  - Escritorio/tablet: índice de monstruos centrado; al elegir uno, el índice se pliega a
//    la izquierda y a la derecha se abre su tarjeta (ver TarjetaMonstruoComponent).
//  - Móvil: desplegable con buscador (el mismo que el de armas del Constructor) y la
//    tarjeta debajo.
// Nada se guarda en caché: la lista y cada ficha se piden a la API cuando hacen falta.
@Component({
  selector: 'app-bestiario',
  standalone: true,
  imports: [TranslatePipe, SelectorBuscableComponent, TarjetaMonstruoComponent],
  templateUrl: './bestiario.component.html',
  styleUrl: './bestiario.component.scss'
})
export class BestiarioComponent {
  private readonly wildsApi = inject(WildsApiService);

  readonly imagen = imagenMonstruo;

  readonly monstruosResource = rxResource({
    request: () => this.wildsApi.locale(),
    loader: ({ request }) => this.wildsApi.getMonstruosResumen(request)
  });

  // Ordenados alfabéticamente en el idioma actual
  readonly monstruos = computed(() =>
    [...(this.monstruosResource.value() ?? [])].sort((a, b) => a.name.localeCompare(b.name))
  );

  // Se guarda el id (estable entre idiomas) para no perder la selección al cambiar de idioma
  readonly idSeleccionado = signal<number | null>(null);

  readonly seleccionado = computed(() =>
    this.monstruos().find(monstruo => monstruo.id === this.idSeleccionado()) ?? null
  );

  seleccionar(monstruo: MonsterResumen | null): void {
    this.idSeleccionado.set(monstruo?.id ?? null);
  }

  cerrar(): void {
    this.idSeleccionado.set(null);
  }

  reintentar(): void {
    this.monstruosResource.reload();
  }
}
