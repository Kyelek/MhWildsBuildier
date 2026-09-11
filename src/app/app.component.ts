import {Component, inject, OnInit, signal} from '@angular/core';
import { CommonModule } from '@angular/common';
import { BuilderComponent } from './features/builder/builder.component';
import { SkillForgeComponent } from './features/skill-forge/skill-forge.component';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import { ApiLocale, WildsApiService } from './core/services/wilds-api.service';

// 🌐 El selector de idioma de la UI usa "jp" (nombre del fichero de traducción),
// pero la API de wilds.mhdb.io identifica el japonés como "ja". Este mapa traduce
// el idioma de la interfaz al locale real que hay que pedirle a la API.
const API_LOCALE_BY_LANGUAGE: Record<string, ApiLocale> = {
  es: 'es',
  en: 'en',
  jp: 'ja'
};

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, BuilderComponent, SkillForgeComponent, TranslatePipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit{
  private readonly translateService = inject(TranslateService)
  private readonly wildsApi = inject(WildsApiService);
  // 🧭 Control de navegación reactivo
  readonly currentScreen = signal<'home' | 'builder' | 'skill-forge'>('home');

  ngOnInit() {
    // Add this to the store to set the user language.
    // Also check how to load all the translations first, because sometimes this cause the user can see the
    // keys like "home.header.title" instead of the translations
    this.translateService.use("es")
    this.wildsApi.setLocale(API_LOCALE_BY_LANGUAGE['es']);
  }

  // Método para cambiar de pestaña
  navigateTo(screen: 'home' | 'builder' | 'skill-forge'): void {
    this.currentScreen.set(screen);
  }

  useLanguage(language: string): void {
    this.translateService.use(language)
    // 🌐 Al cambiar el idioma de la UI, la API también debe devolver sus datos
    // (nombres de armas/armaduras, descripciones de habilidades...) en ese idioma.
    this.wildsApi.setLocale(API_LOCALE_BY_LANGUAGE[language] ?? 'en');
  }
}
