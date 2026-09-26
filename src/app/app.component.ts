import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { NavbarComponent } from './core/components/navbar/navbar.component';
import { FooterComponent } from './core/components/footer/footer.component';
import { WildsApiService } from './core/services/wilds-api.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, FooterComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  private readonly translateService = inject(TranslateService);
  private readonly wildsApi = inject(WildsApiService);

  ngOnInit() {
    // Idioma por defecto de la aplicación al arrancar (ES). El Navbar es quien
    // cambia el idioma a partir de aquí, a través de WildsApiService.
    this.translateService.use('es');
    this.wildsApi.setLocaleFromUiLanguage('es');
  }
}
