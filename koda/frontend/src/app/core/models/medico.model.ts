export type EstadoCuenta = 'ACTIVO' | 'INACTIVO';

export interface Medico {
  id: string;
  nombre: string;
  usuario: string;
  correo: string;
  telefono?: string;
  especialidad?: string;
  ultimoAcceso: string;
  estado: EstadoCuenta;
}

export interface NuevoMedico {
  nombre: string;
  correo: string;
  telefono: string;
  usuario: string;
  contrasenaTemporal: string;
  activo: boolean;
  especialidad: string;
}
