import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AnalisisResponse, GradoKL } from '../../../core/models/analisis.model';
import { AdminAnalisisService } from '../../../core/services/admin-analisis.service';
import { BadgeKlComponent } from '../../../shared/components/badge-kl/badge-kl.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { TiempoRelativoPipe } from '../../../shared/pipes/tiempo-relativo.pipe';

const POR_PAGINA = 10;

@Component({
  selector: 'app-admin-historial',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IconComponent, BadgeKlComponent, TiempoRelativoPipe],
  template: `
    <div class="mx-auto max-w-7xl">
      <div>
        <h1 class="text-3xl font-extrabold tracking-tight text-navy-950">Historial de Radiografías</h1>
        <p class="mt-2 text-sm text-slate-600">
          Registro completo de todos los análisis de radiografías realizados en el sistema.
        </p>
      </div>

      <!-- Indicadores -->
      <div class="mt-6 grid gap-4 sm:grid-cols-3 sm:max-w-2xl">
        @for (kpi of indicadores(); track kpi.etiqueta) {
          <div class="card p-5">
            <p class="section-title">{{ kpi.etiqueta }}</p>
            <p class="mt-2 text-4xl font-extrabold tracking-tight text-navy-950">{{ kpi.valor }}</p>
            <p class="mt-1 text-sm text-slate-500">{{ kpi.detalle }}</p>
          </div>
        }
      </div>

      <!-- Filtros -->
      <div class="card mt-6 flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
        <div class="relative flex-1">
          <span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
            <app-icon name="search" [size]="18" />
          </span>
          <input
            type="search"
            class="field-input pl-11"
            placeholder="Buscar por ID, archivo o nombre de médico…"
            aria-label="Buscar análisis"
            [ngModel]="busqueda()"
            (ngModelChange)="cambiarBusqueda($event)"
          />
        </div>

        <div class="relative">
          <span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
            <app-icon name="filter" [size]="18" />
          </span>
          <select
            class="field-input appearance-none pl-11 pr-10"
            aria-label="Filtrar por grado"
            [ngModel]="grado()"
            (ngModelChange)="cambiarGrado($event)"
          >
            <option value="">Todos los Grados</option>
            <option value="0">Grado 0 · Normal</option>
            <option value="1">Grado 1 · Dudoso</option>
            <option value="2">Grado 2 · Leve</option>
            <option value="3">Grado 3 · Moderado</option>
            <option value="4">Grado 4 · Severo</option>
          </select>
          <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
            <app-icon name="chevron-down" [size]="16" />
          </span>
        </div>

        <button type="button" class="btn-ghost whitespace-nowrap" (click)="limpiarFiltros()">
          Limpiar Filtros
        </button>
      </div>

      @if (error()) {
        <div
          class="mt-6 flex items-center gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3.5"
          role="alert"
        >
          <span class="text-red-600"><app-icon name="alert-triangle" [size]="20" /></span>
          <p class="flex-1 text-sm text-red-700">{{ error() }}</p>
          <button type="button" class="btn-secondary px-3 py-1.5" (click)="cargar()">
            Reintentar
          </button>
        </div>
      }

      <!-- Tabla -->
      <div class="card mt-6 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[860px] text-left">
            <caption class="sr-only">
              Análisis de radiografías realizados en el sistema
            </caption>
            <thead>
              <tr class="bg-navy-700 text-sm text-white">
                <th scope="col" class="px-5 py-3.5 font-bold">ID / Fecha</th>
                <th scope="col" class="px-5 py-3.5 font-bold">Médico</th>
                <th scope="col" class="px-5 py-3.5 font-bold">Archivo</th>
                <th scope="col" class="px-5 py-3.5 font-bold">Clasificación KL</th>
                <th scope="col" class="px-5 py-3.5 font-bold">Confianza</th>
                <th scope="col" class="px-5 py-3.5 font-bold">Modelo</th>
              </tr>
            </thead>
            <tbody>
              @for (a of pagina(); track a.id) {
                <tr class="border-b border-surface-border last:border-0 hover:bg-surface-muted/60">
                  <td class="px-5 py-4">
                    <p class="font-bold text-navy-700">#{{ a.id }}</p>
                    <p class="text-sm text-slate-500">{{ a.fechaCreacion | tiempoRelativo }}</p>
                  </td>
                  <td class="px-5 py-4">
                    <span class="flex items-center gap-2">
                      <span
                        class="flex h-8 w-8 items-center justify-center rounded-full bg-navy-100 text-navy-700"
                        aria-hidden="true"
                      >
                        <app-icon name="user" [size]="14" />
                      </span>
                      <span class="text-sm font-medium text-navy-950">
                        {{ a.medicoNombre ?? 'Sin asignar' }}
                      </span>
                    </span>
                  </td>
                  <td class="px-5 py-4 text-sm text-slate-600">{{ a.nombreArchivo }}</td>
                  <td class="px-5 py-4"><app-badge-kl [grado]="a.gradoKL" /></td>
                  <td class="px-5 py-4">
                    <p class="font-bold text-emerald-700">{{ (a.confianza * 100).toFixed(0) }}%</p>
                  </td>
                  <td class="px-5 py-4 text-sm text-slate-600">{{ a.modelo }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6" class="px-5 py-16 text-center text-sm text-slate-500">
                    @if (cargando()) {
                      Cargando análisis…
                    } @else if (busqueda() || grado()) {
                      No se encontraron análisis con los filtros seleccionados.
                    } @else {
                      Todavía no hay análisis registrados en el sistema.
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <div
          class="flex flex-col gap-3 border-t border-surface-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <p class="text-sm text-slate-600">
            Mostrando <strong>{{ desde() }}-{{ hasta() }}</strong> de
            <strong>{{ filtrados().length }}</strong> análisis
          </p>
          <nav class="flex items-center gap-1" aria-label="Paginación del historial">
            <button
              type="button"
              class="btn-secondary px-2.5 py-1.5"
              aria-label="Página anterior"
              [disabled]="paginaActual() === 1"
              (click)="irA(paginaActual() - 1)"
            >
              <app-icon name="chevron-left" [size]="16" />
            </button>
            @for (p of numerosPagina(); track p) {
              <button
                type="button"
                class="h-9 w-9 rounded-lg text-sm font-semibold transition-colors"
                [class]="
                  p === paginaActual()
                    ? 'bg-navy-700 text-white'
                    : 'border border-surface-border bg-white text-navy-700 hover:bg-navy-50'
                "
                [attr.aria-current]="p === paginaActual() ? 'page' : null"
                (click)="irA(p)"
              >
                {{ p }}
              </button>
            }
            <button
              type="button"
              class="btn-secondary px-2.5 py-1.5"
              aria-label="Página siguiente"
              [disabled]="paginaActual() === totalPaginas()"
              (click)="irA(paginaActual() + 1)"
            >
              <app-icon name="chevron-right" [size]="16" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  `
})
export class AdminHistorialComponent implements OnInit {
  private readonly servicio = inject(AdminAnalisisService);

  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly busqueda = signal('');
  readonly grado = signal('');
  readonly paginaActual = signal(1);

  readonly indicadores = computed(() => {
    const analisis = this.servicio.analisis();
    const total = analisis.length;
    const medicos = new Set(analisis.map(a => a.medicoNombre).filter(Boolean)).size;
    return [
      { etiqueta: 'Total Análisis', valor: total, detalle: 'Radiografías analizadas' },
      { etiqueta: 'Médicos Activos', valor: medicos, detalle: 'Que han realizado análisis' },
    ];
  });

  readonly filtrados = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    const gradoSeleccionado = this.grado();

    return this.servicio.analisis().filter((a) => {
      const coincideTexto =
        !texto ||
        String(a.id).includes(texto) ||
        a.nombreArchivo.toLowerCase().includes(texto) ||
        (a.medicoNombre?.toLowerCase().includes(texto) ?? false);
      const coincideGrado =
        !gradoSeleccionado || a.gradoKL === Number(gradoSeleccionado);
      return coincideTexto && coincideGrado;
    });
  });

  readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.filtrados().length / POR_PAGINA))
  );

  readonly pagina = computed(() => {
    const inicio = (this.paginaActual() - 1) * POR_PAGINA;
    return this.filtrados().slice(inicio, inicio + POR_PAGINA);
  });

  readonly numerosPagina = computed(() =>
    Array.from({ length: this.totalPaginas() }, (_, i) => i + 1)
  );

  readonly desde = computed(() =>
    this.filtrados().length === 0 ? 0 : (this.paginaActual() - 1) * POR_PAGINA + 1
  );

  readonly hasta = computed(() =>
    Math.min(this.paginaActual() * POR_PAGINA, this.filtrados().length)
  );

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.servicio.listar().subscribe({
      next: () => this.cargando.set(false),
      error: (e: Error) => {
        this.cargando.set(false);
        this.error.set(e.message);
      }
    });
  }

  cambiarBusqueda(valor: string): void {
    this.busqueda.set(valor);
    this.paginaActual.set(1);
  }

  cambiarGrado(valor: string): void {
    this.grado.set(valor);
    this.paginaActual.set(1);
  }

  limpiarFiltros(): void {
    this.busqueda.set('');
    this.grado.set('');
    this.paginaActual.set(1);
  }

  irA(pagina: number): void {
    this.paginaActual.set(Math.min(Math.max(1, pagina), this.totalPaginas()));
  }
}
