package com.koda.backend.exception;

/** El modulo de IA respondio con un error o con un resultado incoherente. */
public class ModeloInferenciaException extends RuntimeException {

    public ModeloInferenciaException(String mensaje) {
        super(mensaje);
    }
}
