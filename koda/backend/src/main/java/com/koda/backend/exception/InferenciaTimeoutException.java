package com.koda.backend.exception;

/** El modulo de IA no respondio dentro del tiempo configurado (ADR-02). */
public class InferenciaTimeoutException extends RuntimeException {

    public InferenciaTimeoutException() {
        super("El análisis tardó más de lo esperado. Intente nuevamente en unos momentos.");
    }
}
