package com.koda.backend.dto;

import java.time.LocalDate;

/** Cantidad de radiografías analizadas en una fecha determinada. */
public record ConteoPorDia(LocalDate fecha, long cantidad) {
}
