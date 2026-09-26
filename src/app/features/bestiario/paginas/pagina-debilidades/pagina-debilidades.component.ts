import { Component, computed, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { MonsterDetalle } from '../../../../core/models/monster.models';
import { COLUMNAS_ZONAS, agrupar, calcularDebilidades, calcularZonas } from '../../bestiario.datos';

// 📖 Página II de la tarjeta: debilidades/resistencias a elementos, estados y efectos,
// y tabla de zonas de daño (multiplicadores de cada parte).
@Component({
  selector: 'app-pagina-debilidades',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './pagina-debilidades.component.html',
  styleUrl: './pagina-debilidades.component.scss'
})
export class PaginaDebilidadesComponent {
  readonly monstruo = input.required<MonsterDetalle>();

  readonly columnasZonas = COLUMNAS_ZONAS;
  readonly debilidades = computed(() => agrupar(calcularDebilidades(this.monstruo()), fila => fila.tipo));
  readonly zonas = computed(() => calcularZonas(this.monstruo()));

  estrellas(nivel: number): string {
    return '★'.repeat(nivel);
  }

  // Zona débil: desde 45 en daño físico o 20 en elemental (criterio habitual de la
  // comunidad); en aturdimiento, las partes que lo permiten (100).
  esZonaDebil(clave: string, valor: number): boolean {
    if (['slash', 'blunt', 'pierce'].includes(clave)) return valor >= 45;
    return clave === 'stun' ? valor >= 100 : valor >= 20;
  }
}
