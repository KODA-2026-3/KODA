import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AnalisisResponse } from '../models/analisis.model';

/** Servicio para consultar todos los análisis del sistema (solo ADMIN). */
@Injectable({ providedIn: 'root' })
export class AdminAnalisisService {
  private readonly http = inject(HttpClient);

  private readonly _analisis = signal<AnalisisResponse[]>([]);
  readonly analisis = this._analisis.asReadonly();

  readonly totalAnalisis = signal(0);

  listar(): Observable<AnalisisResponse[]> {
    return this.http.get<AnalisisResponse[]>(`${environment.apiBaseUrl}/analisis`).pipe(
      tap((lista) => {
        this._analisis.set(lista);
        this.totalAnalisis.set(lista.length);
      })
    );
  }
}
