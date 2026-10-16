/** Grado de la escala Kellgren-Lawrence. */
export type GradoKL = 0 | 1 | 2 | 3 | 4;

export type Lateralidad = 'IZQUIERDA' | 'DERECHA';

export interface DistribucionGrado {
  grado: GradoKL;
  /** Porcentaje entero; los cinco grados suman exactamente 100 (RF-10). */
  probabilidad: number;
}

/**
 * Analisis de una radiografia. No contiene datos del paciente (ASR-06): solo
 * el nombre del archivo, que tampoco debe incluirlos.
 */
export interface Analisis {
  id: string;
  /** Fecha del analisis, AAAA-MM-DD. */
  fecha: string;
  archivo: string;
  /** Rodilla analizada, solo cuando es identificable. */
  lateralidad?: Lateralidad;
  grado: GradoKL;
  /** Porcentaje entero de la clase predicha. */
  confianza: number;
  /** Data URL de la radiografia; vacia si ya no se conserva o todavia no se descargo. */
  imagenOriginal: string;
  /** Data URL del mapa Grad-CAM superpuesto; vacia en los mismos casos. */
  heatmap: string;
  /** El backend todavia conserva la radiografia y el mapa de calor. */
  imagenDisponible: boolean;
  /** Hasta cuando se conservan, AAAA-MM-DDTHH:mm:ss; ausente si ya no estan. */
  imagenExpiraEn?: string;
  /** Vacia en los analisis anteriores a que se registraran las probabilidades. */
  distribucion: DistribucionGrado[];
  /** Clasificador que produjo el resultado. */
  modelo: string;
  tiempoProcesamientoMs?: number;
}

/** Resultados que no provienen de un modelo de IA real: el clasificador simulado del servicio. */
export const MODELOS_SIN_VALIDEZ_CLINICA = ['simulado'];

export const ETIQUETAS_KL: Record<GradoKL, string> = {
  0: 'Normal',
  1: 'Dudoso',
  2: 'Leve',
  3: 'Moderado',
  4: 'Severo'
};

export const DESCRIPCION_KL: Record<GradoKL, string> = {
  0: 'Sin osteoartritis',
  1: 'Osteoartritis dudosa',
  2: 'Osteoartritis leve',
  3: 'Osteoartritis moderada',
  4: 'Osteoartritis severa'
};
