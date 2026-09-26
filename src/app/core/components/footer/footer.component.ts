import { Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

// 🦶 Pie de página fijo de toda la web: aviso de marca de Capcom, enlace a la API
// de datos y redes del autor. Su altura sale de --altura-footer (src/styles.scss),
// que el contenedor principal reserva para que el contenido no quede tapado.
@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss'
})
export class FooterComponent {
  readonly urlGithub = 'https://github.com/Kyelek';
  readonly urlLinkedin = 'https://www.linkedin.com/in/francisco-eugenio-ibeas-aniceto/';
  readonly urlApi = 'https://docs.wilds.mhdb.io';
}
