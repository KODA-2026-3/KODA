package com.koda.backend.dto;

import java.time.Instant;

import com.koda.backend.model.Usuario;

/** Cuenta de medico tal como la lista el modulo administrativo. */
public record MedicoResponse(
        String id,
        String nombre,
        String correo,
        String usuario,
        String telefono,
        String institucion,
        boolean activo,
        Instant ultimoAcceso) {

    public static MedicoResponse desde(Usuario usuario) {
        return new MedicoResponse(
                usuario.getId(),
                usuario.getNombre(),
                usuario.getCorreo(),
                usuario.getUsuario(),
                usuario.getTelefono(),
                usuario.getInstitucion(),
                usuario.isActivo(),
                usuario.getUltimoAcceso());
    }
}
