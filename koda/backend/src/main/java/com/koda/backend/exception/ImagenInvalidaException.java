package com.koda.backend.exception;

/** La radiografia no puede analizarse (formato, tamano o contenido). */
public class ImagenInvalidaException extends RuntimeException {

    public ImagenInvalidaException(String mensaje) {
        super(mensaje);
    }
}
