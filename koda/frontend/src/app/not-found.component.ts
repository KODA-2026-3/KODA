import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <main class="flex min-h-screen flex-col items-center justify-center bg-surface-muted px-6 text-center">
      <p class="text-6xl font-extrabold tracking-tight text-navy-200">404</p>
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
