import { Component, ElementRef, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { WildsApiService } from '../../services/wilds-api.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
  host: {
    '(document:click)': 'onClickDocumento($event)',
    '(document:keydown.escape)': 'cerrarMenu()'
  }
})
export class NavbarComponent {
  private readonly translateService = inject(TranslateService);
  private readonly wildsApi = inject(WildsApiService);
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);

  /** 📱 Estado del menú desplegable en tablet/móvil (en escritorio no tiene efecto visual). */
  readonly menuAbierto = signal(false);

  useLanguage(language: string): void {
    this.translateService.use(language);
    // 🌐 Al cambiar el idioma de la UI, la API también debe devolver sus datos
    // (nombres de armas/armaduras, descripciones de habilidades...) en ese idioma.
    this.wildsApi.setLocaleFromUiLanguage(language);
    this.cerrarMenu();
  }

  alternarMenu(): void {
    this.menuAbierto.update(abierto => !abierto);
  }

  cerrarMenu(): void {
    this.menuAbierto.set(false);
  }

  /** Cierra el desplegable al pulsar en cualquier parte de la página fuera del navbar. */
  onClickDocumento(evento: MouseEvent): void {
    if (this.menuAbierto() && !this.elemento.nativeElement.contains(evento.target as Node)) {
      this.cerrarMenu();
    }
  }
}
