import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { LogoKodaComponent } from './shared/components/logo/logo-koda.component';

@Component({
  selector: 'app-not-found',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LogoKodaComponent],
  template: `
    <main class="flex min-h-screen flex-col items-center justify-center bg-surface-muted px-6 text-center">
      <app-logo-koda class="mb-6" [size]="96" />
      <p class="text-5xl font-extrabold tracking-tight text-navy-200">404</p>
      <h1 class="mt-4 text-2xl font-extrabold tracking-tight text-navy-950">
        Página no encontrada
      </h1>
      <p class="mt-2 max-w-sm text-sm leading-relaxed text-slate-600">
        La dirección que abrió no corresponde a ninguna sección de KODA.
      </p>
      <a routerLink="/login" class="btn-primary mt-6 px-6 py-2.5">Volver al inicio de sesión</a>
    </main>
  `
})
export class NotFoundComponent {}
