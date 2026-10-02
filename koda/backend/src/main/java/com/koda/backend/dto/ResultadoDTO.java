package com.koda.backend.dto;

import java.time.LocalDateTime;

/**
 * Respuesta de POST /predict.
 *
 * @param imagenExpiraEn hasta cuando se conservan la radiografia y el mapa de calor
 */
public record ResultadoDTO(
        Long analisisId,
        PrediccionDTO prediccion,
        LocalDateTime fechaAnalisis,
        String nombreArchivo,
        long tiempoProcesamientoMs,
        LocalDateTime imagenExpiraEn) {
}
