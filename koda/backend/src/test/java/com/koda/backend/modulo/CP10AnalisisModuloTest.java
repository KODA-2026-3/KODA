package com.koda.backend.modulo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Arrays;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.ResultActions;

import com.fasterxml.jackson.databind.JsonNode;
import com.koda.backend.exception.InferenciaTimeoutException;
import com.koda.backend.exception.ModuloIANoDisponibleException;
import com.koda.backend.ia.IModuloIAClient;
import com.koda.backend.repository.RepositorioAnalisis;

/**
 * CP-10 · Modulo Analisis: archivos no validos y fallos del servicio de IA
 * (RF-02, RF-17, RNF-02), y listado del historial propio (RF-18).
 */
@DisplayName("CP-10 · Módulo Análisis: archivos no válidos, fallos de la IA e historial propio")
class CP10AnalisisModuloTest extends ModuloTestBase {

    @MockBean
    private IModuloIAClient ia;

    @Autowired
    private RepositorioAnalisis registros;

    private String tokenMedico;

    @BeforeEach
    void preparar() throws Exception {
        when(ia.solicitarInferencia(any())).thenReturn(prediccionGrado3());
        tokenMedico = obtenerToken(CORREO_MEDICO, CONTRASENA_DEMO);
    }

    private ResultActions analizarArchivo(String nombre, byte[] contenido) throws Exception {
        return mockMvc.perform(multipart("/predict")
                .file(new MockMultipartFile("imagen", nombre, "image/png", contenido))
                .param("lateralidad", "DERECHA")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenMedico)));
    }

    @Test
    @DisplayName("Archivo con formato no válido (PDF): 422 con mensaje, sin llamar al modelo ni crear registro")
    void formatoNoValido() throws Exception {
        long antes = registros.count();

        analizarArchivo("documento.png", "%PDF-1.4 no es una radiografía".getBytes())
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.mensaje")
                        .value("El formato del archivo no es compatible. Solo se aceptan imágenes JPEG o PNG."));

        verify(ia, never()).solicitarInferencia(any());
        assertThat(registros.count()).isEqualTo(antes);
    }

    @Test
    @DisplayName("Archivo de más de 10 MB: 422 con mensaje, sin llamar al modelo ni crear registro")
    void archivoDemasiadoGrande() throws Exception {
        long antes = registros.count();
        byte[] grande = Arrays.copyOf(png(), (int) (10.5 * 1024 * 1024));

        analizarArchivo("grande.png", grande)
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.mensaje", containsString("excede el tamaño máximo permitido (10 MB)")));

        verify(ia, never()).solicitarInferencia(any());
        assertThat(registros.count()).isEqualTo(antes);
    }

    @Test
    @DisplayName("Servicio de IA no disponible: 503 con mensaje y sin crear registro")
    void servicioIANoDisponible() throws Exception {
        when(ia.solicitarInferencia(any())).thenThrow(new ModuloIANoDisponibleException());
        long antes = registros.count();

        analizar(tokenMedico, "DERECHA")
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.mensaje").value(
                        "El servicio de análisis no está disponible en este momento. Intente nuevamente más tarde."));

        assertThat(registros.count()).isEqualTo(antes);
    }

    @Test
    @DisplayName("La inferencia supera el tiempo máximo: 504 con mensaje y sin crear registro")
    void tiempoDeInferenciaAgotado() throws Exception {
        when(ia.solicitarInferencia(any())).thenThrow(new InferenciaTimeoutException());
        long antes = registros.count();

        analizar(tokenMedico, "DERECHA")
                .andExpect(status().isGatewayTimeout())
                .andExpect(jsonPath("$.mensaje")
                        .value("El análisis tardó más de lo esperado. Intente nuevamente en unos momentos."));

        assertThat(registros.count()).isEqualTo(antes);
    }

    @Test
    @DisplayName("Tras un fallo de la IA, el siguiente análisis se procesa con normalidad")
    void seRecuperaTrasUnFallo() throws Exception {
        when(ia.solicitarInferencia(any()))
                .thenThrow(new ModuloIANoDisponibleException())
                .thenReturn(prediccionGrado3());

        analizar(tokenMedico, "DERECHA").andExpect(status().isServiceUnavailable());
        analizar(tokenMedico, "DERECHA").andExpect(status().isOk());
    }

    @Test
    @DisplayName("Un administrador no puede analizar radiografías: 403")
    void administradorNoPuedeAnalizar() throws Exception {
        analizar(obtenerToken(CORREO_ADMIN, CONTRASENA_DEMO), "DERECHA").andExpect(status().isForbidden());
        verify(ia, never()).solicitarInferencia(any());
    }

    @Test
    @DisplayName("Listar el historial: solo los análisis propios, del más reciente al más antiguo")
    void listarHistorialPropio() throws Exception {
        String tokenNuevo = tokenDeOtroMedico();
        long primero = leerJson(analizar(tokenNuevo, "IZQUIERDA").andExpect(status().isOk()).andReturn())
                .get("analisisId").asLong();
        Thread.sleep(20);
        long segundo = leerJson(analizar(tokenNuevo, "DERECHA").andExpect(status().isOk()).andReturn())
                .get("analisisId").asLong();

        JsonNode lista = leerJson(mockMvc.perform(get("/analisis")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokenNuevo)))
                .andExpect(status().isOk())
                .andReturn());

        assertThat(lista).hasSize(2);
        assertThat(lista.get(0).get("analisisId").asLong()).isEqualTo(segundo);
        assertThat(lista.get(1).get("analisisId").asLong()).isEqualTo(primero);
        assertThat(lista.get(1).get("lateralidad").asText()).isEqualTo("IZQUIERDA");
    }
}
