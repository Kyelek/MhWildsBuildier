import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { WildsApiService } from '../../services/wilds-api.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent {
  private readonly translateService = inject(TranslateService);
  private readonly wildsApi = inject(WildsApiService);

  useLanguage(language: string): void {
    this.translateService.use(language);
    // 🌐 Al cambiar el idioma de la UI, la API también debe devolver sus datos
    // (nombres de armas/armaduras, descripciones de habilidades...) en ese idioma.
    this.wildsApi.setLocaleFromUiLanguage(language);
  }
}
