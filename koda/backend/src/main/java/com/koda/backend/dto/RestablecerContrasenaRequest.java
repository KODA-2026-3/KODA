package com.koda.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RestablecerContrasenaRequest(
        @NotBlank @Email String correo,
        @NotBlank @Pattern(regexp = "\\d{6}", message = "debe tener 6 dígitos") String codigo,
        @NotBlank @Size(min = 8, message = "debe tener al menos 8 caracteres") String nuevaContrasena) {
}
