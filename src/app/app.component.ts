import {Component, inject, OnInit, signal} from '@angular/core';
import { CommonModule } from '@angular/common';
import { BuilderComponent } from './features/builder/builder.component';
import { SkillForgeComponent } from './features/skill-forge/skill-forge.component';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, BuilderComponent, SkillForgeComponent, TranslatePipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit{
  private readonly translateService = inject(TranslateService)
  // 🧭 Control de navegación reactivo
  readonly currentScreen = signal<'home' | 'builder' | 'skill-forge'>('home');

  ngOnInit() {
    // Add this to the store to set the user language.
    // Also check how to load all the translations first, because sometimes this cause the user can see the
    // keys like "home.header.title" instead of the translations
    this.translateService.use("es")
  }

  // Método para cambiar de pestaña
  navigateTo(screen: 'home' | 'builder' | 'skill-forge'): void {
    this.currentScreen.set(screen);
  }

  useLanguage(language: string): void {
    this.translateService.use(language)
  }
}
