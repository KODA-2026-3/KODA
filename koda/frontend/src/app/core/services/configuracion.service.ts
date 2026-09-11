import { Injectable, signal } from '@angular/core';

export type VistaResultado = 'ORIGINAL' | 'HEATMAP';

export interface ConfiguracionSistema {
  /** Tamaño máximo aceptado por archivo, en MB. */
  tamanoMaximoMb: number;
  /** Tipos MIME que acepta la carga de radiografías. */
  formatosAceptados: string[];
  /** A partir de este porcentaje la confianza se considera alta. */
  umbralConfianzaAlta: number;
  /** Por debajo de este porcentaje la confianza se considera baja. */
  umbralConfianzaMedia: number;
  /** Pestaña que se muestra primero al abrir un resultado. */
  vistaPredeterminada: VistaResultado;
  /** Filas por página en el historial de análisis. */
  analisisPorPagina: number;
}

export const CONFIGURACION_POR_DEFECTO: ConfiguracionSistema = {
  tamanoMaximoMb: 10,
  formatosAceptados: ['image/jpeg', 'image/png'],
  umbralConfianzaAlta: 85,
  umbralConfianzaMedia: 65,
  vistaPredeterminada: 'ORIGINAL',
  analisisPorPagina: 6
};

/**
 * Parametros de operacion que consumen la carga de radiografias, la lectura
 * de resultados y el historial.
 *
 * Hoy son de solo lectura: la pantalla que permitia editarlos se retiro del
 * modulo administrativo. Se mantienen centralizados aqui, en vez de repartidos
 * como constantes por cada pantalla, para que volver a exponerlos sea agregar
 * la interfaz y no tocar la logica.
 */
@Injectable({ providedIn: 'root' })
export class ConfiguracionService {
  private readonly _configuracion = signal<ConfiguracionSistema>({
    ...CONFIGURACION_POR_DEFECTO
  });

  readonly configuracion = this._configuracion.asReadonly();
}
