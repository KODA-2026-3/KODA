package com.koda.backend.exception;

/** No fue posible conectar con el servicio de inferencia. */
public class ModuloIANoDisponibleException extends RuntimeException {

    public ModuloIANoDisponibleException() {
        super("El servicio de análisis no está disponible en este momento. Intente nuevamente más tarde.");
    }
}
