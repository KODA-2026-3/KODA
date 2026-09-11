package com.koda.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/** La contrasena no se edita aqui: se restablece por su propio flujo. */
public record ActualizarMedicoRequest(
        @NotBlank String nombre,
        @NotBlank @Email String correo,
        @NotBlank String usuario,
        String telefono,
        String institucion) {
}
