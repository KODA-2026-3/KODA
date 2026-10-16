import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, tap, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Estadisticas, EstadisticasPersonales } from '../models/estadisticas.model';

/**
 * Metricas de uso de la plataforma: /estadisticas (panel del administrador)
 * y /estadisticas/personales (actividad propia, para el medico).
 */
@Injectable({ providedIn: 'root' })
export class EstadisticasService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/estadisticas`;

  private readonly _estadisticas = signal<Estadisticas | null>(null);
  private readonly _personales = signal<EstadisticasPersonales | null>(null);

  readonly estadisticas = this._estadisticas.asReadonly();
  readonly personales = this._personales.asReadonly();

  obtener(): Observable<Estadisticas> {
    return this.http.get<Estadisticas>(this.url).pipe(
      tap((datos) => this._estadisticas.set(datos)),
      catchError((e: HttpErrorResponse) => throwError(() => this.aError(e)))
    );
  }

  obtenerPersonales(): Observable<EstadisticasPersonales> {
    return this.http.get<EstadisticasPersonales>(`${this.url}/personales`).pipe(
      tap((datos) => this._personales.set(datos)),
      catchError((e: HttpErrorResponse) => throwError(() => this.aError(e)))
    );
  }

  /** Traduce la respuesta del backend a un mensaje mostrable. */
  private aError(error: HttpErrorResponse): Error {
    if (error.status === 0) {
      return new Error('No se pudo contactar al servidor. Verifique que el backend esté en ejecución.');
    }
    if (error.status === 403) {
      return new Error('No tiene permisos para ver esta información.');
    }
    return new Error(error.error?.mensaje ?? 'Ocurrió un error al cargar las estadísticas.');
  }
}
