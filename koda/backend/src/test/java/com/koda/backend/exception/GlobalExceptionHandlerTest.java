package com.koda.backend.exception;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import com.koda.backend.dto.ErrorResponse;

class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler handler;

    @BeforeEach
    void setUp() {
        handler = new GlobalExceptionHandler();
    }

    @Test
    @DisplayName("CredencialesInvalidasException debe mapearse a 401 UNAUTHORIZED")
    void credencialesInvalidas_retorna401() {
        ResponseEntity<ErrorResponse> response = handler.credencialesInvalidas(new CredencialesInvalidasException());
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(response.getBody().mensaje()).isEqualTo("Las credenciales ingresadas no son válidas. Intente nuevamente.");
    }

    @Test
    @DisplayName("RecursoNoEncontradoException debe mapearse a 404 NOT_FOUND")
    void recursoNoEncontrado_retorna404() {
        ResponseEntity<ErrorResponse> response = handler.noEncontrado(new RecursoNoEncontradoException("No encontrado"));
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody().mensaje()).isEqualTo("No encontrado");
    }

    @Test
    @DisplayName("ConflictoException debe mapearse a 409 CONFLICT")
    void conflicto_retorna409() {
        ResponseEntity<ErrorResponse> response = handler.conflicto(new ConflictoException("Ya existe"));
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody().mensaje()).isEqualTo("Ya existe");
    }

    @Test
    @DisplayName("ImagenInvalidaException debe mapearse a 422 UNPROCESSABLE_ENTITY")
    void imagenInvalida_retorna422() {
        ResponseEntity<ErrorResponse> response = handler.imagenInvalida(new ImagenInvalidaException("Formato no soportado"));
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(response.getBody().mensaje()).isEqualTo("Formato no soportado");
    }

    @Test
    @DisplayName("InferenciaTimeoutException debe mapearse a 504 GATEWAY_TIMEOUT")
    void inferenciaTimeout_retorna504() {
        ResponseEntity<ErrorResponse> response = handler.timeoutInferencia(new InferenciaTimeoutException());
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.GATEWAY_TIMEOUT);
    }

    @Test
    @DisplayName("ModuloIANoDisponibleException debe mapearse a 503 SERVICE_UNAVAILABLE")
    void moduloIANoDisponible_retorna503() {
        ResponseEntity<ErrorResponse> response = handler.moduloNoDisponible(new ModuloIANoDisponibleException());
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
    }

    @Test
    @DisplayName("ModeloInferenciaException debe mapearse a 502 BAD_GATEWAY")
    void modeloInferencia_retorna502() {
        ResponseEntity<ErrorResponse> response = handler.errorModelo(new ModeloInferenciaException("Fallo del modelo"));
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_GATEWAY);
        assertThat(response.getBody().mensaje()).isEqualTo("Fallo del modelo");
    }
}
