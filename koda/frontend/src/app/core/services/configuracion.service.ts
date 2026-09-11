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
 * Parametros de operacion del sistema, editables desde el modulo administrativo.
 *
 * Hoy se guardan en el navegador; cuando el backend exponga /api/configuracion
 * se reemplaza la persistencia sin cambiar la interfaz de los componentes que
 * la consumen.
 */
@Injectable({ providedIn: 'root' })
export class ConfiguracionService {
  private readonly CLAVE = 'koda.configuracion';

  private readonly _configuracion = signal<ConfiguracionSistema>(this.leer());

  readonly configuracion = this._configuracion.asReadonly();

  guardar(valores: ConfiguracionSistema): void {
    this._configuracion.set(valores);
    try {
      localStorage.setItem(this.CLAVE, JSON.stringify(valores));
    } catch {
      /* almacenamiento no disponible: la configuración vive en memoria */
    }
  }

  restablecer(): void {
    this.guardar({ ...CONFIGURACION_POR_DEFECTO });
  }

  private leer(): ConfiguracionSistema {
    try {
      const bruto = localStorage.getItem(this.CLAVE);
      // Se mezcla con los valores por defecto para tolerar configuraciones
      // guardadas por versiones anteriores a las que les falten campos.
      return bruto
        ? { ...CONFIGURACION_POR_DEFECTO, ...(JSON.parse(bruto) as ConfiguracionSistema) }
        : { ...CONFIGURACION_POR_DEFECTO };
    } catch {
      return { ...CONFIGURACION_POR_DEFECTO };
    }
  }
}
