package com.koda.backend.dto;

import java.time.LocalDateTime;
import java.util.List;

import com.koda.backend.model.MetadatoAnalisis;

/**
 * Analisis del historial (GET /analisis y GET /analisis/{id}). La radiografia y
 * el mapa de calor se piden aparte, solo si imagenDisponible.
 *
 * @param probabilidades grados KL 0 a 4; vacia en analisis anteriores a que se registraran
 * @param imagenExpiraEn nulo si la imagen ya no se conserva
 */
public record AnalisisResumenDTO(
        Long analisisId,
        LocalDateTime fechaAnalisis,
        String nombreArchivo,
        int gradoKL,
        double confianza,
        List<Double> probabilidades,
        String modelo,
        long tiempoProcesamientoMs,
        boolean imagenDisponible,
        LocalDateTime imagenExpiraEn) {

    public static AnalisisResumenDTO desde(MetadatoAnalisis registro, LocalDateTime imagenExpiraEn) {
        return new AnalisisResumenDTO(
                registro.getId(),
                registro.getFechaCreacion(),
                registro.getNombreArchivo(),
                registro.getGradoKL(),
                registro.getConfianza(),
                registro.getProbabilidades(),
                registro.getModelo(),
                registro.getTiempoProcesamientoMs(),
                imagenExpiraEn != null,
                imagenExpiraEn);
    }
}
