package com.koda.backend.exception;

/**
 * El codigo de recuperacion no sirve. Un solo mensaje para todos los casos
 * (correo desconocido, codigo errado o vencido) para no revelar que cuentas existen.
 */
public class CodigoRecuperacionInvalidoException extends RuntimeException {

    public CodigoRecuperacionInvalidoException() {
        super("El código es incorrecto o venció. Verifíquelo o solicite uno nuevo.");
    }
}
