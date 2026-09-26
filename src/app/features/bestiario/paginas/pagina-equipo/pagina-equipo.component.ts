import { Component, computed, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ArmaRelacionada, ArmaduraRelacionada } from '../../../../core/models/monster.models';
import { TIPOS_ARMA, iconoTipoArma } from '../../../../shared/models/tipos-arma.models';
import { ICONOS_RANURA } from '../../../../shared/models/filtros-armadura.models';
import { agrupar } from '../../bestiario.datos';

// Tipos desconocidos (si la API añadiera alguno) al final
function ordenTipo(tipo: string): number {
  const indice = (TIPOS_ARMA as readonly string[]).indexOf(tipo);
  return indice === -1 ? TIPOS_ARMA.length : indice;
}

// 📖 Página V de la tarjeta: armas y armaduras relacionadas con el monstruo, en dos
// columnas. Solo descriptivo (de momento no se pueden seleccionar).
// Las peticiones viven en la tarjeta para no repetirlas cada vez que se vuelve a esta página.
@Component({
  selector: 'app-pagina-equipo',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './pagina-equipo.component.html',
  styleUrl: './pagina-equipo.component.scss'
})
export class PaginaEquipoComponent {
  readonly armas = input<ArmaRelacionada[]>([]);
  readonly armaduras = input<ArmaduraRelacionada[]>([]);
  readonly cargando = input(false);
  readonly error = input(false);
  readonly reintentar = output<void>();

  readonly iconoTipoArma = iconoTipoArma;
  readonly iconosRanura = ICONOS_RANURA;

  // Grupos en el mismo orden de tipos que el juego (y que el resto de la app)
  readonly armasPorTipo = computed(() =>
    agrupar(this.armas(), arma => arma.kind).sort((a, b) => ordenTipo(a.clave) - ordenTipo(b.clave))
  );
  readonly armadurasPorConjunto = computed(() => agrupar(this.armaduras(), pieza => pieza.armorSet.name));
}
