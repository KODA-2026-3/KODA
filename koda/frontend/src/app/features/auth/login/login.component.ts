import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';

@Component({
  selector: 'app-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, IconComponent],
  template: `
    <div class="grid min-h-screen lg:grid-cols-[minmax(0,44%)_minmax(0,56%)]">
      <!-- Panel institucional -->
      <section
        class="relative hidden flex-col justify-between overflow-hidden bg-navy-700 p-12 text-white lg:flex"
      >
        <svg
          class="pointer-events-none absolute -right-24 top-1/4 h-[520px] w-[520px] text-white/5"
          viewBox="0 0 100 100"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="50" cy="50" r="46" stroke="currentColor" stroke-width="1.5" />
          <path d="M4 96 96 4" stroke="currentColor" stroke-width="1.5" />
        </svg>

        <div class="relative">
          <span
            class="mb-8 flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-white"
          >
            <app-icon name="shield-check" [size]="26" />
          </span>
          <h1 class="text-5xl font-extrabold tracking-tight">KODA</h1>
          <h2 class="mt-6 max-w-md text-xl font-semibold leading-snug text-navy-100">
            Sistema de apoyo diagnóstico con inteligencia artificial
          </h2>
          <p class="mt-4 max-w-md text-sm leading-relaxed text-navy-200">
            Clasificación automática de severidad en artrosis de rodilla mediante la escala
            Kellgren-Lawrence a partir de radiografías digitales.
          </p>
        </div>

        <p class="relative flex items-start gap-2 text-xs leading-relaxed text-navy-200">
          <app-icon name="shield" [size]="16" />
          Cumplimiento estricto de estándares de privacidad de datos médicos HIPAA / GDPR.
        </p>
      </section>

      <!-- Formulario -->
      <section class="flex flex-col justify-center bg-white px-6 py-12 sm:px-16">
        <div class="mx-auto w-full max-w-md">
          @if (error()) {
            <div
              class="mb-8 flex gap-3 rounded-lg border border-red-300 bg-red-50 p-4"
              role="alert"
              aria-live="assertive"
            >
              <span class="mt-0.5 text-red-600"><app-icon name="alert-circle" [size]="18" /></span>
              <div>
                <p class="text-sm font-bold text-red-700">Error de autenticación</p>
                <p class="mt-0.5 text-sm text-red-600">{{ error() }}</p>
              </div>
            </div>
          }

          <h2 class="text-3xl font-extrabold tracking-tight text-navy-950">Iniciar sesión</h2>
          <p class="mt-2 text-sm text-slate-600">
            Acceda a su consola de análisis de radiología osteoarticular.
          </p>

          <form class="mt-8 space-y-5" [formGroup]="formulario" (ngSubmit)="enviar()">
            <div>
              <label class="field-label" for="correo">Usuario (Correo institucional)</label>
              <div class="relative">
                <span
                  class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"
                  [class]="error() ? 'text-red-500' : 'text-slate-400'"
                >
                  <app-icon name="mail" [size]="18" />
                </span>
                <input
                  id="correo"
                  type="email"
                  formControlName="correo"
                  autocomplete="username"
                  placeholder="ejemplo@hospital.org"
                  class="field-input pl-11"
                  [class.field-input-error]="!!error() || invalido('correo')"
                />
              </div>
              @if (invalido('correo')) {
                <p class="field-error">Ingrese un correo institucional válido.</p>
              }
            </div>

            <div>
              <label class="field-label" for="contrasena">Contraseña</label>
              <div class="relative">
                <span
                  class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2"
                  [class]="error() ? 'text-red-500' : 'text-slate-400'"
                >
                  <app-icon name="lock" [size]="18" />
                </span>
                <input
                  id="contrasena"
                  [type]="verContrasena() ? 'text' : 'password'"
                  formControlName="contrasena"
                  autocomplete="current-password"
                  placeholder="Ingrese su contraseña"
                  class="field-input pl-11 pr-28"
                  [class.field-input-error]="!!error() || invalido('contrasena')"
                />
                <button
                  type="button"
                  class="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 text-xs font-bold uppercase tracking-wide text-slate-500 hover:text-navy-700"
                  (click)="verContrasena.set(!verContrasena())"
                >
                  {{ verContrasena() ? 'Ocultar' : 'Mostrar' }}
                  <app-icon name="eye" [size]="16" />
                </button>
              </div>
              @if (invalido('contrasena')) {
                <p class="field-error">La contraseña es obligatoria.</p>
              }
            </div>

            <div class="flex items-center justify-between">
              <label class="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  formControlName="recordar"
                  class="h-4 w-4 rounded border-surface-border text-navy-700 focus:ring-navy-500"
                />
                Recordar sesión
              </label>
              <a routerLink="/recuperar" class="text-sm font-semibold text-navy-700 underline">
                ¿Olvidó su contraseña?
              </a>
            </div>

            <button type="submit" class="btn-primary w-full py-3" [disabled]="cargando()">
              {{ cargando() ? 'Verificando…' : 'Iniciar sesión' }}
            </button>
          </form>

          <p class="mt-14 border-t border-surface-border pt-6 text-center text-xs text-slate-500">
            KODA v2.0 · Uso exclusivo para profesionales de la salud autorizado.
          </p>
        </div>
      </section>
    </div>
  `
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);

  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly verContrasena = signal(false);

  readonly formulario = this.fb.nonNullable.group({
    correo: ['', [Validators.required, Validators.email]],
    contrasena: ['', Validators.required],
    recordar: [false]
  });

  invalido(campo: 'correo' | 'contrasena'): boolean {
    const control = this.formulario.controls[campo];
    return control.invalid && (control.dirty || control.touched);
  }

  enviar(): void {
    this.error.set(null);

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const { correo, contrasena, recordar } = this.formulario.getRawValue();
    this.cargando.set(true);

    this.auth.iniciarSesion(correo, contrasena, recordar).subscribe({
      next: (usuario) => {
        this.auth.establecerSesion(usuario, recordar);
        this.cargando.set(false);
        const destino =
          this.ruta.snapshot.queryParamMap.get('redirigir') ??
          (usuario.rol === 'ADMIN' ? '/admin/medicos' : '/app/cargar');
        void this.router.navigateByUrl(destino);
      },
      error: (e: Error) => {
        this.cargando.set(false);
        this.error.set(e.message);
      }
    });
  }
}
