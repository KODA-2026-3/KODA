export interface Medico {
  id: string;
  nombre: string;
  usuario: string;
  correo: string;
  telefono?: string;
  ultimoAcceso: string;
}

export interface NuevoMedico {
  nombre: string;
  correo: string;
  telefono: string;
  usuario: string;
  contrasenaTemporal: string;
}
