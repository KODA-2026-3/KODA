import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, forkJoin, from, map, of, switchMap, tap, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Analisis, GradoKL } from '../models/analisis.model';

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
  imagenExpiraEn: string;
}

/** Analisis del historial: GET /analisis y GET /analisis/{id} (AnalisisResumenDTO). */
interface AnalisisResumenDTO {
  analisisId: number;
  fechaAnalisis: string;
  nombreArchivo: string;
  gradoKL: GradoKL;
  confianza: number;
  /** Vacia en los analisis anteriores a que se registraran. */
  probabilidades: number[];
  modelo: string;
  tiempoProcesamientoMs: number;
  imagenDisponible: boolean;
  imagenExpiraEn: string | null;
}

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
 * Analisis de radiografias e historial del medico.
 *
 * El backend conserva la radiografia y el mapa de calor durante un plazo
 * (7 dias por defecto); despues solo queda el resultado. Las imagenes se piden
 * con el token de la sesion y se muestran como data URL: una etiqueta <img>
 * no puede enviar el encabezado Authorization.
 */
@Injectable({ providedIn: 'root' })
export class AnalisisService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiBaseUrl}/analisis`;

  private readonly _analisis = signal<Analisis[]>([]);

  readonly analisis = this._analisis.asReadonly();
  readonly total = computed(() => this._analisis().length);

  /** Trae del backend los analisis del medico, del mas reciente al mas antiguo. */
  cargarHistorial(): Observable<Analisis[]> {
    return this.http.get<AnalisisResumenDTO[]>(this.url).pipe(
      map((lista) => lista.map((r) => this.desdeResumen(r))),
      tap((lista) => this._analisis.set(lista)),
      catchError((error: unknown) =>
        throwError(() => this.aError(error, 'No se pudo cargar el historial de análisis.'))
      )
    );
  }

  /** null si el analisis no existe, es de otro medico o no se pudo cargar. */
  obtener(id: string): Observable<Analisis | null> {
    // Un analisis recien hecho ya tiene sus imagenes en memoria.
    const reciente = this._analisis().find((a) => a.id === id && a.imagenOriginal);
    if (reciente) {
      return of(reciente);
    }
    const numero = this.numeroDe(id);
    if (numero === null) {
      return of(null);
    }
    return this.http.get<AnalisisResumenDTO>(`${this.url}/${numero}`).pipe(
      map((r) => this.desdeResumen(r)),
      switchMap((a) => (a.imagenDisponible ? this.conImagenes(a, numero) : of(a))),
      catchError(() => of(null))
    );
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
          .pipe(map((respuesta) => this.desdeResultado(respuesta, imagenOriginal)))
      ),
      tap((analisis) => this._analisis.update((lista) => [analisis, ...lista])),
      catchError((error: unknown) =>
        throwError(() => this.aError(error, 'Ocurrió un error al analizar la radiografía.'))
      )
    );
  }

  /** Borra la radiografia y el mapa de calor antes del plazo; el resultado se conserva. */
  eliminarImagen(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${this.numeroDe(id)}/imagen`).pipe(
      tap(() =>
        this._analisis.update((lista) =>
          lista.map((a) => (a.id === id ? this.sinImagenes(a) : a))
        )
      ),
      catchError((error: unknown) =>
        throwError(() => this.aError(error, 'No se pudo eliminar la radiografía.'))
      )
    );
  }

  sinImagenes(analisis: Analisis): Analisis {
    return { ...analisis, imagenDisponible: false, imagenExpiraEn: undefined, imagenOriginal: '', heatmap: '' };
  }

  private conImagenes(analisis: Analisis, numero: number): Observable<Analisis> {
    const descargar = (parte: 'imagen' | 'heatmap') =>
      this.http
        .get(`${this.url}/${numero}/${parte}`, { responseType: 'blob' })
        .pipe(switchMap((blob) => from(this.leerComoDataUrl(blob))));

    return forkJoin([descargar('imagen'), descargar('heatmap')]).pipe(
      map(([imagenOriginal, heatmap]) => ({ ...analisis, imagenOriginal, heatmap })),
      // Vencio el plazo entre la consulta del resultado y la descarga.
      catchError(() => of(this.sinImagenes(analisis)))
    );
  }

  private desdeResultado(r: ResultadoDTO, imagenOriginal: string): Analisis {
    return {
      ...this.desdeResumen({
        analisisId: r.analisisId,
        fechaAnalisis: r.fechaAnalisis,
        nombreArchivo: r.nombreArchivo,
        gradoKL: r.prediccion.gradoKL,
        confianza: r.prediccion.confianza,
        probabilidades: r.prediccion.probabilidades,
        modelo: r.prediccion.modelo,
        tiempoProcesamientoMs: r.tiempoProcesamientoMs,
        imagenDisponible: true,
        imagenExpiraEn: r.imagenExpiraEn
      }),
      imagenOriginal,
      heatmap: `data:image/png;base64,${r.prediccion.heatmapBase64}`
    };
  }

  private desdeResumen(r: AnalisisResumenDTO): Analisis {
    const porcentajes = r.probabilidades.length === 5 ? aPorcentajes(r.probabilidades) : null;
    const grado = r.gradoKL;

    return {
      id: `KL-${r.analisisId}`,
      fecha: r.fechaAnalisis.slice(0, 10),
      archivo: r.nombreArchivo,
      grado,
      // Se toma del mismo reparto que las barras, para que el anillo y la
      // barra del grado predicho muestren el mismo numero.
      confianza: porcentajes ? porcentajes[grado] : Math.round(r.confianza * 100),
      imagenOriginal: '',
      heatmap: '',
      imagenDisponible: r.imagenDisponible,
      imagenExpiraEn: r.imagenExpiraEn ?? undefined,
      distribucion: porcentajes
        ? porcentajes.map((probabilidad, g) => ({ grado: g as GradoKL, probabilidad }))
        : [],
      modelo: r.modelo,
      tiempoProcesamientoMs: r.tiempoProcesamientoMs
    };
  }

  private numeroDe(id: string): number | null {
    const numero = Number(id.replace(/^KL-/, ''));
    return Number.isInteger(numero) && numero > 0 ? numero : null;
  }

  private aError(error: unknown, porDefecto: string): Error {
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
      return new Error('Su cuenta no tiene permisos para esta acción.');
    }
    return new Error(error.error?.mensaje ?? porDefecto);
  }

  private leerComoDataUrl(contenido: Blob): Promise<string> {
    return new Promise((resolver, rechazar) => {
      const lector = new FileReader();
      lector.onload = () => resolver(lector.result as string);
      lector.onerror = () => rechazar(lector.error);
      lector.readAsDataURL(contenido);
    });
  }
}
