import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { GradoKL } from '../../core/models/analisis.model';
import { AnalisisService } from '../../core/services/analisis.service';
import { BadgeKlComponent } from '../../shared/components/badge-kl/badge-kl.component';
import { IconComponent } from '../../shared/components/icon/icon.component';

const POR_PAGINA = 6;

@Component({
  selector: 'app-historial',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, IconComponent, BadgeKlComponent],
  template: `
    <div class="mx-auto max-w-7xl">
      <h1 class="text-3xl font-extrabold tracking-tight text-navy-950">Historial de Análisis</h1>
      <p class="mt-2 text-sm text-slate-600">
        Visualice, filtre y descargue los reportes de análisis de osteoartritis realizados
        previamente.
      </p>

      <!-- Filtros -->
      <div class="card mt-6 flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
        <div class="relative flex-1">
          <span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
            <app-icon name="search" [size]="18" />
          </span>
          <input
            type="search"
            class="field-input pl-11"
            placeholder="Buscar por paciente o ID…"
            aria-label="Buscar por paciente o ID"
            [ngModel]="busqueda()"
            (ngModelChange)="cambiarBusqueda($event)"
          />
        </div>

        <div class="relative">
          <span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
            <app-icon name="calendar" [size]="18" />
          </span>
          <select
            class="field-input appearance-none pl-11 pr-10"
            aria-label="Rango de fechas"
            [ngModel]="rango()"
            (ngModelChange)="rango.set($event)"
          >
            <option value="30">Últimos 30 días</option>
            <option value="90">Últimos 90 días</option>
            <option value="365">Último año</option>
            <option value="0">Todo el histórico</option>
          </select>
          <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
            <app-icon name="chevron-down" [size]="16" />
          </span>
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

      <!-- Tabla -->
      <div class="card mt-6 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[860px] text-left">
            <caption class="sr-only">
              Análisis de osteoartritis realizados
            </caption>
            <thead>
              <tr class="border-b border-surface-border text-xs uppercase tracking-wider text-slate-500">
                <th scope="col" class="px-5 py-3 font-bold">Miniatura</th>
                <th scope="col" class="px-5 py-3 font-bold">ID / Fecha</th>
                <th scope="col" class="px-5 py-3 font-bold">Paciente / Archivo</th>
                <th scope="col" class="px-5 py-3 font-bold">Clasificación KL</th>
                <th scope="col" class="px-5 py-3 font-bold">Confianza</th>
                <th scope="col" class="px-5 py-3 font-bold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (a of pagina(); track a.id) {
                <tr class="border-b border-surface-border last:border-0 hover:bg-surface-muted/60">
                  <td class="px-5 py-3">
                    <img
                      [src]="a.miniatura"
                      [alt]="'Miniatura del análisis ' + a.id"
                      class="h-14 w-12 rounded border border-surface-border bg-navy-950 object-contain"
                    />
                  </td>
                  <td class="px-5 py-3">
                    <p class="font-bold text-navy-700">#{{ a.id }}</p>
                    <p class="text-sm text-slate-500">{{ a.fecha }}</p>
                  </td>
                  <td class="px-5 py-3">
                    <p class="font-semibold text-navy-950">{{ a.paciente }}</p>
                    <p class="text-sm text-slate-500">
                      Rodilla {{ a.lateralidad === 'IZQUIERDA' ? 'izquierda' : 'derecha' }} ·
                      {{ a.archivo }}
                    </p>
                  </td>
                  <td class="px-5 py-3"><app-badge-kl [grado]="a.grado" /></td>
                  <td class="px-5 py-3">
                    <p class="text-xs uppercase tracking-wide text-slate-500">Confianza</p>
                    <p class="font-bold text-emerald-700">{{ a.confianza }}%</p>
                  </td>
                  <td class="px-5 py-3">
                    <a [routerLink]="['/app/resultado', a.id]" class="btn-secondary px-3 py-1.5">
                      Ver
                      <app-icon name="arrow-right" [size]="16" />
                    </a>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6" class="px-5 py-16 text-center text-sm text-slate-500">
                    No se encontraron análisis con los filtros seleccionados.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Paginación -->
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

      <p
        class="mt-6 flex items-center gap-2.5 rounded-lg bg-navy-50 px-4 py-3.5 text-sm text-navy-800"
      >
        <app-icon name="info" [size]="18" />
        Esta herramienta es de apoyo diagnóstico y no reemplaza el criterio clínico del profesional
        médico.
      </p>
    </div>
  `
})
export class HistorialComponent {
  private readonly servicio = inject(AnalisisService);

  readonly busqueda = signal('');
  readonly rango = signal('30');
  readonly grado = signal('');
  readonly paginaActual = signal(1);

  readonly filtrados = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    const gradoSeleccionado = this.grado();

    return this.servicio.analisis().filter((a) => {
      const coincideTexto =
        !texto ||
        a.paciente.toLowerCase().includes(texto) ||
        a.id.toLowerCase().includes(texto) ||
        a.archivo.toLowerCase().includes(texto);
      const coincideGrado =
        !gradoSeleccionado || a.grado === (Number(gradoSeleccionado) as GradoKL);
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
    this.rango.set('30');
    this.grado.set('');
    this.paginaActual.set(1);
  }

  irA(pagina: number): void {
    this.paginaActual.set(Math.min(Math.max(1, pagina), this.totalPaginas()));
  }
}
