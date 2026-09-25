package com.koda.backend.exception;

/** La operacion choca con un dato que ya existe (correo o usuario repetido). */
public class ConflictoException extends RuntimeException {

    public ConflictoException(String mensaje) {
        super(mensaje);
    }
}
