import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AnalisisService } from '../../../core/services/analisis.service';
import { CargaRadiografiaStore } from '../../../core/services/carga-radiografia.store';
import { IconComponent } from '../../../shared/components/icon/icon.component';

/** Duracion estimada del analisis que se muestra al usuario, en segundos. */
const DURACION_ESTIMADA_S = 20;

@Component({
  selector: 'app-procesando',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="flex min-h-[70vh] items-center justify-center">
      <div class="card w-full max-w-2xl p-8 sm:p-10">
        <div class="flex items-start justify-between gap-4 border-b border-surface-border pb-5">
          <div class="min-w-0">
            <p class="section-title">Procesando</p>
            <p class="mt-1 truncate text-base font-bold text-navy-950">{{ nombreArchivo() }}</p>
          </div>
          @if (vistaPrevia(); as src) {
            <img
              [src]="src"
              alt=""
              class="h-14 w-14 shrink-0 rounded-lg border border-surface-border bg-navy-950 object-contain"
            />
          }
        </div>

        <div class="flex flex-col items-center py-10">
          <!-- Indicador circular -->
          <div class="relative h-32 w-32">
            <svg viewBox="0 0 100 100" class="h-full w-full -rotate-90" aria-hidden="true">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#E3ECF6" stroke-width="8" />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#1E3A5F"
                stroke-width="8"
                stroke-linecap="round"
                [attr.stroke-dasharray]="circunferencia"
                [attr.stroke-dashoffset]="desplazamiento()"
                class="transition-[stroke-dashoffset] duration-300 ease-linear"
              />
            </svg>
            <span
              class="absolute inset-0 flex items-center justify-center text-navy-700"
              aria-hidden="true"
            >
              <app-icon name="cpu" [size]="30" />
            </span>
          </div>

          <h1 class="mt-8 text-2xl font-extrabold tracking-tight text-navy-950">
            Analizando radiografía…
          </h1>
          <p class="mt-3 max-w-lg text-center text-sm leading-relaxed text-slate-600">
            Nuestro modelo de inteligencia artificial está evaluando la imagen. Este proceso puede
            tardar hasta {{ duracionEstimada }} segundos.
          </p>
        </div>

        <div role="progressbar" [attr.aria-valuenow]="progreso()" aria-valuemin="0" aria-valuemax="100">
          <p class="mb-2 text-sm font-bold text-navy-950">{{ progreso() }}%</p>
          <div class="h-2.5 w-full overflow-hidden rounded-full bg-navy-100">
            <div
              class="h-full rounded-full bg-navy-700 transition-[width] duration-300 ease-linear"
              [style.width.%]="progreso()"
            ></div>
          </div>
        </div>

        <p class="mt-6 text-center text-xs text-slate-500">
          Por favor, no cierre esta ventana durante el análisis.
        </p>
      </div>
    </div>
  `
})
export class ProcesandoComponent implements OnInit, OnDestroy {
  private readonly store = inject(CargaRadiografiaStore);
  private readonly analisisService = inject(AnalisisService);
  private readonly router = inject(Router);

  readonly duracionEstimada = DURACION_ESTIMADA_S;
  readonly circunferencia = 2 * Math.PI * 45;
  readonly progreso = signal(0);
  readonly vistaPrevia = this.store.vistaPrevia;

  private temporizador?: ReturnType<typeof setInterval>;

  nombreArchivo(): string {
    return this.store.archivo()?.name ?? '';
  }

  desplazamiento(): number {
    return this.circunferencia * (1 - this.progreso() / 100);
  }

  ngOnInit(): void {
    const archivo = this.store.archivo();
    if (!archivo) {
      void this.router.navigate(['/app/cargar']);
      return;
    }

    // El avance se muestra hasta 95% y se completa cuando responde el servicio.
    this.temporizador = setInterval(() => {
      this.progreso.update((p) => (p < 95 ? p + 5 : p));
    }, 130);

    this.analisisService.analizar(archivo).subscribe((analisis) => {
      this.progreso.set(100);
      this.store.limpiar();
      void this.router.navigate(['/app/resultado', analisis.id]);
    });
  }

  ngOnDestroy(): void {
    clearInterval(this.temporizador);
  }
}
