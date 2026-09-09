import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BuilderComponent } from './features/builder/builder.component';
import { SkillForgeComponent } from './features/skill-forge/skill-forge.component';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, BuilderComponent, SkillForgeComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  // 🧭 Control de navegación reactivo
  readonly currentScreen = signal<'home' | 'builder' | 'skill-forge'>('home');

  // Método para cambiar de pestaña
  navigateTo(screen: 'home' | 'builder' | 'skill-forge'): void {
    this.currentScreen.set(screen);
  }
}