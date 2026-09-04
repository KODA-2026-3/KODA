import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { IconComponent, IconName } from '../../shared/components/icon/icon.component';

interface ItemNavegacion {
  ruta: string;
  etiqueta: string;
  icono: IconName;
}

/** Marco comun de la aplicacion: barra lateral, cabecera y area de contenido. */
@Component({
  selector: 'app-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  template: `
    <div class="flex min-h-screen bg-surface-muted">
      <!-- Barra lateral -->
      <aside
        class="fixed inset-y-0 left-0 z-40 flex w-60 -translate-x-full flex-col bg-navy-900 transition-transform lg:translate-x-0"
        [class.translate-x-0]="menuAbierto()"
      >
        <div class="flex items-center gap-3 px-6 py-6">
          <span
            class="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-lg font-extrabold text-navy-900"
            >K</span
          >
          <span class="leading-tight">
            <span class="block text-lg font-extrabold tracking-tight text-white">KODA</span>
            <span class="block text-[10px] font-semibold uppercase tracking-[0.18em] text-navy-300">
              Medical AI
            </span>
          </span>
        </div>

        <nav class="flex-1 space-y-1 px-3" aria-label="Navegación principal">
          @for (item of navegacion(); track item.ruta) {
            <a
              [routerLink]="item.ruta"
              routerLinkActive="bg-navy-700/70 text-white"
              #rla="routerLinkActive"
              class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-navy-200 transition-colors hover:bg-navy-800 hover:text-white"
              [attr.aria-current]="rla.isActive ? 'page' : null"
              (click)="menuAbierto.set(false)"
            >
              <app-icon [name]="item.icono" [size]="18" />
              {{ item.etiqueta }}
            </a>
          }
        </nav>

        <div class="px-3 pb-6">
          @if (version) {
            <p class="px-3 pb-4 text-[11px] leading-relaxed text-navy-400">
              KODA AI {{ version }}<br />{{ usuario()?.institucion }}
            </p>
          }
          <button
            type="button"
            class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-navy-200 transition-colors hover:bg-navy-800 hover:text-white"
            (click)="cerrarSesion()"
          >
            <app-icon name="log-out" [size]="18" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      @if (menuAbierto()) {
        <div
          class="fixed inset-0 z-30 bg-navy-900/50 lg:hidden"
          (click)="menuAbierto.set(false)"
          aria-hidden="true"
        ></div>
      }

      <!-- Contenido -->
      <div class="flex min-w-0 flex-1 flex-col lg:pl-60">
        <header
          class="sticky top-0 z-20 flex h-[72px] items-center justify-between gap-4 border-b border-surface-border bg-white px-4 sm:px-8"
        >
          <div class="flex items-center gap-3">
            <button
              type="button"
              class="btn-ghost -ml-2 px-2 lg:hidden"
              aria-label="Abrir menú"
              (click)="menuAbierto.set(true)"
            >
              <app-icon name="sliders" [size]="20" />
            </button>
            <span class="hidden items-center gap-2 text-sm font-medium text-slate-600 sm:flex">
              <span class="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true"></span>
              Servidor Conectado · GPU Activa
            </span>
            @if (usuario()?.institucion) {
              <span class="hidden items-center gap-2 text-sm text-slate-500 xl:flex">
                <span class="text-surface-border" aria-hidden="true">|</span>
                <app-icon name="hospital" [size]="16" />
                {{ usuario()?.institucion }}
              </span>
            }
          </div>

          <div class="flex items-center gap-3">
            <div class="text-right leading-tight">
              <p class="text-sm font-bold text-navy-950">{{ usuario()?.nombre }}</p>
              <p class="text-xs text-slate-500">{{ subtitulo() }}</p>
            </div>
            <span
              class="flex h-10 w-10 items-center justify-center rounded-full bg-navy-100 text-sm font-bold text-navy-700"
              aria-hidden="true"
            >
              {{ usuario()?.iniciales }}
            </span>
          </div>
        </header>

        <main class="flex-1 px-4 py-8 sm:px-8">
          <router-outlet />
        </main>
      </div>
    </div>
  `
})
export class ShellComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly version = 'v2.4.0';
  readonly usuario = this.auth.usuario;
  readonly menuAbierto = signal(false);

  private readonly navMedico: ItemNavegacion[] = [
    { ruta: '/app/cargar', etiqueta: 'Cargar Radiografía', icono: 'upload-cloud' },
    { ruta: '/app/historial', etiqueta: 'Historial de Análisis', icono: 'file-text' },
    { ruta: '/app/perfil', etiqueta: 'Mi Perfil', icono: 'user' }
  ];

  private readonly navAdmin: ItemNavegacion[] = [
    { ruta: '/admin/medicos', etiqueta: 'Gestión de Médicos', icono: 'users' },
    { ruta: '/admin/configuracion', etiqueta: 'Configuración', icono: 'sliders' }
  ];

  readonly navegacion = computed(() =>
    this.auth.rol() === 'ADMIN' ? this.navAdmin : this.navMedico
  );

  readonly subtitulo = computed(() => {
    const u = this.usuario();
    if (!u) return '';
    if (u.rol === 'ADMIN') return 'Administrador General';
    return [u.especialidad, u.matricula].filter(Boolean).join(' · ');
  });

  cerrarSesion(): void {
    this.auth.cerrarSesion();
    void this.router.navigate(['/login']);
  }
}
