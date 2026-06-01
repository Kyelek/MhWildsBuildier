import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BuilderComponent } from './features/builder/builder.component';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, BuilderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  // 🧭 Control de navegación reactivo
  readonly currentScreen = signal<'home' | 'builder'>('home');

  // Método para cambiar de pestaña
  navigateTo(screen: 'home' | 'builder'): void {
    this.currentScreen.set(screen);
  }
}