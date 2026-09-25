package com.koda.backend.exception;

/** Correo inexistente, contrasena incorrecta o cuenta desactivada. */
public class CredencialesInvalidasException extends RuntimeException {

    public CredencialesInvalidasException() {
        super("Las credenciales ingresadas no son válidas. Intente nuevamente.");
    }
}
