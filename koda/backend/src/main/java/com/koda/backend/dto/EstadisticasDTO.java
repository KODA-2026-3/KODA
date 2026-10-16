package com.koda.backend.dto;

import java.util.List;

/** Resumen de uso de la plataforma para el panel del administrador. */
public record EstadisticasDTO(
        long totalRadiografias,
        long radiografiasHoy,
        double confianzaPromedio,
        long medicosActivos,
        List<ConteoGradoKL> distribucionKL,
        List<ConteoPorDia> radiografiasPorDia) {
}
