import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AnalisisService } from '../../core/services/analisis.service';
import { AuthService } from '../../core/services/auth.service';
import { IconComponent } from '../../shared/components/icon/icon.component';

/**
 * Ficha del profesional en sesion.
 * Pantalla sin mockup asociado: sigue los mismos patrones visuales del resto del modulo.
 */
@Component({
  selector: 'app-perfil',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  template: `
    @if (usuario(); as u) {
      <div class="mx-auto max-w-4xl">
        <h1 class="text-3xl font-extrabold tracking-tight text-navy-950">Mi Perfil</h1>
        <p class="mt-2 text-sm text-slate-600">
          Datos de la cuenta profesional registrada en KODA.
        </p>

        <section class="card mt-6 flex flex-col items-center gap-5 p-6 sm:flex-row sm:p-8">
          <span
            class="flex h-20 w-20 items-center justify-center rounded-full bg-navy-100 text-2xl font-extrabold text-navy-700"
            aria-hidden="true"
          >
            {{ u.iniciales }}
          </span>
          <div class="text-center sm:text-left">
            <p class="text-2xl font-extrabold tracking-tight text-navy-950">{{ u.nombre }}</p>
            <p class="mt-1 text-sm text-slate-600">{{ u.especialidad }}</p>
            <span class="badge mt-3 bg-emerald-100 text-emerald-800">
              <app-icon name="shield-check" [size]="14" />
              Cuenta verificada
            </span>
          </div>
        </section>

        <section class="card mt-6 p-6 sm:p-8">
          <h2 class="section-title">Datos de la cuenta</h2>
          <dl class="mt-4 grid gap-5 sm:grid-cols-2">
            @for (dato of datos(); track dato.etiqueta) {
              <div>
                <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {{ dato.etiqueta }}
                </dt>
                <dd class="mt-1 text-sm font-medium text-navy-950">{{ dato.valor }}</dd>
              </div>
            }
          </dl>
        </section>

        <section class="card mt-6 p-6 sm:p-8">
          <h2 class="section-title">Actividad</h2>
          <div class="mt-4 grid gap-4 sm:grid-cols-2">
            <div class="rounded-lg bg-surface-muted p-5">
              <p class="text-3xl font-extrabold text-navy-950">{{ totalAnalisis() }}</p>
              <p class="mt-1 text-sm text-slate-600">Análisis realizados</p>
            </div>
            <div class="rounded-lg bg-surface-muted p-5">
              <p class="text-3xl font-extrabold text-navy-950">{{ ultimoAnalisis() }}</p>
              <p class="mt-1 text-sm text-slate-600">Último análisis</p>
            </div>
          </div>
        </section>

        <div class="mt-6 flex flex-col gap-3 sm:flex-row">
          <a routerLink="/recuperar" class="btn-secondary px-6 py-2.5">
            <app-icon name="lock" [size]="18" />
            Cambiar contraseña
          </a>
          <a routerLink="/app/historial" class="btn-primary px-6 py-2.5">
            <app-icon name="file-text" [size]="18" />
            Ver historial de análisis
          </a>
        </div>
      </div>
    }
  `
})
export class PerfilComponent {
  private readonly auth = inject(AuthService);
  private readonly analisisService = inject(AnalisisService);

  readonly usuario = this.auth.usuario;

  datos(): { etiqueta: string; valor: string }[] {
    const u = this.usuario();
    if (!u) return [];
    return [
      { etiqueta: 'Nombre de usuario', valor: u.usuario },
      { etiqueta: 'Correo institucional', valor: u.correo },
      { etiqueta: 'Registro profesional', valor: u.matricula ?? 'No registrado' },
      { etiqueta: 'Institución', valor: u.institucion ?? 'No registrada' }
    ];
  }

  totalAnalisis(): number {
    return this.analisisService.total();
  }

  ultimoAnalisis(): string {
    return this.analisisService.analisis()[0]?.fecha ?? '—';
  }
}
