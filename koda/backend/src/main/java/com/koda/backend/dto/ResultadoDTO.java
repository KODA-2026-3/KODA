package com.koda.backend.dto;

import com.koda.backend.model.Lateralidad;

import java.time.LocalDateTime;

/**
 * Respuesta de POST /predict.
 *
 * @param imagenExpiraEn hasta cuando se conservan la radiografia y el mapa de calor
 * @param lateralidad rodilla indicada por el medico al cargar la radiografia
 * @param hallazgos texto predeterminado del grado, que el medico puede editar despues
 */
public record ResultadoDTO(
        Long analisisId,
        PrediccionDTO prediccion,
        LocalDateTime fechaAnalisis,
        String nombreArchivo,
        long tiempoProcesamientoMs,
        LocalDateTime imagenExpiraEn,
        Lateralidad lateralidad,
        String hallazgos) {

    public ResultadoDTO(Long analisisId, PrediccionDTO prediccion, LocalDateTime fechaAnalisis,
                        String nombreArchivo, long tiempoProcesamientoMs) {
        this(analisisId, prediccion, fechaAnalisis, nombreArchivo, tiempoProcesamientoMs, null, null, null);
    }
}
