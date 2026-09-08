import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Medico } from '../../../core/models/medico.model';
import { MedicosService } from '../../../core/services/medicos.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';

const POR_PAGINA = 6;

@Component({
  selector: 'app-medicos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, IconComponent, ModalComponent],
  template: `
    <div class="mx-auto max-w-7xl">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 class="text-3xl font-extrabold tracking-tight text-navy-950">Gestión de Médicos</h1>
          <p class="mt-2 text-sm text-slate-600">
            Administración de cuentas autorizadas para utilizar KODA AI.
          </p>
        </div>
        <a routerLink="/admin/medicos/nuevo" class="btn-primary shrink-0 px-5 py-3">
          <app-icon name="plus" [size]="18" />
          Crear Nueva Cuenta
        </a>
      </div>

      <!-- Indicadores -->
      <div class="mt-6 grid gap-4 sm:grid-cols-3">
        @for (kpi of indicadores(); track kpi.etiqueta) {
          <div class="card p-5">
            <p class="section-title">{{ kpi.etiqueta }}</p>
            <p class="mt-2 text-4xl font-extrabold tracking-tight text-navy-950">{{ kpi.valor }}</p>
            <p class="mt-1 text-sm text-slate-500">{{ kpi.detalle }}</p>
          </div>
        }
      </div>

      <!-- Filtros -->
      <div class="mt-6 flex flex-col gap-3 sm:flex-row">
        <div class="relative flex-1">
          <span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
            <app-icon name="search" [size]="18" />
          </span>
          <input
            type="search"
            class="field-input pl-11"
            placeholder="Buscar médico por nombre, usuario o correo…"
            aria-label="Buscar médico"
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
            aria-label="Filtrar por estado"
            [ngModel]="estado()"
            (ngModelChange)="cambiarEstado($event)"
          >
            <option value="">Estado: Todos</option>
            <option value="ACTIVO">Estado: Activos</option>
            <option value="INACTIVO">Estado: Inactivos</option>
          </select>
          <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
            <app-icon name="chevron-down" [size]="16" />
          </span>
        </div>
      </div>

      <!-- Tabla -->
      <div class="card mt-6 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full min-w-[880px] text-left">
            <caption class="sr-only">
              Cuentas de médico registradas
            </caption>
            <thead>
              <tr class="bg-navy-700 text-sm text-white">
                <th scope="col" class="px-5 py-3.5 font-bold">Nombre</th>
                <th scope="col" class="px-5 py-3.5 font-bold">Usuario</th>
                <th scope="col" class="px-5 py-3.5 font-bold">Correo</th>
                <th scope="col" class="px-5 py-3.5 font-bold">Último Acceso</th>
                <th scope="col" class="px-5 py-3.5 font-bold">Estado</th>
                <th scope="col" class="px-5 py-3.5 font-bold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (m of pagina(); track m.id) {
                <tr class="border-b border-surface-border last:border-0 hover:bg-surface-muted/60">
                  <td class="px-5 py-4">
                    <span class="flex items-center gap-3">
                      <span
                        class="flex h-9 w-9 items-center justify-center rounded-full bg-navy-100 text-navy-700"
                        aria-hidden="true"
                      >
                        <app-icon name="user" [size]="18" />
                      </span>
                      <span class="font-bold text-navy-950">{{ m.nombre }}</span>
                    </span>
                  </td>
                  <td class="px-5 py-4 text-sm text-slate-600">{{ m.usuario }}</td>
                  <td class="px-5 py-4 text-sm text-slate-600">{{ m.correo }}</td>
                  <td class="px-5 py-4 text-sm text-slate-600">{{ m.ultimoAcceso }}</td>
                  <td class="px-5 py-4">
                    <span
                      class="badge"
                      [class]="
                        m.estado === 'ACTIVO'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-600'
                      "
                    >
                      {{ m.estado === 'ACTIVO' ? 'Activo' : 'Inactivo' }}
                    </span>
                  </td>
                  <td class="px-5 py-4">
                    <span class="flex items-center gap-3">
                      <button
                        type="button"
                        class="text-slate-500 hover:text-navy-700"
                        [attr.aria-label]="'Editar la cuenta de ' + m.nombre"
                        (click)="editar(m)"
                      >
                        <app-icon name="pencil" [size]="18" />
                      </button>
                      <button
                        type="button"
                        class="text-slate-500 hover:text-navy-700"
                        [attr.aria-label]="
                          (m.estado === 'ACTIVO' ? 'Desactivar' : 'Activar') +
                          ' la cuenta de ' +
                          m.nombre
                        "
                        (click)="alternarEstado(m)"
                      >
                        <app-icon name="shield-check" [size]="18" />
                      </button>
                      <button
                        type="button"
                        class="text-red-500 hover:text-red-700"
                        [attr.aria-label]="'Eliminar la cuenta de ' + m.nombre"
                        (click)="confirmarEliminacion(m)"
                      >
                        <app-icon name="trash" [size]="18" />
                      </button>
                    </span>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6" class="px-5 py-16 text-center text-sm text-slate-500">
                    No se encontraron médicos con los criterios seleccionados.
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
            <strong>{{ filtrados().length }}</strong> médicos
          </p>
          <nav class="flex items-center gap-1" aria-label="Paginación de médicos">
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

    <!-- Confirmación de eliminación -->
    <app-modal [abierto]="!!porEliminar()" etiqueta="Confirmar eliminación" (cerrar)="porEliminar.set(null)">
      <span
        class="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600"
      >
        <app-icon name="alert-triangle" [size]="28" />
      </span>
      <h2 class="text-2xl font-extrabold text-navy-950">Eliminar cuenta</h2>
      <p class="mt-3 text-sm leading-relaxed text-slate-600">
        La cuenta de <strong>{{ porEliminar()?.nombre }}</strong> dejará de tener acceso a KODA. Esta
        acción no se puede deshacer.
      </p>
      <div class="mt-6 grid gap-3 sm:grid-cols-2">
        <button type="button" class="btn-secondary py-3" (click)="porEliminar.set(null)">
          Cancelar
        </button>
        <button
          type="button"
          class="btn bg-red-600 py-3 text-white hover:bg-red-700"
          (click)="eliminar()"
        >
          Eliminar cuenta
        </button>
      </div>
    </app-modal>
  `
})
export class MedicosComponent {
  private readonly servicio = inject(MedicosService);

  readonly busqueda = signal('');
  readonly estado = signal('');
  readonly paginaActual = signal(1);
  readonly porEliminar = signal<Medico | null>(null);

  readonly indicadores = computed(() => [
    {
      etiqueta: 'Médicos registrados',
      valor: this.servicio.totalRegistrados(),
      detalle: 'Cuentas totales'
    },
    {
      etiqueta: 'Médicos activos',
      valor: this.servicio.totalActivos(),
      detalle: 'Sesiones habilitadas'
    },
    {
      etiqueta: 'Médicos inactivos',
      valor: this.servicio.totalInactivos(),
      detalle: 'Acceso suspendido'
    }
  ]);

  readonly filtrados = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    const estadoSeleccionado = this.estado();

    return this.servicio.medicos().filter((m) => {
      const coincideTexto =
        !texto ||
        m.nombre.toLowerCase().includes(texto) ||
        m.usuario.toLowerCase().includes(texto) ||
        m.correo.toLowerCase().includes(texto);
      const coincideEstado = !estadoSeleccionado || m.estado === estadoSeleccionado;
      return coincideTexto && coincideEstado;
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

  cambiarEstado(valor: string): void {
    this.estado.set(valor);
    this.paginaActual.set(1);
  }

  irA(pagina: number): void {
    this.paginaActual.set(Math.min(Math.max(1, pagina), this.totalPaginas()));
  }

  alternarEstado(medico: Medico): void {
    this.servicio.cambiarEstado(medico.id).subscribe();
  }

  editar(medico: Medico): void {
    // Pendiente: pantalla de edición (misma estructura que "Crear Nueva Cuenta").
  }

  confirmarEliminacion(medico: Medico): void {
    this.porEliminar.set(medico);
  }

  eliminar(): void {
    const medico = this.porEliminar();
    if (!medico) return;
    this.servicio.eliminar(medico.id).subscribe(() => {
      this.porEliminar.set(null);
      this.irA(this.paginaActual());
    });
  }
}
