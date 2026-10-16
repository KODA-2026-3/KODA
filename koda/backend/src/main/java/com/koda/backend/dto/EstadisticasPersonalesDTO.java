package com.koda.backend.dto;

import java.util.List;

/** Resumen de actividad de un medico para su propio panel (no ve datos de otros). */
public record EstadisticasPersonalesDTO(
        long totalRadiografias,
        long radiografiasHoy,
        long radiografiasSemana,
        double confianzaPromedio,
        List<ConteoGradoKL> distribucionKL,
        List<ConteoPorDia> radiografiasPorDia) {
}
