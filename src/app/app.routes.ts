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
    path: 'bestiario',
    loadComponent: () => import('./features/bestiario/bestiario.component').then(m => m.BestiarioComponent)
  },
  {
    path: '**',
    redirectTo: '' // Redirige al inicio si meten una URL rara
  }
];
