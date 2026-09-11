export interface Medico {
  id: string;
  nombre: string;
  correo: string;
  usuario: string;
  telefono: string | null;
  institucion: string | null;
  activo: boolean;
  /** Instante ISO-8601 del último inicio de sesión; null si nunca entró. */
  ultimoAcceso: string | null;
}

/** Cuerpo de POST /api/medicos. */
export interface NuevoMedico {
  nombre: string;
  correo: string;
  usuario: string;
  contrasenaTemporal: string;
  telefono: string;
  institucion: string;
}

/** Cuerpo de PUT /api/medicos/{id}. La contraseña no se edita aquí. */
export interface EdicionMedico {
  nombre: string;
  correo: string;
  usuario: string;
  telefono: string;
  institucion: string;
}
