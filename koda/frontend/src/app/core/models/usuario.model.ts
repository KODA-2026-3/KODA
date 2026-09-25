export type RolUsuario = 'MEDICO' | 'ADMIN';

export interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  usuario: string;
  rol: RolUsuario;
  institucion?: string;
  iniciales: string;
}
