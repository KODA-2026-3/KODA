import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { MedicosService } from '../../../core/services/medicos.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

/**
 * Alta y edicion de cuentas de medico.
 * La ruta /admin/medicos/{id}/editar activa el modo edicion, que reutiliza el
 * mismo formulario sin la contrasena: esa se restablece por su propio flujo.
 */
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
        <span class="font-semibold text-navy-950">{{ titulo() }}</span>
      </nav>

      <h1 class="mt-3 text-3xl font-extrabold tracking-tight text-navy-950">
        {{ edicion() ? 'Editar Cuenta de Médico' : 'Crear Nueva Cuenta de Médico' }}
      </h1>

      @if (error()) {
        <div
          class="mt-6 flex items-start gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3.5"
          role="alert"
          aria-live="assertive"
        >
          <span class="mt-0.5 text-red-600"><app-icon name="alert-triangle" [size]="20" /></span>
          <p class="text-sm text-red-700">{{ error() }}</p>
        </div>
      }

      <form class="card mt-6 p-6 sm:p-8" [formGroup]="formulario" (ngSubmit)="guardar()">
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
                    placeholder="+57 300 123 4567"
                    class="field-input pl-11"
                  />
                </div>
              </div>
            </div>

            <div>
              <label class="field-label" for="institucion">Institución</label>
              <div class="relative">
                <span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <app-icon name="hospital" [size]="18" />
                </span>
                <input
                  id="institucion"
                  type="text"
                  formControlName="institucion"
                  placeholder="Ej. Centro Médico de Diagnóstico"
                  class="field-input pl-11"
                />
              </div>
            </div>
          </div>
        </section>

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

            @if (edicion()) {
              <p class="rounded-lg bg-navy-50 px-4 py-3 text-sm text-navy-800">
                La contraseña no se modifica desde aquí. El médico puede restablecerla desde
                "¿Olvidó su contraseña?" en el inicio de sesión.
              </p>
            } @else {
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
            }
          </div>
        </section>

        <div
          class="mt-8 flex flex-col gap-3 border-t border-surface-border pt-6 sm:flex-row sm:justify-between"
        >
          <a routerLink="/admin/medicos" class="btn-secondary px-6 py-2.5">Cancelar</a>
          <button type="submit" class="btn-primary px-6 py-2.5" [disabled]="guardando()">
            <app-icon name="check" [size]="18" />
            {{ guardando() ? 'Guardando…' : edicion() ? 'Guardar Cambios' : 'Guardar Cuenta' }}
          </button>
        </div>
      </form>
    </div>

    <app-modal [abierto]="exito()" [cerrableConVelo]="false" [etiqueta]="titulo()">
      <span
        class="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"
      >
        <app-icon name="check" [size]="30" />
      </span>
      <h2 class="text-2xl font-extrabold text-navy-950">
        {{ edicion() ? 'Cambios Guardados' : 'Cuenta Creada Exitosamente' }}
      </h2>
      <p class="mt-3 text-sm leading-relaxed text-slate-600">
        @if (edicion()) {
          Los datos de <strong>{{ nombreGuardado() }}</strong> se actualizaron correctamente.
        } @else {
          La cuenta para <strong>{{ nombreGuardado() }}</strong> ha sido creada. Se ha enviado un
          correo con las credenciales temporales a <strong>{{ correoGuardado() }}</strong
          >.
        }
      </p>
      <button type="button" class="btn-primary mt-6 w-full py-3" (click)="volver()">
        Volver a Gestión de Médicos
      </button>
    </app-modal>
  `
})
export class CrearMedicoComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly servicio = inject(MedicosService);
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);

  readonly id = signal<string | null>(null);
  readonly edicion = computed(() => this.id() !== null);
  readonly titulo = computed(() => (this.edicion() ? 'Editar Cuenta' : 'Crear Nueva Cuenta'));

  readonly guardando = signal(false);
  readonly exito = signal(false);
  readonly error = signal<string | null>(null);
  readonly verContrasena = signal(false);
  readonly nombreGuardado = signal('');
  readonly correoGuardado = signal('');

  readonly formulario = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    correo: ['', [Validators.required, Validators.email]],
    telefono: [''],
    institucion: [''],
    usuario: ['', Validators.required],
    contrasenaTemporal: ['', [Validators.required, Validators.minLength(8)]]
  });

  ngOnInit(): void {
    const id = this.ruta.snapshot.paramMap.get('id');
    if (!id) {
      return;
    }

    this.id.set(id);
    // En edición la contraseña no se envía, así que deja de ser obligatoria.
    this.formulario.controls.contrasenaTemporal.clearValidators();
    this.formulario.controls.contrasenaTemporal.updateValueAndValidity();

    this.servicio.obtener(id).subscribe({
      next: (m) =>
        this.formulario.patchValue({
          nombre: m.nombre,
          correo: m.correo,
          telefono: m.telefono ?? '',
          institucion: m.institucion ?? '',
          usuario: m.usuario
        }),
      error: (e: Error) => this.error.set(e.message)
    });
  }

  invalido(campo: keyof typeof this.formulario.controls): boolean {
    const control = this.formulario.controls[campo];
    return control.invalid && (control.dirty || control.touched);
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
    this.error.set(null);

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    const datos = this.formulario.getRawValue();
    const id = this.id();

    const peticion = id
      ? this.servicio.actualizar(id, {
          nombre: datos.nombre,
          correo: datos.correo,
          usuario: datos.usuario,
          telefono: datos.telefono,
          institucion: datos.institucion
        })
      : this.servicio.crear(datos);

    peticion.subscribe({
      next: (medico) => {
        this.guardando.set(false);
        this.nombreGuardado.set(medico.nombre);
        this.correoGuardado.set(medico.correo);
        this.exito.set(true);
      },
      error: (e: Error) => {
        this.guardando.set(false);
        this.error.set(e.message);
      }
    });
  }

  volver(): void {
    this.exito.set(false);
    void this.router.navigate(['/admin/medicos']);
  }
}
