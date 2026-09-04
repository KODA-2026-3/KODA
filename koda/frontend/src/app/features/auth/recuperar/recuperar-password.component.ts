import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

interface Requisito {
  etiqueta: string;
  cumple: (valor: string) => boolean;
}

/** Valida que ambas contrasenas coincidan. */
function contrasenasIguales(grupo: AbstractControl): ValidationErrors | null {
  const nueva = grupo.get('nueva')?.value;
  const confirmacion = grupo.get('confirmacion')?.value;
  return nueva && confirmacion && nueva !== confirmacion ? { noCoinciden: true } : null;
}

@Component({
  selector: 'app-recuperar-password',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, IconComponent, ModalComponent],
  template: `
    <div class="grid min-h-screen lg:grid-cols-[minmax(0,44%)_minmax(0,56%)]">
      <!-- Panel institucional -->
      <section
        class="relative hidden flex-col justify-between overflow-hidden bg-navy-700 p-12 text-white lg:flex"
      >
        <div class="relative">
          <div class="mb-16 flex items-center gap-3">
            <span
              class="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white"
            >
              <app-icon name="shield-check" [size]="22" />
            </span>
            <span class="text-xl font-extrabold tracking-tight">KODA</span>
          </div>
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
          <!-- Indicador de pasos -->
          <ol class="mb-10 flex items-center justify-between text-xs font-semibold">
            @for (p of pasos; track p.numero) {
              <li
                class="flex items-center gap-1.5"
                [class]="paso() >= p.numero ? 'text-navy-700' : 'text-slate-400'"
                [attr.aria-current]="paso() === p.numero ? 'step' : null"
              >
                {{ p.numero }}. {{ p.etiqueta }}
                @if (paso() > p.numero) {
                  <span class="text-emerald-600"><app-icon name="check" [size]="14" /></span>
                }
              </li>
            }
          </ol>

          @if (paso() === 1) {
            <h2 class="text-3xl font-extrabold tracking-tight text-navy-950">
              Recuperar contraseña
            </h2>
            <p class="mt-2 text-sm text-slate-600">
              Ingrese su correo institucional. Le enviaremos un enlace para restablecer el acceso.
            </p>

            <form class="mt-8 space-y-5" [formGroup]="formIdentidad" (ngSubmit)="enviarIdentidad()">
              <div>
                <label class="field-label" for="correo">Correo institucional</label>
                <div class="relative">
                  <span
                    class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    <app-icon name="mail" [size]="18" />
                  </span>
                  <input
                    id="correo"
                    type="email"
                    formControlName="correo"
                    placeholder="ejemplo@hospital.org"
                    class="field-input pl-11"
                  />
                </div>
                @if (formIdentidad.controls.correo.touched && formIdentidad.controls.correo.invalid) {
                  <p class="field-error">Ingrese un correo institucional válido.</p>
                }
              </div>

              <button type="submit" class="btn-primary w-full py-3" [disabled]="cargando()">
                {{ cargando() ? 'Enviando…' : 'Enviar enlace de recuperación' }}
              </button>
              <a routerLink="/login" class="btn-secondary w-full py-3">Volver al inicio de sesión</a>
            </form>
          } @else {
            <h2 class="text-3xl font-extrabold tracking-tight text-navy-950">
              Restablecer contraseña
            </h2>
            <p class="mt-2 text-sm text-slate-600">
              Defina una contraseña segura que cumpla con los estándares de seguridad.
            </p>

            <form class="mt-8 space-y-5" [formGroup]="formContrasena" (ngSubmit)="actualizar()">
              <div>
                <label class="field-label" for="nueva">Nueva contraseña</label>
                <div class="relative">
                  <span
                    class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    <app-icon name="lock" [size]="18" />
                  </span>
                  <input
                    id="nueva"
                    [type]="verNueva() ? 'text' : 'password'"
                    formControlName="nueva"
                    autocomplete="new-password"
                    placeholder="Ingrese la nueva contraseña"
                    class="field-input pl-11 pr-28"
                  />
                  <button
                    type="button"
                    class="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 text-xs font-bold uppercase tracking-wide text-slate-500 hover:text-navy-700"
                    (click)="verNueva.set(!verNueva())"
                  >
                    {{ verNueva() ? 'Ocultar' : 'Mostrar' }}
                    <app-icon name="eye" [size]="16" />
                  </button>
                </div>
              </div>

              <!-- Medidor de fortaleza -->
              <div>
                <div class="flex justify-between text-xs font-medium text-slate-500">
                  <span>Débil</span>
                  <span>Fuerte</span>
                </div>
                <div class="mt-1.5 grid grid-cols-4 gap-1.5" role="img" [attr.aria-label]="'Fortaleza de la contraseña: ' + fortaleza() + ' de 4'">
                  @for (nivel of [1, 2, 3, 4]; track nivel) {
                    <span
                      class="h-1.5 rounded-full transition-colors"
                      [class]="fortaleza() >= nivel ? colorFortaleza() : 'bg-slate-200'"
                    ></span>
                  }
                </div>
              </div>

              <!-- Requisitos -->
              <div class="rounded-lg bg-navy-50 p-4">
                <p class="section-title mb-2">Requisitos de seguridad</p>
                <ul class="space-y-1.5">
                  @for (r of requisitos; track r.etiqueta) {
                    <li
                      class="flex items-center gap-2 text-xs"
                      [class]="r.cumple(nueva()) ? 'text-emerald-700' : 'text-slate-500'"
                    >
                      <app-icon [name]="r.cumple(nueva()) ? 'check' : 'x'" [size]="14" />
                      {{ r.etiqueta }}
                    </li>
                  }
                </ul>
              </div>

              <div>
                <label class="field-label" for="confirmacion">Confirmar contraseña</label>
                <div class="relative">
                  <span
                    class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    <app-icon name="lock" [size]="18" />
                  </span>
                  <input
                    id="confirmacion"
                    [type]="verConfirmacion() ? 'text' : 'password'"
                    formControlName="confirmacion"
                    autocomplete="new-password"
                    placeholder="Repita la nueva contraseña"
                    class="field-input pl-11 pr-28"
                    [class.field-input-error]="noCoinciden()"
                  />
                  <button
                    type="button"
                    class="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 text-xs font-bold uppercase tracking-wide text-slate-500 hover:text-navy-700"
                    (click)="verConfirmacion.set(!verConfirmacion())"
                  >
                    {{ verConfirmacion() ? 'Ocultar' : 'Mostrar' }}
                    <app-icon name="eye" [size]="16" />
                  </button>
                </div>
                @if (noCoinciden()) {
                  <p class="field-error">Las contraseñas no coinciden.</p>
                }
              </div>

              <button
                type="submit"
                class="btn-primary w-full py-3"
                [disabled]="cargando() || formContrasena.invalid"
              >
                {{ cargando() ? 'Actualizando…' : 'Actualizar contraseña' }}
              </button>
            </form>
          }

          <p class="mt-14 border-t border-surface-border pt-6 text-center text-xs text-slate-500">
            KODA v2.0 · Uso exclusivo para profesionales de la salud autorizado.
          </p>
        </div>
      </section>
    </div>

    <!-- Confirmación -->
    <app-modal
      [abierto]="exito()"
      [cerrableConVelo]="false"
      etiqueta="Contraseña actualizada"
    >
      <span
        class="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"
      >
        <app-icon name="check-double" [size]="30" />
      </span>
      <h2 class="text-2xl font-extrabold text-navy-950">Contraseña actualizada</h2>
      <p class="mt-3 text-sm leading-relaxed text-slate-600">
        Su contraseña ha sido modificada de manera exitosa.<br />
        Será redirigido al inicio de sesión en unos instantes.
      </p>
      <a routerLink="/login" class="btn mt-6 w-full bg-navy-100 py-3 text-navy-700 hover:bg-navy-200">
        Volver al inicio de sesión
      </a>
      <p class="mt-3 text-xs text-slate-500">
        Redirigiendo automáticamente en {{ segundos() }}s…
      </p>
    </app-modal>
  `
})
export class RecuperarPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly pasos = [
    { numero: 1, etiqueta: 'Identidad' },
    { numero: 2, etiqueta: 'Nueva contraseña' },
    { numero: 3, etiqueta: 'Confirmación' }
  ];

  readonly requisitos: Requisito[] = [
    { etiqueta: 'Mínimo 8 caracteres', cumple: (v) => v.length >= 8 },
    { etiqueta: 'Al menos una letra mayúscula', cumple: (v) => /[A-ZÁÉÍÓÚÑ]/.test(v) },
    { etiqueta: 'Al menos un número', cumple: (v) => /\d/.test(v) },
    {
      etiqueta: 'Al menos un carácter especial (p. ej. ! @ # $ %)',
      cumple: (v) => /[^A-Za-z0-9]/.test(v)
    }
  ];

  readonly paso = signal(1);
  readonly cargando = signal(false);
  readonly exito = signal(false);
  readonly segundos = signal(3);
  readonly verNueva = signal(false);
  readonly verConfirmacion = signal(false);
  readonly nueva = signal('');

  readonly formIdentidad = this.fb.nonNullable.group({
    correo: ['', [Validators.required, Validators.email]]
  });

  readonly formContrasena = this.fb.nonNullable.group(
    {
      nueva: ['', [Validators.required, Validators.minLength(8)]],
      confirmacion: ['', Validators.required]
    },
    { validators: contrasenasIguales }
  );

  readonly fortaleza = computed(
    () => this.requisitos.filter((r) => r.cumple(this.nueva())).length
  );

  readonly colorFortaleza = computed(() => {
    switch (this.fortaleza()) {
      case 0:
      case 1:
        return 'bg-red-500';
      case 2:
        return 'bg-amber-500';
      case 3:
        return 'bg-lime-500';
      default:
        return 'bg-emerald-600';
    }
  });

  constructor() {
    this.formContrasena.controls.nueva.valueChanges.subscribe((v) => this.nueva.set(v ?? ''));
  }

  noCoinciden(): boolean {
    const confirmacion = this.formContrasena.controls.confirmacion;
    return this.formContrasena.hasError('noCoinciden') && confirmacion.touched;
  }

  enviarIdentidad(): void {
    if (this.formIdentidad.invalid) {
      this.formIdentidad.markAllAsTouched();
      return;
    }
    this.cargando.set(true);
    this.auth.solicitarRecuperacion(this.formIdentidad.controls.correo.value).subscribe(() => {
      this.cargando.set(false);
      this.paso.set(2);
    });
  }

  actualizar(): void {
    if (this.formContrasena.invalid) {
      this.formContrasena.markAllAsTouched();
      return;
    }
    this.cargando.set(true);

    this.auth
      .restablecerContrasena(
        this.formIdentidad.controls.correo.value,
        this.formContrasena.controls.nueva.value
      )
      .subscribe(() => {
        this.cargando.set(false);
        this.paso.set(3);
        this.exito.set(true);
        this.iniciarCuentaRegresiva();
      });
  }

  private iniciarCuentaRegresiva(): void {
    const intervalo = setInterval(() => {
      this.segundos.update((s) => s - 1);
      if (this.segundos() <= 0) {
        clearInterval(intervalo);
        void this.router.navigate(['/login']);
      }
    }, 1000);
  }
}
