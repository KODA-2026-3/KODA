import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable, catchError, map, of, switchMap, timer } from 'rxjs';

import { environment } from '../../../environments/environment';

/** Respuesta de GET /actuator/health (endpoint publico del backend). */
interface RespuestaHealth {
  status: 'UP' | 'DOWN' | string;
  components?: {
    db?: { status: string };
    moduloIA?: { status: string; details?: { modelo?: string } };
  };
}

export type NivelEstado = 'verificando' | 'ok' | 'advertencia' | 'error';

export interface EstadoSistema {
  nivel: NivelEstado;
  mensaje: string;
}

/** Nombres legibles de los clasificadores que informa el servicio de inferencia. */
const NOMBRES_MODELO: Record<string, string> = {
  diko_stage2: 'DIKO_Stage2'
};

const INTERVALO_MS = 30_000;

/**
 * Estado real de la plataforma para la cabecera: backend, base de datos y
 * modulo de IA, segun el health check del backend (ADR-03).
 */
@Injectable({ providedIn: 'root' })
export class EstadoSistemaService {
  private readonly http = inject(HttpClient);

  readonly estado = toSignal(
    timer(0, INTERVALO_MS).pipe(switchMap(() => this.consultar())),
    { initialValue: { nivel: 'verificando', mensaje: 'Verificando servicios…' } as EstadoSistema }
  );

  private consultar(): Observable<EstadoSistema> {
    return this.http.get<RespuestaHealth>(`${environment.apiBaseUrl}/actuator/health`).pipe(
      map((respuesta) => this.interpretar(respuesta)),
      catchError((error: HttpErrorResponse) =>
        // Con algun componente caido el backend responde 503, pero el cuerpo
        // sigue trayendo el detalle de cada componente.
        of<EstadoSistema>(
          error.status === 503 && error.error?.components
            ? this.interpretar(error.error as RespuestaHealth)
            : { nivel: 'error', mensaje: 'Servidor no disponible' }
        )
      )
    );
  }

  private interpretar(respuesta: RespuestaHealth): EstadoSistema {
    const { db, moduloIA } = respuesta.components ?? {};

    if (db?.status !== 'UP') {
      return { nivel: 'error', mensaje: 'Base de datos no disponible' };
    }
    if (moduloIA?.status !== 'UP') {
      return { nivel: 'error', mensaje: 'Modelo IA no disponible' };
    }

    const modelo = moduloIA.details?.modelo ?? 'desconocido';
    if (modelo === 'simulado') {
      return { nivel: 'advertencia', mensaje: 'Modelo IA simulado · sin validez clínica' };
    }
    return { nivel: 'ok', mensaje: `Modelo IA conectado · ${NOMBRES_MODELO[modelo] ?? modelo}` };
  }
}
