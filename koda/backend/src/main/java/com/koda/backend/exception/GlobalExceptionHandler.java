package com.koda.backend.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import com.koda.backend.dto.ErrorResponse;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(CredencialesInvalidasException.class)
    public ResponseEntity<ErrorResponse> credencialesInvalidas(CredencialesInvalidasException e) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(new ErrorResponse(e.getMessage()));
    }

    @ExceptionHandler(RecursoNoEncontradoException.class)
    public ResponseEntity<ErrorResponse> noEncontrado(RecursoNoEncontradoException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ErrorResponse(e.getMessage()));
    }

    @ExceptionHandler(ConflictoException.class)
    public ResponseEntity<ErrorResponse> conflicto(ConflictoException e) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(new ErrorResponse(e.getMessage()));
    }

    @ExceptionHandler(ImagenInvalidaException.class)
    public ResponseEntity<ErrorResponse> imagenInvalida(ImagenInvalidaException e) {
        return ResponseEntity.unprocessableEntity().body(new ErrorResponse(e.getMessage()));
    }

    /** El archivo supera el limite de multipart antes de llegar al validador. */
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorResponse> archivoDemasiadoGrande(MaxUploadSizeExceededException e) {
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(new ErrorResponse(
                "El archivo excede el tamaño máximo permitido (10 MB). Por favor, seleccione un archivo más pequeño."));
    }

    @ExceptionHandler(InferenciaTimeoutException.class)
    public ResponseEntity<ErrorResponse> timeoutInferencia(InferenciaTimeoutException e) {
        return ResponseEntity.status(HttpStatus.GATEWAY_TIMEOUT).body(new ErrorResponse(e.getMessage()));
    }

    @ExceptionHandler(ModuloIANoDisponibleException.class)
    public ResponseEntity<ErrorResponse> moduloNoDisponible(ModuloIANoDisponibleException e) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(new ErrorResponse(e.getMessage()));
    }

    @ExceptionHandler(ModeloInferenciaException.class)
    public ResponseEntity<ErrorResponse> errorModelo(ModeloInferenciaException e) {
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(new ErrorResponse(e.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> datosInvalidos(MethodArgumentNotValidException e) {
        String mensaje = e.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .orElse("Los datos enviados no son válidos.");

        return ResponseEntity.badRequest().body(new ErrorResponse(mensaje));
    }
}
