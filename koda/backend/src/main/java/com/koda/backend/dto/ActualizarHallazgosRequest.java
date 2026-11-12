package com.koda.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ActualizarHallazgosRequest(
        @NotBlank @Size(max = 2000, message = "no debe superar los 2000 caracteres") String hallazgos) {
}
