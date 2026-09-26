import { Component, computed, input, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { MonsterDetalle, RangoRecompensa } from '../../../../core/models/monster.models';
import { calcularPartes, recompensasPorRango } from '../../bestiario.datos';

// 📖 Página III de la tarjeta: partes rompibles/cortables (con su esencia de kinsecto) y
// los materiales que suelta el monstruo, filtrados por rango (alto por defecto).
@Component({
  selector: 'app-pagina-partes',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './pagina-partes.component.html',
  styleUrl: './pagina-partes.component.scss'
})
export class PaginaPartesComponent {
  readonly monstruo = input.required<MonsterDetalle>();

  readonly rango = signal<RangoRecompensa>('high');
  readonly rangos: readonly RangoRecompensa[] = ['low', 'high'];

  readonly partes = computed(() => calcularPartes(this.monstruo()));
  readonly recompensas = computed(() => recompensasPorRango(this.monstruo(), this.rango()));
}
