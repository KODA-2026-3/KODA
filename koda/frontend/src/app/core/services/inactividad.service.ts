import { Injectable, NgZone, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from './auth.service';

/** Minutos sin actividad tras los cuales se muestra la advertencia. */
export const MINUTOS_ADVERTENCIA = 10;
/** Minutos sin actividad tras los cuales se cierra la sesión. */
export const MINUTOS_EXPIRACION = 20;

/** Valor del query param con el que el login reconoce el cierre por inactividad. */
export const MOTIVO_INACTIVIDAD = 'inactividad';

const MS_ADVERTENCIA = MINUTOS_ADVERTENCIA * 60_000;
const MS_EXPIRACION = MINUTOS_EXPIRACION * 60_000;
const INTERVALO_REVISION_MS = 1_000;
/** Cada cuánto, como máximo, se persiste la última actividad (evita escribir en cada mousemove). */
const INTERVALO_PERSISTENCIA_MS = 5_000;
const CLAVE_ULTIMA_ACTIVIDAD = 'koda.ultimaActividad';

const EVENTOS_ACTIVIDAD = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'wheel'];

/**
 * Vigila la actividad del usuario mientras hay sesión abierta.
 *
 * - A los {@link MINUTOS_ADVERTENCIA} minutos sin actividad activa `advertenciaVisible`.
 * - A los {@link MINUTOS_EXPIRACION} minutos cierra la sesión y redirige al login.
 *
 * Se basa en marcas de tiempo (no en temporizadores largos), así que funciona aunque el
 * navegador suspenda la pestaña. La última actividad se comparte vía localStorage para que
 * varias pestañas abiertas no se cierren mientras el usuario trabaja en otra.
 */
@Injectable({ providedIn: 'root' })
export class InactividadService {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly zona = inject(NgZone);

  private ultimaActividad = Date.now();
  private ultimaPersistencia = 0;
  private intervalo: ReturnType<typeof setInterval> | null = null;
  private readonly alActividad = () => this.registrarActividad();

  private readonly _advertenciaVisible = signal(false);
  private readonly _segundosRestantes = signal(0);

  readonly advertenciaVisible = this._advertenciaVisible.asReadonly();
  readonly segundosRestantes = this._segundosRestantes.asReadonly();
  /** Tiempo restante en formato mm:ss. */
  readonly tiempoRestante = computed(() => {
    const total = this._segundosRestantes();
    const min = Math.floor(total / 60);
    const seg = total % 60;
    return `${min}:${seg.toString().padStart(2, '0')}`;
  });

  iniciar(): void {
    if (this.intervalo !== null) return;

    this.ultimaActividad = Date.now();
    this.persistir(true);
    this._advertenciaVisible.set(false);

    this.zona.runOutsideAngular(() => {
      for (const evento of EVENTOS_ACTIVIDAD) {
        window.addEventListener(evento, this.alActividad, { passive: true });
      }
      this.intervalo = setInterval(() => this.revisar(), INTERVALO_REVISION_MS);
    });
  }

  detener(): void {
    for (const evento of EVENTOS_ACTIVIDAD) {
      window.removeEventListener(evento, this.alActividad);
    }
    if (this.intervalo !== null) {
      clearInterval(this.intervalo);
      this.intervalo = null;
    }
    this._advertenciaVisible.set(false);
  }

  /** Acción explícita del usuario desde la advertencia ("Seguir conectado"). */
  continuarSesion(): void {
    this.ultimaActividad = Date.now();
    this.persistir(true);
    this._advertenciaVisible.set(false);
  }

  private registrarActividad(): void {
    // Con la advertencia en pantalla solo el botón la descarta, para que el usuario la vea.
    if (this._advertenciaVisible()) return;
    this.ultimaActividad = Date.now();
    this.persistir(false);
  }

  private revisar(): void {
    const ultima = Math.max(this.ultimaActividad, this.leerActividadCompartida());
    const inactivo = Date.now() - ultima;

    if (inactivo >= MS_EXPIRACION) {
      this.zona.run(() => this.expirar());
      return;
    }

    if (inactivo >= MS_ADVERTENCIA) {
      const restantes = Math.ceil((MS_EXPIRACION - inactivo) / 1000);
      if (!this._advertenciaVisible() || this._segundosRestantes() !== restantes) {
        this.zona.run(() => {
          this._segundosRestantes.set(restantes);
          this._advertenciaVisible.set(true);
        });
      }
    } else if (this._advertenciaVisible()) {
      // Otra pestaña registró actividad: se oculta la advertencia aquí también.
      this.ultimaActividad = ultima;
      this.zona.run(() => this._advertenciaVisible.set(false));
    }
  }

  private expirar(): void {
    this.detener();
    try {
      localStorage.removeItem(CLAVE_ULTIMA_ACTIVIDAD);
    } catch {
      /* almacenamiento no disponible */
    }
    this.auth.cerrarSesion();
    void this.router.navigate(['/login'], { queryParams: { motivo: MOTIVO_INACTIVIDAD } });
  }

  private persistir(forzar: boolean): void {
    const ahora = Date.now();
    if (!forzar && ahora - this.ultimaPersistencia < INTERVALO_PERSISTENCIA_MS) return;
    this.ultimaPersistencia = ahora;
    try {
      localStorage.setItem(CLAVE_ULTIMA_ACTIVIDAD, String(this.ultimaActividad));
    } catch {
      /* almacenamiento no disponible: se usa solo el valor en memoria */
    }
  }

  private leerActividadCompartida(): number {
    try {
      return Number(localStorage.getItem(CLAVE_ULTIMA_ACTIVIDAD)) || 0;
    } catch {
      return 0;
    }
  }
}
