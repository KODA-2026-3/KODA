import { Routes } from '@angular/router';

import { adminGuard, authGuard, invitadoGuard } from './core/guards/auth.guard';
import { ShellComponent } from './layout/shell/shell.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },

  {
    path: 'login',
    canActivate: [invitadoGuard],
    title: 'Iniciar sesión · KODA',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent)
  },
  {
    path: 'recuperar',
    title: 'Recuperar contraseña · KODA',
    loadComponent: () =>
      import('./features/auth/recuperar/recuperar-password.component').then(
        (m) => m.RecuperarPasswordComponent
      )
  },

  // Módulo del profesional médico
  {
    path: 'app',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'cargar' },
      {
        path: 'cargar',
        title: 'Cargar radiografía · KODA',
        loadComponent: () =>
          import('./features/diagnostico/cargar/cargar-radiografia.component').then(
            (m) => m.CargarRadiografiaComponent
          )
      },
      {
        path: 'analizando',
        title: 'Analizando radiografía · KODA',
        loadComponent: () =>
          import('./features/diagnostico/procesando/procesando.component').then(
            (m) => m.ProcesandoComponent
          )
      },
      {
        path: 'resultado/:id',
        title: 'Resultados del análisis · KODA',
        loadComponent: () =>
          import('./features/diagnostico/resultado/resultado.component').then(
            (m) => m.ResultadoComponent
          )
      },
      {
        path: 'historial',
        title: 'Historial de análisis · KODA',
        loadComponent: () =>
          import('./features/historial/historial.component').then((m) => m.HistorialComponent)
      },
      {
        path: 'perfil',
        title: 'Mi perfil · KODA',
        loadComponent: () => import('./features/perfil/perfil.component').then((m) => m.PerfilComponent)
      }
    ]
  },

  // Módulo administrativo
  {
    path: 'admin',
    component: ShellComponent,
    canActivate: [authGuard, adminGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'medicos' },
      {
        path: 'medicos',
        title: 'Gestión de médicos · KODA',
        loadComponent: () =>
          import('./features/admin/medicos/medicos.component').then((m) => m.MedicosComponent)
      },
      {
        path: 'medicos/nuevo',
        title: 'Crear cuenta de médico · KODA',
        loadComponent: () =>
          import('./features/admin/medicos/crear-medico.component').then(
            (m) => m.CrearMedicoComponent
          )
      },
      {
        path: 'configuracion',
        title: 'Configuración · KODA',
        loadComponent: () =>
          import('./features/admin/configuracion/configuracion.component').then(
            (m) => m.ConfiguracionComponent
          )
      }
    ]
  },

  { path: '**', redirectTo: 'login' }
];
