import { Injectable, signal } from '@angular/core';

/** Radiografia seleccionada, compartida entre la pantalla de carga y la de progreso. */
@Injectable({ providedIn: 'root' })
export class CargaRadiografiaStore {
  private readonly _archivo = signal<File | null>(null);
  private readonly _vistaPrevia = signal<string | null>(null);
  private readonly _error = signal<string | null>(null);

  readonly archivo = this._archivo.asReadonly();
  readonly vistaPrevia = this._vistaPrevia.asReadonly();
  /** Motivo por el que fallo el ultimo analisis, para mostrarlo al volver a la carga. */
  readonly error = this._error.asReadonly();

  establecer(archivo: File, vistaPrevia: string): void {
    this.limpiar();
    this._archivo.set(archivo);
    this._vistaPrevia.set(vistaPrevia);
  }

  /** Conserva el archivo para que el usuario pueda reintentar sin volver a elegirlo. */
  registrarError(mensaje: string): void {
    this._error.set(mensaje);
  }

  descartarError(): void {
    this._error.set(null);
  }

  limpiar(): void {
    const url = this._vistaPrevia();
    if (url) {
      URL.revokeObjectURL(url);
    }
    this._archivo.set(null);
    this._vistaPrevia.set(null);
    this._error.set(null);
  }
}
