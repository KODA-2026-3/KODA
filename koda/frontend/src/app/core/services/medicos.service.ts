import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, tap, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { EdicionMedico, Medico, NuevoMedico } from '../models/medico.model';

/**
 * Gestion de cuentas de medico contra /api/medicos.
 * El listado se cachea en una senal para que la tabla y los indicadores
 * se actualicen solos despues de crear, editar o eliminar.
 */
@Injectable({ providedIn: 'root' })
export class MedicosService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/medicos`;

  private readonly _medicos = signal<Medico[]>([]);

  readonly medicos = this._medicos.asReadonly();
  readonly totalRegistrados = computed(() => this._medicos().length);

  listar(): Observable<Medico[]> {
    return this.http.get<Medico[]>(this.url).pipe(
      tap((medicos) => this._medicos.set(medicos)),
      catchError((e: HttpErrorResponse) => throwError(() => this.aError(e)))
    );
  }

  obtener(id: string): Observable<Medico> {
    return this.http
      .get<Medico>(`${this.url}/${id}`)
      .pipe(catchError((e: HttpErrorResponse) => throwError(() => this.aError(e))));
  }

  crear(datos: NuevoMedico): Observable<Medico> {
    return this.http.post<Medico>(this.url, datos).pipe(
      tap((medico) => this._medicos.update((lista) => [...lista, medico])),
      catchError((e: HttpErrorResponse) => throwError(() => this.aError(e)))
    );
  }

  actualizar(id: string, datos: EdicionMedico): Observable<Medico> {
    return this.http.put<Medico>(`${this.url}/${id}`, datos).pipe(
      tap((medico) =>
        this._medicos.update((lista) => lista.map((m) => (m.id === id ? medico : m)))
      ),
      catchError((e: HttpErrorResponse) => throwError(() => this.aError(e)))
    );
  }

  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`).pipe(
      tap(() => this._medicos.update((lista) => lista.filter((m) => m.id !== id))),
      catchError((e: HttpErrorResponse) => throwError(() => this.aError(e)))
    );
  }

  /** Traduce la respuesta del backend a un mensaje mostrable. */
  private aError(error: HttpErrorResponse): Error {
    if (error.status === 0) {
      return new Error('No se pudo contactar al servidor. Verifique que el backend esté en ejecución.');
    }
    if (error.status === 403) {
      return new Error('No tiene permisos para realizar esta operación.');
    }
    if (error.status === 404) {
      return new Error('La cuenta indicada ya no existe.');
    }
    return new Error(error.error?.mensaje ?? 'Ocurrió un error al procesar la solicitud.');
  }
}
