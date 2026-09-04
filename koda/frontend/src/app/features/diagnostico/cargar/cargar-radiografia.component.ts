import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { CargaRadiografiaStore } from '../../../core/services/carga-radiografia.store';
import { IconComponent } from '../../../shared/components/icon/icon.component';

const FORMATOS_ACEPTADOS = ['image/jpeg', 'image/png'];
const TAMANO_MAXIMO_MB = 10;

@Component({
  selector: 'app-cargar-radiografia',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="mx-auto max-w-5xl">
      <h1 class="text-3xl font-extrabold tracking-tight text-navy-950">Cargar Radiografía</h1>
      <p class="mt-2 text-sm text-slate-600">
        Suba una imagen de radiografía de rodilla para análisis de osteoartritis (Clasificación
        Kellgren-Lawrence).
      </p>

      @if (error()) {
        <div
          class="mt-6 flex items-center gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3.5"
          role="alert"
          aria-live="assertive"
        >
          <span class="text-red-600"><app-icon name="alert-triangle" [size]="20" /></span>
          <p class="text-sm text-red-700">{{ error() }}</p>
        </div>
      }

      <div class="card mt-6 p-6 sm:p-8">
        <!-- Zona de arrastre -->
        <div
          class="rounded-xl border-2 border-dashed px-6 py-14 text-center transition-colors"
          [class]="
            arrastrando()
              ? 'border-navy-500 bg-navy-50'
              : 'border-navy-300 bg-surface-muted/60 hover:bg-navy-50/60'
          "
          (dragover)="alArrastrar($event, true)"
          (dragleave)="alArrastrar($event, false)"
          (drop)="alSoltar($event)"
        >
          <span
            class="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-navy-100 text-navy-700"
          >
            <app-icon name="upload-cloud" [size]="26" />
          </span>
          <p class="text-base font-bold text-navy-900">Arrastre y suelte su radiografía aquí</p>
          <p class="my-3 text-sm text-slate-500">o</p>

          <button type="button" class="btn-secondary" (click)="entrada.click()">
            Seleccionar archivo
          </button>
          <input
            #entrada
            type="file"
            class="sr-only"
            accept="image/jpeg,image/png"
            (change)="alSeleccionar($event)"
          />

          <p class="mt-5 text-xs text-slate-500">
            Formatos aceptados: JPEG, PNG · Tamaño máximo: {{ tamanoMaximoMb }} MB
          </p>
        </div>

        <!-- Archivo cargado -->
        @if (archivo(); as file) {
          <div class="mt-6 rounded-xl border border-surface-border p-5">
            <p class="section-title mb-4">Archivo cargado listo para análisis</p>
            <div class="flex flex-col gap-5 sm:flex-row">
              <img
                [src]="vistaPrevia()"
                [alt]="'Vista previa de ' + file.name"
                class="h-48 w-40 shrink-0 rounded-lg border border-surface-border bg-navy-950 object-contain"
              />
              <div class="min-w-0 flex-1">
                <p class="truncate text-base font-bold text-navy-950">{{ file.name }}</p>
                <p class="mt-1 text-sm text-slate-600">
                  Tamaño: {{ tamanoMb(file) }} MB
                  <span class="ml-4">Formato: {{ formato(file) }}</span>
                </p>
                <span class="badge mt-3 bg-emerald-100 text-emerald-800">
                  <app-icon name="shield-check" [size]="14" />
                  Formato válido
                </span>
                <button
                  type="button"
                  class="mt-4 flex items-center gap-2 text-sm font-semibold text-red-600 hover:text-red-700"
                  (click)="eliminar()"
                >
                  <app-icon name="trash" [size]="16" />
                  Eliminar archivo
                </button>
              </div>
            </div>
          </div>

          <button type="button" class="btn-primary mt-6 w-full py-3.5" (click)="analizar()">
            <app-icon name="cpu" [size]="20" />
            Analizar Radiografía
          </button>
        }
      </div>
    </div>
  `
})
export class CargarRadiografiaComponent {
  private readonly store = inject(CargaRadiografiaStore);
  private readonly router = inject(Router);

  readonly tamanoMaximoMb = TAMANO_MAXIMO_MB;
  readonly archivo = this.store.archivo;
  readonly vistaPrevia = this.store.vistaPrevia;
  readonly error = signal<string | null>(null);
  readonly arrastrando = signal(false);

  alArrastrar(evento: DragEvent, activo: boolean): void {
    evento.preventDefault();
    this.arrastrando.set(activo);
  }

  alSoltar(evento: DragEvent): void {
    evento.preventDefault();
    this.arrastrando.set(false);
    const archivo = evento.dataTransfer?.files?.[0];
    if (archivo) {
      this.validarYGuardar(archivo);
    }
  }

  alSeleccionar(evento: Event): void {
    const entrada = evento.target as HTMLInputElement;
    const archivo = entrada.files?.[0];
    if (archivo) {
      this.validarYGuardar(archivo);
    }
    entrada.value = '';
  }

  eliminar(): void {
    this.store.limpiar();
    this.error.set(null);
  }

  analizar(): void {
    if (this.archivo()) {
      void this.router.navigate(['/app/analizando']);
    }
  }

  tamanoMb(archivo: File): string {
    return (archivo.size / (1024 * 1024)).toFixed(1);
  }

  formato(archivo: File): string {
    return archivo.type === 'image/png' ? 'PNG' : 'JPEG';
  }

  private validarYGuardar(archivo: File): void {
    if (!FORMATOS_ACEPTADOS.includes(archivo.type)) {
      this.store.limpiar();
      this.error.set(
        'El formato del archivo no es compatible. Solo se aceptan imágenes JPEG o PNG.'
      );
      return;
    }

    if (archivo.size > TAMANO_MAXIMO_MB * 1024 * 1024) {
      this.store.limpiar();
      this.error.set(
        `El archivo excede el tamaño máximo permitido (${TAMANO_MAXIMO_MB} MB). Por favor, seleccione un archivo más pequeño.`
      );
      return;
    }

    this.error.set(null);
    this.store.establecer(archivo, URL.createObjectURL(archivo));
  }
}
