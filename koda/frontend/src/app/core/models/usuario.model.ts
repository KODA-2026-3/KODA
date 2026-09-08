export type RolUsuario = 'MEDICO' | 'ADMIN';

export interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  usuario: string;
  rol: RolUsuario;
  /** Registro médico profesional; solo aplica al rol MEDICO. */
  matricula?: string;
  especialidad?: string;
  institucion?: string;
  iniciales: string;
}
