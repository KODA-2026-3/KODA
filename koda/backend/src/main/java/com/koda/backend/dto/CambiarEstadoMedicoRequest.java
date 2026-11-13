package com.koda.backend.dto;

import jakarta.validation.constraints.NotNull;

/** Cuerpo de PATCH /medicos/{id}/estado: false desactiva la cuenta y true la reactiva. */
public record CambiarEstadoMedicoRequest(
        @NotNull(message = "es obligatorio") Boolean activo) {
}
