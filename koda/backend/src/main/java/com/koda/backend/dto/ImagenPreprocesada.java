package com.koda.backend.dto;

/**
 * Radiografia ya validada, lista para enviarse al modulo de IA.
 * El preprocesamiento propio del modelo (redimension, normalizacion) ocurre
 * en el servicio Python, que es quien conoce la entrada que espera cada modelo.
 */
public record ImagenPreprocesada(
        byte[] datosImagen,
        String nombreArchivo,
        String tipoContenido,
        int ancho,
        int alto) {
}
