import { Injectable, signal } from '@angular/core';

/** Radiografia seleccionada, compartida entre la pantalla de carga y la de progreso. */
@Injectable({ providedIn: 'root' })
export class CargaRadiografiaStore {
  private readonly _archivo = signal<File | null>(null);
  private readonly _vistaPrevia = signal<string | null>(null);

  readonly archivo = this._archivo.asReadonly();
  readonly vistaPrevia = this._vistaPrevia.asReadonly();

  establecer(archivo: File, vistaPrevia: string): void {
    this.limpiar();
    this._archivo.set(archivo);
    this._vistaPrevia.set(vistaPrevia);
  }

  limpiar(): void {
    const url = this._vistaPrevia();
    if (url) {
      URL.revokeObjectURL(url);
    }
    this._archivo.set(null);
    this._vistaPrevia.set(null);
  }
}
