package com.koda.backend.dto;

import java.time.LocalDateTime;

/** Respuesta de POST /predict. */
public record ResultadoDTO(
        Long analisisId,
        PrediccionDTO prediccion,
        LocalDateTime fechaAnalisis,
        String nombreArchivo,
        long tiempoProcesamientoMs) {
}
