import { Injectable, signal } from '@angular/core';
import { Observable, delay, map, of } from 'rxjs';

import { Analisis, GradoKL } from '../models/analisis.model';

const IMG = 'assets/mock/radiografia-demo.svg';
const HEAT = 'assets/mock/heatmap-demo.svg';

function distribucion(grado: GradoKL, confianza: number) {
  const resto = (100 - confianza) / 4;
  return ([0, 1, 2, 3, 4] as GradoKL[]).map((g) => ({
    grado: g,
    probabilidad: g === grado ? confianza : Math.max(1, Math.round(resto))
  }));
}

/**
 * Analisis de radiografias e historial.
 *
 * Implementacion temporal en memoria. Los endpoints reales son
 * POST /api/analisis (backend) -> POST /api/predecir (servicio de inferencia)
 * y GET /api/analisis para el historial.
 */
@Injectable({ providedIn: 'root' })
export class AnalisisService {
  private readonly _analisis = signal<Analisis[]>([
    this.crear('KL-8820', '2026-05-15', 'Rodríguez, Carlos', 'radiografia_rodilla_izq.png', 'IZQUIERDA', 2, 87),
    this.crear('KL-8819', '2026-05-14', 'Alvarez, Beatriz', 'rx_rodilla_der_v2.jpg', 'DERECHA', 4, 94),
    this.crear('KL-8818', '2026-05-12', 'Mendoza, Héctor', 'knee_l_lateral.png', 'IZQUIERDA', 0, 99),
    this.crear('KL-8817', '2026-05-10', 'Gómez, Sofía', 'rx_sofia_gomez.png', 'DERECHA', 1, 81),
    this.crear('KL-8816', '2026-05-09', 'Vázquez, Eduardo', 'vazquez_izq_anterior.jpg', 'IZQUIERDA', 3, 89),
    this.crear('KL-8815', '2026-05-05', 'Peralta, Laura', 'laura_peralta_rx.png', 'DERECHA', 2, 91),
    this.crear('KL-8814', '2026-05-02', 'Ibáñez, Ramiro', 'ibanez_rodilla.png', 'IZQUIERDA', 3, 78),
    this.crear('KL-8813', '2026-04-28', 'Suárez, Camila', 'csuarez_der.jpg', 'DERECHA', 0, 96)
  ]);

  readonly analisis = this._analisis.asReadonly();
  /** Total reportado por el backend; hoy se deriva del listado en memoria. */
  readonly total = signal(142);

  listar(): Observable<Analisis[]> {
    return of(this._analisis()).pipe(delay(300));
  }

  obtener(id: string): Observable<Analisis | undefined> {
    return of(this._analisis().find((a) => a.id === id)).pipe(delay(200));
  }

  /**
   * Envia la radiografia al servicio de inferencia.
   * Devuelve el analisis creado; el componente de progreso simula el avance.
   */
  analizar(archivo: File): Observable<Analisis> {
    const siguiente = this.crear(
      `KL-${8821 + this._analisis().length - 8}`,
      new Date().toISOString().slice(0, 10),
      'Paciente sin asignar',
      archivo.name,
      'IZQUIERDA',
      2,
      87
    );

    return of(siguiente).pipe(
      delay(2600),
      map((a) => {
        this._analisis.update((lista) => [a, ...lista]);
        this.total.update((t) => t + 1);
        return a;
      })
    );
  }

  private crear(
    id: string,
    fecha: string,
    paciente: string,
    archivo: string,
    lateralidad: 'IZQUIERDA' | 'DERECHA',
    grado: GradoKL,
    confianza: number
  ): Analisis {
    return {
      id,
      fecha,
      paciente,
      archivo,
      lateralidad,
      grado,
      confianza,
      miniatura: IMG,
      imagenOriginal: IMG,
      heatmap: HEAT,
      distribucion: distribucion(grado, confianza)
    };
  }
}
