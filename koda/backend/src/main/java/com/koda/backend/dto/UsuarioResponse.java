package com.koda.backend.dto;

import com.koda.backend.model.Usuario;

/** Datos del usuario que consume la interfaz tras iniciar sesion. */
public record UsuarioResponse(
        String id,
        String nombre,
        String correo,
        String usuario,
        String rol,
        String institucion,
        String iniciales) {

    public static UsuarioResponse desde(Usuario usuario) {
        return new UsuarioResponse(
                usuario.getId(),
                usuario.getNombre(),
                usuario.getCorreo(),
                usuario.getUsuario(),
                usuario.getRol().name(),
                usuario.getInstitucion(),
                usuario.getIniciales());
    }
}
