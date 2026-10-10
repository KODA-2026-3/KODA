import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';

import {
  Analisis,
  DESCRIPCION_KL,
  ETIQUETAS_KL,
  GradoKL,
  MODELOS_SIN_VALIDEZ_CLINICA
} from '../../../core/models/analisis.model';
import { AnalisisService } from '../../../core/services/analisis.service';
import { ConfiguracionService } from '../../../core/services/configuracion.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';

type Vista = 'ORIGINAL' | 'HEATMAP';

@Component({
  selector: 'app-resultado',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RouterLink, IconComponent],
  template: `
    @if (analisis(); as a) {
      <div class="mx-auto max-w-7xl">
        <a
          routerLink="/app/historial"
          class="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-navy-700"
        >
          Historial de análisis / ID: #{{ a.id }}
        </a>
        <h1 class="mt-2 text-3xl font-extrabold tracking-tight text-navy-950">
          Resultados del Análisis IA
        </h1>

        @if (sinValidezClinica(a)) {
          <div
            class="mt-4 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3.5"
            role="note"
          >
            <span class="mt-0.5 text-amber-600"><app-icon name="alert-triangle" [size]="20" /></span>
            <p class="text-sm text-amber-900">
              <strong>Resultado sin validez diagnóstica.</strong>
              Estos valores los generó un clasificador simulado para probar la plataforma, no el
              modelo de IA.
            </p>
          </div>
        }

        <div class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <!-- Visor -->
          <div>
            @if (a.imagenDisponible) {
            <div class="card grid grid-cols-2 gap-1 p-1.5" role="tablist" aria-label="Vista de la imagen">
              @for (opcion of vistas; track opcion.valor) {
                <button
                  type="button"
                  role="tab"
                  [attr.aria-selected]="vista() === opcion.valor"
                  class="rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors"
                  [class]="
                    vista() === opcion.valor
                      ? 'bg-navy-700 text-white'
                      : 'text-slate-600 hover:bg-navy-50'
                  "
                  (click)="vista.set(opcion.valor)"
                >
                  {{ opcion.etiqueta }}
                </button>
              }
            </div>

            <div class="card relative mt-4 overflow-hidden bg-navy-950 p-0">
              <div class="flex h-[480px] items-center justify-center overflow-hidden">
                <!--
                  El mapa de calor se apila sobre la radiografia original (ambas
                  imagenes tienen las mismas proporciones) y la barra de
                  intensidad controla su opacidad: 0 = solo la radiografia,
                  100 = mapa de calor completo.
                -->
                <div
                  class="relative max-h-full origin-center transition-transform duration-200"
                  [style.transform]="'scale(' + zoom() / 100 + ')'"
                >
                  <img
                    [src]="a.imagenOriginal"
                    [alt]="'Radiografía original: ' + a.archivo"
                    class="block max-h-[480px]"
                  />
                  @if (vista() === 'HEATMAP') {
                    <img
                      [src]="a.heatmap"
                      [alt]="'Mapa de calor Grad-CAM: ' + a.archivo"
                      class="pointer-events-none absolute inset-0 h-full w-full"
                      [style.opacity]="intensidad() / 100"
                    />
                  }
                </div>
              </div>

              @if (a.lateralidad) {
                <span
                  class="absolute bottom-4 left-5 font-mono text-lg text-slate-300"
                  aria-hidden="true"
                >
                  {{ a.lateralidad === 'IZQUIERDA' ? 'L' : 'R' }}
                </span>
              }

              <!-- Controles de zoom -->
              <div
                class="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-navy-950/80 px-2 py-1.5 text-white backdrop-blur"
              >
                <button
                  type="button"
                  class="rounded-full p-1.5 hover:bg-white/10"
                  aria-label="Alejar"
                  (click)="ajustarZoom(-25)"
                >
                  <app-icon name="zoom-out" [size]="18" />
                </button>
                <span class="min-w-[52px] text-center text-sm font-semibold">{{ zoom() }}%</span>
                <button
                  type="button"
                  class="rounded-full p-1.5 hover:bg-white/10"
                  aria-label="Acercar"
                  (click)="ajustarZoom(25)"
                >
                  <app-icon name="zoom-in" [size]="18" />
                </button>
                <button
                  type="button"
                  class="ml-1 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-semibold hover:bg-white/10"
                  (click)="zoom.set(100)"
                >
                  <app-icon name="maximize" [size]="16" />
                  Ajustar
                </button>
              </div>
            </div>

            @if (vista() === 'HEATMAP') {
              <div class="card mt-4 flex items-center gap-4 px-5 py-3.5">
                <label
                  for="intensidad-heatmap"
                  class="shrink-0 text-sm font-semibold text-navy-950"
                >
                  Intensidad del mapa de calor
                </label>
                <span class="text-xs font-semibold text-slate-500" aria-hidden="true">0</span>
                <input
                  id="intensidad-heatmap"
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  class="h-2 w-full cursor-pointer accent-navy-700"
                  [value]="intensidad()"
                  [attr.aria-valuetext]="intensidad() + '%'"
                  (input)="intensidad.set(+$any($event.target).value)"
                  (dblclick)="intensidad.set(intensidadPredeterminada)"
                  title="Doble clic para restablecer"
                />
                <span class="text-xs font-semibold text-slate-500" aria-hidden="true">100</span>
                <span class="min-w-[48px] text-right font-mono text-sm font-semibold text-navy-950">
                  {{ intensidad() }}%
                </span>
              </div>
            }
            } @else {
              <div
                class="card flex h-[480px] flex-col items-center justify-center gap-3 px-8 text-center"
                role="note"
              >
                <span class="text-slate-400"><app-icon name="file-text" [size]="40" /></span>
                <p class="font-bold text-navy-950">La radiografía ya no está guardada</p>
                <p class="max-w-md text-sm text-slate-600">
                  Las radiografías y sus mapas de calor se conservan {{ diasRetencion }} días
                  después del análisis, o hasta que el médico las elimina. El resultado del análisis
                  sigue disponible.
                </p>
              </div>
            }

            <p class="mt-3 flex items-center gap-2 text-sm text-slate-600">
              <app-icon name="file-text" [size]="16" />
              @if (a.lateralidad) {
                Rodilla {{ a.lateralidad === 'IZQUIERDA' ? 'izquierda' : 'derecha' }} ·
              }
              {{ a.archivo }}
            </p>

            @if (a.imagenDisponible) {
              <div class="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
                <span>
                  La radiografía se conserva hasta el
                  {{ a.imagenExpiraEn | date: 'dd/MM/yyyy HH:mm' }}.
                </span>
                <button
                  type="button"
                  class="btn-ghost px-3 py-1.5 text-red-600 hover:bg-red-50"
                  [disabled]="eliminando()"
                  (click)="eliminarImagen(a)"
                >
                  {{ eliminando() ? 'Eliminando…' : 'Eliminar radiografía' }}
                </button>
              </div>
            }
            @if (errorEliminar()) {
              <p class="mt-2 text-sm text-red-600" role="alert">{{ errorEliminar() }}</p>
            }
          </div>

          <!-- Panel de resultados -->
          <div class="space-y-6">
            <section class="card p-6">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <p class="section-title">Clasificación Kellgren-Lawrence</p>
                  <p class="mt-2 text-4xl font-extrabold tracking-tight text-navy-950">
                    Grado {{ a.grado }}
                  </p>
                </div>
                <span class="badge" [class]="estiloGrado(a.grado)">
                  {{ descripcion(a.grado) }}
                </span>
              </div>

              <div class="mt-5 flex justify-between text-xs text-slate-500">
                <span>0: Normal</span>
                <span>4: Severo</span>
              </div>
              <div class="mt-1.5 grid grid-cols-5 gap-1.5">
                @for (g of grados; track g) {
                  <span
                    class="rounded-md px-1 py-2 text-center text-[11px] font-semibold"
                    [class]="
                      g === a.grado
                        ? 'bg-navy-700 text-white'
                        : 'bg-surface-muted text-slate-600'
                    "
                  >
                    G{{ g }} ({{ etiqueta(g) }})
                  </span>
                }
              </div>
            </section>

            <section class="card flex items-center gap-5 p-6">
              <div class="relative h-16 w-16 shrink-0">
                <svg viewBox="0 0 100 100" class="h-full w-full -rotate-90" aria-hidden="true">
                  <circle cx="50" cy="50" r="44" fill="none" stroke="#E3ECF6" stroke-width="10" />
                  <circle
                    cx="50"
                    cy="50"
                    r="44"
                    fill="none"
                    stroke="#1E3A5F"
                    stroke-width="10"
                    stroke-linecap="round"
                    [attr.stroke-dasharray]="circunferencia"
                    [attr.stroke-dashoffset]="circunferencia * (1 - a.confianza / 100)"
                  />
                </svg>
                <span
                  class="absolute inset-0 flex items-center justify-center text-sm font-bold text-navy-950"
                >
                  {{ a.confianza }}%
                </span>
              </div>
              <div>
                <p class="section-title">Nivel de confianza IA</p>
                <p class="mt-1 text-lg font-bold" [class]="colorConfianza(a.confianza)">
                  {{ textoConfianza(a.confianza) }}
                </p>
              </div>
            </section>

            <section class="card p-6">
              <p class="section-title mb-4">Distribución por grado</p>
              @if (a.distribucion.length === 0) {
                <p class="text-sm text-slate-500">
                  La distribución por grado no se registró para este análisis.
                </p>
              }
              <ul class="space-y-3">
                @for (d of a.distribucion; track d.grado) {
                  <li>
                    <div class="flex justify-between text-sm">
                      <span
                        [class]="
                          d.grado === a.grado
                            ? 'font-bold text-amber-600'
                            : 'font-medium text-slate-600'
                        "
                      >
                        Grado {{ d.grado }} — {{ etiqueta(d.grado) }}
                      </span>
                      <span
                        [class]="
                          d.grado === a.grado
                            ? 'font-bold text-amber-600'
                            : 'font-medium text-slate-600'
                        "
                      >
                        {{ d.probabilidad }}%
                      </span>
                    </div>
                    <div class="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        class="h-full rounded-full"
                        [class]="colorBarra(d.grado)"
                        [style.width.%]="d.probabilidad"
                      ></div>
                    </div>
                  </li>
                }
              </ul>
            </section>

            <div class="grid gap-3 sm:grid-cols-2">
              <a routerLink="/app/cargar" class="btn-primary py-3">
                <app-icon name="plus" [size]="18" />
                Nuevo Análisis
              </a>
              <button type="button" class="btn-secondary py-3" (click)="descargar()">
                <app-icon name="download" [size]="18" />
                Descargar Reporte
              </button>
            </div>
          </div>
        </div>

        <p
          class="mt-8 flex items-center gap-2.5 rounded-lg bg-navy-50 px-4 py-3.5 text-sm text-navy-800"
        >
          <app-icon name="info" [size]="18" />
          Esta herramienta es de apoyo diagnóstico y no reemplaza el criterio clínico del profesional
          médico.
        </p>
      </div>
    } @else if (analisis() === null) {
      <div class="mx-auto max-w-lg py-20 text-center">
        <p class="text-lg font-bold text-navy-950">No se encontró este análisis</p>
        <p class="mt-2 text-sm text-slate-600">
          Puede que no exista, que pertenezca a otra cuenta o que no se haya podido cargar.
        </p>
        <a routerLink="/app/cargar" class="btn-primary mt-6 px-6 py-2.5">Nuevo análisis</a>
      </div>
    } @else {
      <p class="py-20 text-center text-sm text-slate-500">Cargando resultados del análisis…</p>
    }
  `
})
export class ResultadoComponent {
  private readonly ruta = inject(ActivatedRoute);
  private readonly servicio = inject(AnalisisService);
  private readonly config = inject(ConfiguracionService).configuracion;

  readonly grados: GradoKL[] = [0, 1, 2, 3, 4];
  readonly vistas: { valor: Vista; etiqueta: string }[] = [
    { valor: 'ORIGINAL', etiqueta: 'Radiografía Original' },
    { valor: 'HEATMAP', etiqueta: 'Mapa de Calor (Grad-CAM)' }
  ];
  readonly circunferencia = 2 * Math.PI * 44;

  readonly vista = signal<Vista>(this.config().vistaPredeterminada);
  readonly zoom = signal(100);
  /**
   * Opacidad (0-100) del mapa de calor sobre la radiografia. 60 reproduce el
   * aspecto anterior; 100 muestra el mapa con la opacidad maxima del servicio
   * de inferencia (KODA_OPACIDAD_HEATMAP).
   */
  readonly intensidadPredeterminada = 60;
  readonly intensidad = signal(this.intensidadPredeterminada);
  readonly diasRetencion = this.config().diasRetencionImagenes;
  readonly eliminando = signal(false);
  readonly errorEliminar = signal('');

  /** undefined mientras carga; null si el analisis no existe. */
  readonly analisis = signal<Analisis | null | undefined>(undefined);

  constructor() {
    this.ruta.paramMap
      .pipe(
        switchMap((p) => this.servicio.obtener(p.get('id') ?? '')),
        takeUntilDestroyed()
      )
      .subscribe((analisis) => this.analisis.set(analisis));
  }

  eliminarImagen(analisis: Analisis): void {
    const confirmado = window.confirm(
      'Se eliminarán la radiografía y su mapa de calor. El resultado del análisis se conserva. ¿Continuar?'
    );
    if (!confirmado) {
      return;
    }
    this.eliminando.set(true);
    this.errorEliminar.set('');
    this.servicio.eliminarImagen(analisis.id).subscribe({
      next: () => {
        this.analisis.set(this.servicio.sinImagenes(analisis));
        this.eliminando.set(false);
      },
      error: (e: Error) => {
        this.errorEliminar.set(e.message);
        this.eliminando.set(false);
      }
    });
  }

  sinValidezClinica(analisis: Analisis): boolean {
    return MODELOS_SIN_VALIDEZ_CLINICA.includes(analisis.modelo);
  }

  ajustarZoom(delta: number): void {
    this.zoom.update((z) => Math.min(300, Math.max(50, z + delta)));
  }

  etiqueta(grado: GradoKL): string {
    return ETIQUETAS_KL[grado];
  }

  descripcion(grado: GradoKL): string {
    return DESCRIPCION_KL[grado];
  }

  estiloGrado(grado: GradoKL): string {
    const estilos: Record<GradoKL, string> = {
      0: 'bg-emerald-100 text-emerald-800',
      1: 'bg-lime-100 text-lime-800',
      2: 'bg-amber-100 text-amber-800',
      3: 'bg-orange-100 text-orange-800',
      4: 'bg-red-100 text-red-800'
    };
    return estilos[grado];
  }

  colorBarra(grado: GradoKL): string {
    const colores: Record<GradoKL, string> = {
      0: 'bg-emerald-500',
      1: 'bg-lime-500',
      2: 'bg-amber-500',
      3: 'bg-orange-500',
      4: 'bg-red-500'
    };
    return colores[grado];
  }

  textoConfianza(valor: number): string {
    if (valor >= this.config().umbralConfianzaAlta) return 'Confianza alta';
    if (valor >= this.config().umbralConfianzaMedia) return 'Confianza media';
    return 'Confianza baja';
  }

  colorConfianza(valor: number): string {
    if (valor >= this.config().umbralConfianzaAlta) return 'text-emerald-700';
    if (valor >= this.config().umbralConfianzaMedia) return 'text-amber-600';
    return 'text-red-600';
  }

  descargar(): void {
    // Pendiente: GET /api/analisis/{id}/reporte devolvera el PDF generado en el backend.
  }
}