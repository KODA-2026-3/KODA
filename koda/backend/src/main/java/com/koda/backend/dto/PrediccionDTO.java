package com.koda.backend.dto;

import java.util.List;

/**
 * Salida del modulo de IA (seccion 2.6 del SRS).
 *
 * @param probabilidades grados KL 0 a 4, en ese orden; suman 1
 * @param confianza      probabilidad de la clase predicha, entre 0 y 1
 * @param heatmapBase64  radiografia con el mapa Grad-CAM superpuesto, PNG en Base64
 * @param modelo         clasificador que produjo el resultado; "simulado" si no es un modelo real
 */
public record PrediccionDTO(
        int gradoKL,
        double confianza,
        List<Double> probabilidades,
        String heatmapBase64,
        String modelo) {
}
