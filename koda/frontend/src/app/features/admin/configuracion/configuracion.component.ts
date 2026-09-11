import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { environment } from '../../../../environments/environment';
import {
  CONFIGURACION_POR_DEFECTO,
  ConfiguracionService,
  ConfiguracionSistema,
  VistaResultado
} from '../../../core/services/configuracion.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';

/**
 * Parametros de operacion del sistema (rol administrador).
 * Lo que se guarda aqui afecta a la carga de radiografias, a la lectura de
 * resultados y al historial.
 */
@Component({
  selector: 'app-configuracion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IconComponent],
  template: `
    <div class="mx-auto max-w-3xl">
      <h1 class="text-3xl font-extrabold tracking-tight text-navy-950">Configuración</h1>
      <p class="mt-2 text-sm text-slate-600">
        Parámetros de operación del sistema. Los cambios aplican a todos los profesionales.
      </p>

      @if (guardado()) {
        <div
          class="mt-6 flex items-center gap-3 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3.5"
          role="status"
        >
          <span class="text-emerald-600"><app-icon name="check" [size]="20" /></span>
          <p class="text-sm font-medium text-emerald-800">Configuración guardada correctamente.</p>
        </div>
      }

      <!-- Carga de radiografías -->
      <section class="card mt-6 p-6 sm:p-8">
        <h2 class="section-title">Carga de radiografías</h2>

        <div class="mt-5">
          <label class="field-label" for="tamano">Tamaño máximo por archivo</label>
          <div class="flex items-center gap-3">
            <input
              id="tamano"
              type="number"
              min="1"
              max="100"
              class="field-input w-28"
              [ngModel]="borrador().tamanoMaximoMb"
              (ngModelChange)="cambiar('tamanoMaximoMb', +$event)"
            />
            <span class="text-sm text-slate-600">MB</span>
          </div>
          <p class="field-hint">
            Las radiografías que superen este tamaño se rechazan al cargarlas.
          </p>
        </div>

        <div class="mt-6">
          <span class="field-label">Formatos aceptados</span>
          <div class="flex flex-wrap gap-4">
            @for (f of formatos; track f.mime) {
              <label class="flex items-center gap-2 text-sm text-navy-950">
                <input
                  type="checkbox"
                  class="h-4 w-4 rounded border-surface-border text-navy-700 focus:ring-navy-500"
                  [ngModel]="borrador().formatosAceptados.includes(f.mime)"
                  (ngModelChange)="alternarFormato(f.mime, $event)"
                />
                {{ f.etiqueta }}
              </label>
            }
          </div>
          @if (borrador().formatosAceptados.length === 0) {
            <p class="field-error">Debe aceptarse al menos un formato.</p>
          }
        </div>
      </section>

      <!-- Lectura de resultados -->
      <section class="card mt-6 p-6 sm:p-8">
        <h2 class="section-title">Lectura de resultados</h2>

        <div class="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <label class="field-label" for="alta">Umbral de confianza alta</label>
            <div class="flex items-center gap-3">
              <input
                id="alta"
                type="number"
                min="1"
                max="100"
                class="field-input w-28"
                [ngModel]="borrador().umbralConfianzaAlta"
                (ngModelChange)="cambiar('umbralConfianzaAlta', +$event)"
              />
              <span class="text-sm text-slate-600">%</span>
            </div>
            <p class="field-hint">Desde este valor el resultado se rotula "Confianza alta".</p>
          </div>

          <div>
            <label class="field-label" for="media">Umbral de confianza media</label>
            <div class="flex items-center gap-3">
              <input
                id="media"
                type="number"
                min="1"
                max="100"
                class="field-input w-28"
                [ngModel]="borrador().umbralConfianzaMedia"
                (ngModelChange)="cambiar('umbralConfianzaMedia', +$event)"
              />
              <span class="text-sm text-slate-600">%</span>
            </div>
            <p class="field-hint">Por debajo de este valor se rotula "Confianza baja".</p>
          </div>
        </div>

        @if (umbralesInvalidos()) {
          <p class="field-error">
            El umbral de confianza alta debe ser mayor que el de confianza media.
          </p>
        }

        <div class="mt-6">
          <span class="field-label">Vista predeterminada del análisis</span>
          <div class="grid max-w-md grid-cols-2 gap-2">
            @for (v of vistas; track v.valor) {
              <button
                type="button"
                class="rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors"
                [class]="
                  borrador().vistaPredeterminada === v.valor
                    ? 'border-navy-500 bg-navy-700 text-white'
                    : 'border-surface-border bg-white text-slate-600 hover:bg-navy-50'
                "
                (click)="cambiar('vistaPredeterminada', v.valor)"
              >
                {{ v.etiqueta }}
              </button>
            }
          </div>
          <p class="field-hint">Pestaña que se abre primero al consultar un resultado.</p>
        </div>
      </section>

      <!-- Historial -->
      <section class="card mt-6 p-6 sm:p-8">
        <h2 class="section-title">Historial</h2>
        <div class="mt-5">
          <label class="field-label" for="porPagina">Análisis por página</label>
          <select
            id="porPagina"
            class="field-input w-40"
            [ngModel]="borrador().analisisPorPagina"
            (ngModelChange)="cambiar('analisisPorPagina', +$event)"
          >
            @for (n of opcionesPorPagina; track n) {
              <option [value]="n">{{ n }}</option>
            }
          </select>
        </div>
      </section>

      <!-- Servicios (solo lectura) -->
      <section class="card mt-6 p-6 sm:p-8">
        <h2 class="section-title">Servicios conectados</h2>
        <dl class="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">API</dt>
            <dd class="mt-1 font-mono text-sm text-navy-950">{{ apiUrl }}</dd>
          </div>
          <div>
            <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Servicio de inferencia
            </dt>
            <dd class="mt-1 font-mono text-sm text-navy-950">{{ inferenciaUrl }}</dd>
          </div>
        </dl>
        <p class="field-hint">
          Estas direcciones se definen en la configuración de despliegue, no desde la interfaz.
        </p>
      </section>

      <div
        class="mt-6 flex flex-col gap-3 border-t border-surface-border pt-6 sm:flex-row sm:justify-between"
      >
        <button type="button" class="btn-secondary px-6 py-2.5" (click)="restablecer()">
          Restablecer valores por defecto
        </button>
        <button
          type="button"
          class="btn-primary px-6 py-2.5"
          [disabled]="!hayCambios() || umbralesInvalidos() || sinFormatos()"
          (click)="guardar()"
        >
          <app-icon name="check" [size]="18" />
          Guardar cambios
        </button>
      </div>
    </div>
  `
})
export class ConfiguracionComponent {
  private readonly servicio = inject(ConfiguracionService);

  readonly apiUrl = environment.apiBaseUrl;
  readonly inferenciaUrl = environment.inferenceUrl;

  readonly formatos = [
    { mime: 'image/jpeg', etiqueta: 'JPEG' },
    { mime: 'image/png', etiqueta: 'PNG' }
  ];

  readonly vistas: { valor: VistaResultado; etiqueta: string }[] = [
    { valor: 'ORIGINAL', etiqueta: 'Radiografía original' },
    { valor: 'HEATMAP', etiqueta: 'Mapa de calor' }
  ];

  readonly opcionesPorPagina = [6, 10, 20, 50];

  readonly borrador = signal<ConfiguracionSistema>({ ...this.servicio.configuracion() });
  readonly guardado = signal(false);

  readonly hayCambios = computed(
    () => JSON.stringify(this.borrador()) !== JSON.stringify(this.servicio.configuracion())
  );

  readonly umbralesInvalidos = computed(
    () => this.borrador().umbralConfianzaAlta <= this.borrador().umbralConfianzaMedia
  );

  sinFormatos(): boolean {
    return this.borrador().formatosAceptados.length === 0;
  }

  cambiar<C extends keyof ConfiguracionSistema>(campo: C, valor: ConfiguracionSistema[C]): void {
    this.borrador.update((c) => ({ ...c, [campo]: valor }));
    this.guardado.set(false);
  }

  alternarFormato(mime: string, activo: boolean): void {
    this.borrador.update((c) => ({
      ...c,
      formatosAceptados: activo
        ? [...c.formatosAceptados, mime]
        : c.formatosAceptados.filter((f) => f !== mime)
    }));
    this.guardado.set(false);
  }

  guardar(): void {
    this.servicio.guardar({ ...this.borrador() });
    this.guardado.set(true);
  }

  restablecer(): void {
    this.borrador.set({ ...CONFIGURACION_POR_DEFECTO });
    this.servicio.restablecer();
    this.guardado.set(true);
  }
}
