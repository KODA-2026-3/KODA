import { Routes } from '@angular/router';

import { authGuard, invitadoGuard } from './core/guards/auth.guard';
import { LayoutComponent } from './shared/components/layout/layout.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    canActivate: [invitadoGuard],
    title: 'Iniciar sesión · KODA',
    loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent)
  },
  {
    path: 'recuperar',
    title: 'Recuperar contraseña · KODA',
    loadComponent: () =>
      import('./features/auth/recuperar/recuperar-password.component').then(
        (m) => m.RecuperarPasswordComponent
      )
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent) },
      {
        path: 'analisis/cargar',
        title: 'Cargar radiografía · KODA',
        loadComponent: () =>
          import('./features/radiografias/radiografias.component').then((m) => m.RadiografiasComponent)
      },
      {
        path: 'reportes',
        title: 'Resultados y reportes · KODA',
        loadComponent: () =>
          import('./features/diagnostico/resultados.component').then((m) => m.ResultadosComponent)
      }
    ]
  },
  { path: '**', loadComponent: () => import('./not-found.component').then((m) => m.NotFoundComponent) }
];