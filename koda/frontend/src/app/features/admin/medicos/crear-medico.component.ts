import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { MedicosService } from '../../../core/services/medicos.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-crear-medico',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, IconComponent, ModalComponent],
  template: `
    <div class="mx-auto max-w-3xl">
      <nav class="flex items-center gap-2 text-sm" aria-label="Ruta de navegación">
        <a routerLink="/admin/medicos" class="font-semibold text-slate-500 hover:text-navy-700">
          Gestión de Médicos
        </a>
        <span class="text-slate-400"><app-icon name="chevron-right" [size]="14" /></span>
        <span class="font-semibold text-navy-950">Crear Nueva Cuenta</span>
      </nav>

      <h1 class="mt-3 text-3xl font-extrabold tracking-tight text-navy-950">
        Crear Nueva Cuenta de Médico
      </h1>

      <form class="card mt-6 p-6 sm:p-8" [formGroup]="formulario" (ngSubmit)="guardar()">
        <!-- Información personal -->
        <section>
          <h2 class="section-title">Información personal</h2>
          <div class="mt-4 space-y-5">
            <div>
              <label class="field-label" for="nombre">Nombre Completo</label>
              <div class="relative">
                <span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <app-icon name="user" [size]="18" />
                </span>
                <input
                  id="nombre"
                  type="text"
                  formControlName="nombre"
                  placeholder="Ej. Dr. Juan Pérez López"
                  class="field-input pl-11"
                  [class.field-input-error]="invalido('nombre')"
                />
              </div>
              @if (invalido('nombre')) {
                <p class="field-error">Ingrese el nombre completo del médico.</p>
              }
            </div>

            <div class="grid gap-5 sm:grid-cols-2">
              <div>
                <label class="field-label" for="correo">Correo Electrónico</label>
                <div class="relative">
                  <span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <app-icon name="mail" [size]="18" />
                  </span>
                  <input
                    id="correo"
                    type="email"
                    formControlName="correo"
                    placeholder="ejemplo@hospital.org"
                    class="field-input pl-11"
                    [class.field-input-error]="invalido('correo')"
                  />
                </div>
                @if (invalido('correo')) {
                  <p class="field-error">Ingrese un correo institucional válido.</p>
                }
              </div>

              <div>
                <label class="field-label" for="telefono">Teléfono</label>
                <div class="relative">
                  <span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <app-icon name="phone" [size]="18" />
                  </span>
                  <input
                    id="telefono"
                    type="tel"
                    formControlName="telefono"
                    placeholder="+52 55 1234 5678"
                    class="field-input pl-11"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Credenciales -->
        <section class="mt-8 border-t border-surface-border pt-8">
          <h2 class="section-title">Credenciales de acceso</h2>
          <div class="mt-4 space-y-5">
            <div>
              <label class="field-label" for="usuario">Nombre de Usuario</label>
              <div class="relative">
                <span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <app-icon name="at-sign" [size]="18" />
                </span>
                <input
                  id="usuario"
                  type="text"
                  formControlName="usuario"
                  placeholder="jperez"
                  class="field-input pl-11"
                  [class.field-input-error]="invalido('usuario')"
                />
              </div>
              <p class="field-hint">Este será el identificador único de acceso al sistema.</p>
              @if (invalido('usuario')) {
                <p class="field-error">Ingrese un nombre de usuario.</p>
              }
            </div>

            <div>
              <label class="field-label" for="contrasena">Contraseña Temporal</label>
              <div class="relative">
                <span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <app-icon name="lock" [size]="18" />
                </span>
                <input
                  id="contrasena"
                  [type]="verContrasena() ? 'text' : 'password'"
                  formControlName="contrasenaTemporal"
                  autocomplete="new-password"
                  class="field-input pl-11 pr-40"
                  [class.field-input-error]="invalido('contrasenaTemporal')"
                />
                <span class="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-3">
                  <button
                    type="button"
                    class="text-xs font-bold uppercase tracking-wide text-slate-500 hover:text-navy-700"
                    (click)="generarContrasena()"
                  >
                    Generar
                  </button>
                  <button
                    type="button"
                    class="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-slate-500 hover:text-navy-700"
                    (click)="verContrasena.set(!verContrasena())"
                  >
                    {{ verContrasena() ? 'Ocultar' : 'Mostrar' }}
                    <app-icon name="eye" [size]="16" />
                  </button>
                </span>
              </div>
              <p class="field-hint">
                El médico deberá cambiar esta contraseña en su primer inicio de sesión.
              </p>
              @if (invalido('contrasenaTemporal')) {
                <p class="field-error">La contraseña temporal debe tener al menos 8 caracteres.</p>
              }
            </div>
          </div>
        </section>

        <!-- Configuración -->
        <section class="mt-8 border-t border-surface-border pt-8">
          <h2 class="section-title">Configuración de cuenta</h2>

          <div class="mt-4 flex items-center justify-between gap-4">
            <div>
              <p class="text-sm font-semibold text-navy-950">Estado de la cuenta</p>
              <p class="text-sm text-slate-500">Define si la cuenta puede acceder inmediatamente</p>
            </div>
            <div class="flex items-center gap-2">
              <span
                class="text-sm font-bold"
                [class]="formulario.controls.activo.value ? 'text-emerald-600' : 'text-slate-500'"
              >
                {{ formulario.controls.activo.value ? 'Activo' : 'Inactivo' }}
              </span>
              <button
                type="button"
                role="switch"
                [attr.aria-checked]="formulario.controls.activo.value"
                aria-label="Estado de la cuenta"
                class="relative h-7 w-12 rounded-full transition-colors"
                [class]="formulario.controls.activo.value ? 'bg-emerald-500' : 'bg-slate-300'"
                (click)="alternarActivo()"
              >
                <span
                  class="absolute top-1 h-5 w-5 rounded-full bg-white transition-all"
                  [class]="formulario.controls.activo.value ? 'left-6' : 'left-1'"
                ></span>
              </button>
            </div>
          </div>

          <div class="mt-6">
            <label class="field-label" for="especialidad">Especialidad</label>
            <div class="relative">
              <select
                id="especialidad"
                formControlName="especialidad"
                class="field-input appearance-none pr-10"
                [class.field-input-error]="invalido('especialidad')"
              >
                <option value="">Seleccionar especialidad…</option>
                @for (e of especialidades; track e) {
                  <option [value]="e">{{ e }}</option>
                }
              </select>
              <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                <app-icon name="chevron-down" [size]="16" />
              </span>
            </div>
            <div class="mt-3 flex flex-wrap gap-2">
              @for (e of especialidades; track e) {
                <button
                  type="button"
                  class="rounded-md border border-surface-border px-3 py-1.5 text-xs font-medium transition-colors"
                  [class]="
                    formulario.controls.especialidad.value === e
                      ? 'border-navy-500 bg-navy-50 text-navy-700'
                      : 'bg-surface-muted text-slate-600 hover:bg-navy-50'
                  "
                  (click)="formulario.controls.especialidad.setValue(e)"
                >
                  {{ e }}
                </button>
              }
            </div>
            @if (invalido('especialidad')) {
              <p class="field-error">Seleccione una especialidad.</p>
            }
          </div>
        </section>

        <div class="mt-8 flex flex-col gap-3 border-t border-surface-border pt-6 sm:flex-row sm:justify-between">
          <a routerLink="/admin/medicos" class="btn-secondary px-6 py-2.5">Cancelar</a>
          <button type="submit" class="btn-primary px-6 py-2.5" [disabled]="guardando()">
            <app-icon name="check" [size]="18" />
            {{ guardando() ? 'Guardando…' : 'Guardar Cuenta' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Confirmación -->
    <app-modal [abierto]="creado()" [cerrableConVelo]="false" etiqueta="Cuenta creada exitosamente">
      <span
        class="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"
      >
        <app-icon name="check" [size]="30" />
      </span>
      <h2 class="text-2xl font-extrabold text-navy-950">Cuenta Creada Exitosamente</h2>
      <p class="mt-3 text-sm leading-relaxed text-slate-600">
        La cuenta para <strong>{{ nombreCreado() }}</strong> ha sido creada. Se ha enviado un correo
        con las credenciales temporales a <strong>{{ correoCreado() }}</strong
        >.
      </p>
      <button type="button" class="btn-primary mt-6 w-full py-3" (click)="volver()">
        Volver a Gestión de Médicos
      </button>
    </app-modal>
  `
})
export class CrearMedicoComponent {
  private readonly fb = inject(FormBuilder);
  private readonly servicio = inject(MedicosService);
  private readonly router = inject(Router);

  readonly especialidades = this.servicio.especialidades;
  readonly guardando = signal(false);
  readonly creado = signal(false);
  readonly verContrasena = signal(false);
  readonly nombreCreado = signal('');
  readonly correoCreado = signal('');

  readonly formulario = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    correo: ['', [Validators.required, Validators.email]],
    telefono: [''],
    usuario: ['', Validators.required],
    contrasenaTemporal: ['', [Validators.required, Validators.minLength(8)]],
    activo: [true],
    especialidad: ['', Validators.required]
  });

  invalido(campo: keyof typeof this.formulario.controls): boolean {
    const control = this.formulario.controls[campo];
    return control.invalid && (control.dirty || control.touched);
  }

  alternarActivo(): void {
    this.formulario.controls.activo.setValue(!this.formulario.controls.activo.value);
  }

  /** Genera una contrasena temporal aleatoria que cumple los requisitos minimos. */
  generarContrasena(): void {
    const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    const aleatorios = crypto.getRandomValues(new Uint32Array(12));
    const clave = Array.from(aleatorios, (n) => alfabeto[n % alfabeto.length]).join('');
    this.formulario.controls.contrasenaTemporal.setValue(clave);
    this.verContrasena.set(true);
  }

  guardar(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    const datos = this.formulario.getRawValue();

    this.servicio.crear(datos).subscribe((medico) => {
      this.guardando.set(false);
      this.nombreCreado.set(medico.nombre);
      this.correoCreado.set(medico.correo);
      this.creado.set(true);
    });
  }

  volver(): void {
    this.creado.set(false);
    this.formulario.reset({ activo: true });
    void this.router.navigate(['/admin/medicos']);
  }
}
