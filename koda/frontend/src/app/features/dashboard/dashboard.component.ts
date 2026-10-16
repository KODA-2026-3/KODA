import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';

import { ETIQUETAS_KL, GradoKL } from '../../core/models/analisis.model';
import { EstadisticasService } from '../../core/services/estadisticas.service';
import { IconComponent } from '../../shared/components/icon/icon.component';

/** Colores Tailwind (config kl.0..kl.4) para las barras de distribución KL. */
const COLOR_KL: Record<GradoKL, string> = {
  0: 'bg-kl-0',
  1: 'bg-kl-1',
  2: 'bg-kl-2',
  3: 'bg-kl-3',
  4: 'bg-kl-4'
};

interface BarraDia {
  fecha: string;
  etiqueta: string;
  cantidad: number;
  alturaPct: number;
}

interface BarraGrado {
  grado: GradoKL;
  etiqueta: string;
  cantidad: number;
  porcentaje: number;
  color: string;
}

/** Panel personal del medico: su propia actividad de diagnostico, no la de otros. */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="mx-auto max-w-7xl">
      <div>
        <h1 class="text-3xl font-extrabold tracking-tight text-navy-950">Mi Dashboard</h1>
        <p class="mt-2 text-sm text-slate-600">Resumen de tu actividad de diagnóstico en KODA.</p>
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

      <!-- Indicadores -->
      <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        @for (kpi of indicadores(); track kpi.etiqueta) {
          <div class="card p-5">
            <div class="flex items-center gap-2 text-slate-500">
              <app-icon [name]="kpi.icono" [size]="18" />
              <p class="section-title">{{ kpi.etiqueta }}</p>
            </div>
            <p class="mt-2 text-4xl font-extrabold tracking-tight text-navy-950">
              {{ cargando() ? '—' : kpi.valor }}
            </p>
            <p class="mt-1 text-sm text-slate-500">{{ kpi.detalle }}</p>
          </div>
        }
      </div>

      <div class="mt-6 grid gap-6 lg:grid-cols-5">
        <!-- Radiografias por dia -->
        <div class="card p-6 lg:col-span-3">
          <p class="section-title">Radiografías analizadas (esta semana)</p>

          @if (!cargando() && barrasDias().length > 0) {
            <div class="mt-6 flex h-48 items-end gap-2 sm:gap-3">
              @for (dia of barrasDias(); track dia.fecha) {
                <div class="flex flex-1 flex-col items-center gap-2">
                  <div
                    class="flex w-full flex-1 items-end"
                    [attr.aria-label]="dia.etiqueta + ': ' + dia.cantidad + ' radiografías'"
                  >
                    <div
                      class="w-full rounded-t bg-navy-600 transition-all"
                      [style.height.%]="dia.alturaPct"
                      [title]="dia.etiqueta + ': ' + dia.cantidad"
                    ></div>
                  </div>
                  <span class="text-[11px] font-medium text-slate-400">{{ dia.etiqueta }}</span>
                </div>
              }
            </div>
          } @else if (!cargando()) {
            <p class="mt-6 py-12 text-center text-sm text-slate-500">
              Todavía no has analizado radiografías esta semana.
            </p>
          }
        </div>

        <!-- Distribucion KL -->
        <div class="card p-6 lg:col-span-2">
          <p class="section-title">Tus diagnósticos por grado KL</p>

          @if (!cargando()) {
            <div class="mt-6 space-y-4">
              @for (grado of barrasGrado(); track grado.grado) {
                <div>
                  <div class="mb-1 flex items-center justify-between text-sm">
                    <span class="font-semibold text-navy-950">{{ grado.etiqueta }}</span>
                    <span class="text-slate-500">{{ grado.cantidad }}</span>
                  </div>
                  <div class="h-2.5 w-full overflow-hidden rounded-full bg-surface-muted">
                    <div
                      class="h-full rounded-full transition-all"
                      [class]="grado.color"
                      [style.width.%]="grado.porcentaje"
                    ></div>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  private readonly servicio = inject(EstadisticasService);

  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);

  readonly indicadores = computed(() => {
    const datos = this.servicio.personales();
    return [
      {
        etiqueta: 'Radiografías hoy',
        icono: 'upload-cloud' as const,
        valor: datos?.radiografiasHoy ?? 0,
        detalle: 'En las últimas 24 horas'
      },
      {
        etiqueta: 'Radiografías esta semana',
        icono: 'calendar' as const,
        valor: datos?.radiografiasSemana ?? 0,
        detalle: 'Últimos 7 días'
      },
      {
        etiqueta: 'Radiografías totales',
        icono: 'file-text' as const,
        valor: datos?.totalRadiografias ?? 0,
        detalle: 'Analizadas por ti'
      },
      {
        etiqueta: 'Confianza promedio',
        icono: 'shield-check' as const,
        valor: `${Math.round((datos?.confianzaPromedio ?? 0) * 100)}%`,
        detalle: 'De tus predicciones'
      }
    ];
  });

  readonly barrasDias = computed<BarraDia[]>(() => {
    const dias = this.servicio.personales()?.radiografiasPorDia ?? [];
    const maximo = Math.max(1, ...dias.map((d) => d.cantidad));

    return dias.map((d) => ({
      fecha: d.fecha,
      etiqueta: this.etiquetaDia(d.fecha),
      cantidad: d.cantidad,
      // Altura minima para que un dia en 0 siga siendo visible como base.
      alturaPct: d.cantidad === 0 ? 3 : Math.max(6, (d.cantidad / maximo) * 100)
    }));
  });

  readonly barrasGrado = computed<BarraGrado[]>(() => {
    const grados = this.servicio.personales()?.distribucionKL ?? [];
    const total = Math.max(1, grados.reduce((suma, g) => suma + g.cantidad, 0));

    return grados.map((g) => ({
      grado: g.gradoKL,
      etiqueta: `Grado ${g.gradoKL} · ${ETIQUETAS_KL[g.gradoKL]}`,
      cantidad: g.cantidad,
      porcentaje: (g.cantidad / total) * 100,
      color: COLOR_KL[g.gradoKL]
    }));
  });

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.servicio.obtenerPersonales().subscribe({
      next: () => this.cargando.set(false),
      error: (e: Error) => {
        this.cargando.set(false);
        this.error.set(e.message);
      }
    });
  }

  /** "2026-09-24" -> "Jue 24". */
  private etiquetaDia(fecha: string): string {
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const [anio, mes, dia] = fecha.split('-').map(Number);
    const fechaLocal = new Date(anio, mes - 1, dia);
    return `${dias[fechaLocal.getDay()]} ${dia}`;
  }
}
