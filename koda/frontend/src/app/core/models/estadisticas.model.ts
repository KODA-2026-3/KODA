import { GradoKL } from './analisis.model';

export interface ConteoGradoKL {
  gradoKL: GradoKL;
  cantidad: number;
}

export interface ConteoPorDia {
  /** Fecha AAAA-MM-DD. */
  fecha: string;
  cantidad: number;
}

/** Respuesta de GET /api/estadisticas, para el panel del administrador. */
export interface Estadisticas {
  totalRadiografias: number;
  radiografiasHoy: number;
  /** Fracción entre 0 y 1. */
  confianzaPromedio: number;
  medicosActivos: number;
  distribucionKL: ConteoGradoKL[];
  radiografiasPorDia: ConteoPorDia[];
}

/** Respuesta de GET /api/estadisticas/personales: solo la actividad del médico autenticado. */
export interface EstadisticasPersonales {
  totalRadiografias: number;
  radiografiasHoy: number;
  radiografiasSemana: number;
  /** Fracción entre 0 y 1. */
  confianzaPromedio: number;
  distribucionKL: ConteoGradoKL[];
  radiografiasPorDia: ConteoPorDia[];
}
