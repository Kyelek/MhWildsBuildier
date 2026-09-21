import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'builder',
    loadComponent: () => import('./features/builder/builder.component').then(m => m.BuilderComponent)
  },
  {
    path: 'skill-forge',
    loadComponent: () => import('./features/skill-forge/skill-forge.component').then(m => m.SkillForgeComponent)
  },
  {
    path: '**',
    redirectTo: '' // Redirige al inicio si meten una URL rara
  }
];
