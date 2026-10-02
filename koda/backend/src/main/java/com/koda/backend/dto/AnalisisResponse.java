package com.koda.backend.dto;

import java.time.LocalDateTime;

/** Resumen de un analisis para el listado del historial. */
public record AnalisisResponse(
        Long id,
        String nombreArchivo,
        int gradoKL,
        double confianza,
        long tiempoProcesamientoMs,
        String modelo,
        LocalDateTime fechaCreacion,
        String medicoNombre) {
}
