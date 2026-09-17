import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, from, map, of, switchMap, tap, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Analisis, GradoKL, Lateralidad } from '../models/analisis.model';

/** Respuesta de POST /predict (ResultadoDTO del backend). */
interface ResultadoDTO {
  analisisId: number;
  prediccion: {
    gradoKL: GradoKL;
    confianza: number;
    probabilidades: number[];
    heatmapBase64: string;
    modelo: string;
  };
  fechaAnalisis: string;
  nombreArchivo: string;
  tiempoProcesamientoMs: number;
}

const IMG_DEMO = 'assets/mock/radiografia-demo.svg';
const HEAT_DEMO = 'assets/mock/heatmap-demo.svg';

/**
 * Convierte probabilidades en porcentajes enteros que suman exactamente 100,
 * repartiendo los puntos faltantes a los mayores restos (metodo de Hamilton).
 * Redondear cada valor por separado puede dar 99 o 101.
 */
export function aPorcentajes(probabilidades: number[]): number[] {
  const crudos = probabilidades.map((p) => p * 100);
  const enteros = crudos.map(Math.floor);
  let faltantes = 100 - enteros.reduce((suma, v) => suma + v, 0);

  crudos
    .map((valor, indice) => ({ indice, resto: valor - Math.floor(valor) }))
    .sort((a, b) => b.resto - a.resto)
    .forEach(({ indice }) => {
      if (faltantes > 0) {
        enteros[indice]++;
        faltantes--;
      }
    });

  return enteros;
}

/**
 * Analisis de radiografias.
 *
 * analizar() usa el backend real (POST /predict). El historial sigue mostrando
 * registros de demostracion: listar los analisis guardados depende de la
 * decision pendiente sobre si se conservan las imagenes (el SDD y el SRS se
 * contradicen), porque sin ellas no se puede volver a abrir un resultado.
 */
@Injectable({ providedIn: 'root' })
export class AnalisisService {
  private readonly http = inject(HttpClient);

  private readonly _analisis = signal<Analisis[]>([
    this.demo('KL-8820', '2026-05-15', 'rx_000820.png', 'IZQUIERDA', [4, 6, 55, 30, 5]),
    this.demo('KL-8819', '2026-05-14', 'rx_000819.jpg', 'DERECHA', [1, 2, 3, 10, 84]),
    this.demo('KL-8818', '2026-05-12', 'rx_000818.png', 'IZQUIERDA', [91, 6, 2, 1, 0]),
    this.demo('KL-8817', '2026-05-10', 'rx_000817.png', 'DERECHA', [22, 61, 12, 4, 1]),
    this.demo('KL-8816', '2026-05-09', 'rx_000816.jpg', 'IZQUIERDA', [2, 5, 18, 68, 7]),
    this.demo('KL-8815', '2026-05-05', 'rx_000815.png', 'DERECHA', [5, 14, 71, 8, 2]),
    this.demo('KL-8814', '2026-05-02', 'rx_000814.png', 'IZQUIERDA', [3, 7, 24, 58, 8]),
    this.demo('KL-8813', '2026-04-28', 'rx_000813.jpg', 'DERECHA', [88, 9, 2, 1, 0])
  ]);

  readonly analisis = this._analisis.asReadonly();
  /** Contador de la tarjeta de perfil; se reemplaza cuando exista el listado real. */
  readonly total = signal(142);

  obtener(id: string): Observable<Analisis | null> {
    return of(this._analisis().find((a) => a.id === id) ?? null);
  }

  /** Envia la radiografia al backend y devuelve el analisis ya registrado. */
  analizar(archivo: File): Observable<Analisis> {
    const cuerpo = new FormData();
    cuerpo.append('imagen', archivo, archivo.name);

    // La imagen original se conserva como data URL: el resultado debe poder
    // mostrarla aunque la pantalla de carga ya haya liberado su vista previa.
    return from(this.leerComoDataUrl(archivo)).pipe(
      switchMap((imagenOriginal) =>
        this.http
          .post<ResultadoDTO>(`${environment.apiBaseUrl}/predict`, cuerpo)
          .pipe(map((respuesta) => this.aAnalisis(respuesta, imagenOriginal)))
      ),
      tap((analisis) => {
        this._analisis.update((lista) => [analisis, ...lista]);
        this.total.update((t) => t + 1);
      }),
      catchError((error: unknown) => throwError(() => this.aError(error)))
    );
  }

  private aAnalisis(r: ResultadoDTO, imagenOriginal: string): Analisis {
    const porcentajes = aPorcentajes(r.prediccion.probabilidades);
    const grado = r.prediccion.gradoKL;

    return {
      id: `KL-${r.analisisId}`,
      fecha: r.fechaAnalisis.slice(0, 10),
      archivo: r.nombreArchivo,
      grado,
      // Se toma del mismo reparto que las barras, para que el anillo y la
      // barra del grado predicho muestren el mismo numero.
      confianza: porcentajes[grado],
      miniatura: imagenOriginal,
      imagenOriginal,
      heatmap: `data:image/png;base64,${r.prediccion.heatmapBase64}`,
      distribucion: porcentajes.map((probabilidad, g) => ({ grado: g as GradoKL, probabilidad })),
      modelo: r.prediccion.modelo,
      tiempoProcesamientoMs: r.tiempoProcesamientoMs
    };
  }

  private aError(error: unknown): Error {
    if (!(error instanceof HttpErrorResponse)) {
      return new Error('No se pudo leer la imagen seleccionada.');
    }
    if (error.status === 0) {
      return new Error('No se pudo contactar al servidor. Verifique su conexión e intente nuevamente.');
    }
    if (error.status === 401) {
      return new Error('Su sesión expiró. Inicie sesión nuevamente para continuar.');
    }
    if (error.status === 403) {
      return new Error('Su cuenta no tiene permisos para analizar radiografías.');
    }
    return new Error(error.error?.mensaje ?? 'Ocurrió un error al analizar la radiografía.');
  }

  private leerComoDataUrl(archivo: File): Promise<string> {
    return new Promise((resolver, rechazar) => {
      const lector = new FileReader();
      lector.onload = () => resolver(lector.result as string);
      lector.onerror = () => rechazar(lector.error);
      lector.readAsDataURL(archivo);
    });
  }

  /** Registro de demostracion: sin datos de pacientes y marcado como tal. */
  private demo(
    id: string,
    fecha: string,
    archivo: string,
    lateralidad: Lateralidad,
    porcentajes: number[]
  ): Analisis {
    const grado = porcentajes.indexOf(Math.max(...porcentajes)) as GradoKL;
    return {
      id,
      fecha,
      archivo,
      lateralidad,
      grado,
      confianza: porcentajes[grado],
      miniatura: IMG_DEMO,
      imagenOriginal: IMG_DEMO,
      heatmap: HEAT_DEMO,
      distribucion: porcentajes.map((probabilidad, g) => ({ grado: g as GradoKL, probabilidad })),
      modelo: 'demostracion'
    };
  }
}
