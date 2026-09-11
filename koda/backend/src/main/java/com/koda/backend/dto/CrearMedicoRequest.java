package com.koda.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CrearMedicoRequest(
        @NotBlank String nombre,
        @NotBlank @Email String correo,
        @NotBlank String usuario,
        @NotBlank @Size(min = 8, message = "debe tener al menos 8 caracteres")
        String contrasenaTemporal,
        String telefono,
        String institucion) {
}
