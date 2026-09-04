import { Injectable, computed, signal } from '@angular/core';
import { Observable, delay, of, tap } from 'rxjs';

import { Medico, NuevoMedico } from '../models/medico.model';

/**
 * Gestion de cuentas de medico (rol administrador).
 * Implementacion temporal en memoria; el backend expondra /api/medicos.
 */
@Injectable({ providedIn: 'root' })
export class MedicosService {
  private readonly _medicos = signal<Medico[]>([
    { id: 'm-1', nombre: 'Dr. Juan Álvarez', usuario: 'jalvarez', correo: 'jalvarez@hospital.org', ultimoAcceso: 'Hace 10 min', estado: 'ACTIVO', especialidad: 'Radiología' },
    { id: 'm-2', nombre: 'Dra. Andrea Rueda', usuario: 'arueda', correo: 'arueda@hospital.org', ultimoAcceso: 'Hace 2 horas', estado: 'ACTIVO', especialidad: 'Reumatología' },
    { id: 'm-3', nombre: 'Dr. Juan Ardila', usuario: 'jardila', correo: 'jardila@hospital.org', ultimoAcceso: 'Ayer, 18:40', estado: 'ACTIVO', especialidad: 'Traumatología' },
    { id: 'm-4', nombre: 'Dra. Karla Martínez', usuario: 'kmartinez', correo: 'kmartinez@hospital.org', ultimoAcceso: '24 Sep 2024', estado: 'INACTIVO', especialidad: 'Radiología' },
    { id: 'm-5', nombre: 'Dr. Juan Trejos', usuario: 'jtrejos', correo: 'jtrejos@hospital.org', ultimoAcceso: '15 Sep 2024', estado: 'ACTIVO', especialidad: 'Medicina General' },
    { id: 'm-6', nombre: 'Dra. Laura Gómez', usuario: 'lgomez', correo: 'lgomez@hospital.org', ultimoAcceso: '01 Sep 2024', estado: 'INACTIVO', especialidad: 'Traumatología' },
    { id: 'm-7', nombre: 'Dr. Sebastián Ríos', usuario: 'srios', correo: 'srios@hospital.org', ultimoAcceso: 'Hace 3 días', estado: 'ACTIVO', especialidad: 'Reumatología' },
    { id: 'm-8', nombre: 'Dra. Valeria Pardo', usuario: 'vpardo', correo: 'vpardo@hospital.org', ultimoAcceso: 'Hace 5 días', estado: 'ACTIVO', especialidad: 'Radiología' }
  ]);

  readonly medicos = this._medicos.asReadonly();
  readonly totalRegistrados = computed(() => this._medicos().length + 16);
  readonly totalActivos = computed(
    () => this._medicos().filter((m) => m.estado === 'ACTIVO').length + 15
  );
  readonly totalInactivos = computed(
    () => this._medicos().filter((m) => m.estado === 'INACTIVO').length + 1
  );

  readonly especialidades = ['Traumatología', 'Radiología', 'Medicina General', 'Reumatología'];

  listar(): Observable<Medico[]> {
    return of(this._medicos()).pipe(delay(250));
  }

  crear(datos: NuevoMedico): Observable<Medico> {
    const medico: Medico = {
      id: `m-${crypto.randomUUID().slice(0, 8)}`,
      nombre: datos.nombre,
      usuario: datos.usuario,
      correo: datos.correo,
      telefono: datos.telefono,
      especialidad: datos.especialidad,
      ultimoAcceso: 'Sin accesos',
      estado: datos.activo ? 'ACTIVO' : 'INACTIVO'
    };

    return of(medico).pipe(
      delay(800),
      tap((m) => this._medicos.update((lista) => [m, ...lista]))
    );
  }

  cambiarEstado(id: string): Observable<void> {
    this._medicos.update((lista) =>
      lista.map((m) =>
        m.id === id ? { ...m, estado: m.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO' } : m
      )
    );
    return of(void 0).pipe(delay(200));
  }

  eliminar(id: string): Observable<void> {
    this._medicos.update((lista) => lista.filter((m) => m.id !== id));
    return of(void 0).pipe(delay(200));
  }
}
