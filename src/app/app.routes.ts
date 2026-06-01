import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    // 💡 Lazy Loading moderno utilizando promesas de JS (import)
    loadComponent: () => import('./features/builder/builder.component').then(m => m.BuilderComponent)
  },
  {
    path: '**',
    redirectTo: '' // Redirige al builder si meten una URL rara
  }
];