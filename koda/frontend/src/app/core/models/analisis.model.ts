/** Grado de la escala Kellgren-Lawrence. */
export type GradoKL = 0 | 1 | 2 | 3 | 4;

export type Lateralidad = 'IZQUIERDA' | 'DERECHA';

export interface DistribucionGrado {
  grado: GradoKL;
  probabilidad: number;
}

export interface Analisis {
  id: string;
  fecha: string;
  paciente: string;
  archivo: string;
  lateralidad: Lateralidad;
  grado: GradoKL;
  confianza: number;
  miniatura: string;
  imagenOriginal: string;
  heatmap: string;
  distribucion: DistribucionGrado[];
}

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
