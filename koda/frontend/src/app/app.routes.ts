import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { LayoutComponent } from './shared/components/layout/layout.component';

export const routes: Routes = [
	{
		path: 'login',
		loadComponent: () => import('./features/auth/login.component').then((module) => module.LoginComponent)
	},
	{
		path: '',
		canActivate: [authGuard],
		component: LayoutComponent,
		children: [
			{
				path: 'dashboard/inicio',
				loadComponent: () => import('./features/dashboard/dashboard.component').then((module) => module.DashboardComponent)
			},
			{
				path: 'radiografias/carga',
				loadComponent: () => import('./features/radiografias/radiografias.component').then((module) => module.RadiografiasComponent)
			},
			{
				path: 'resultados/reportes',
				loadComponent: () => import('./features/diagnostico/resultados.component').then((module) => module.ResultadosComponent)
			},
			{ path: '', pathMatch: 'full', redirectTo: 'dashboard/inicio' }
		]
	},
	{ path: '**', redirectTo: 'login' }
];
