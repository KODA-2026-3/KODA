package com.koda.backend.ia;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import org.springframework.web.client.RestClient;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.koda.backend.dto.ImagenPreprocesada;
import com.koda.backend.dto.PrediccionDTO;
import com.koda.backend.exception.ImagenInvalidaException;
import com.koda.backend.exception.ModeloInferenciaException;

class RestModuloIAAdapterTest {

    private MockRestServiceServer mockServer;
    private RestModuloIAAdapter adapter;
    private ImagenPreprocesada imagen;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://localhost:5000");
        mockServer = MockRestServiceServer.bindTo(builder).build();
        adapter = new RestModuloIAAdapter(builder.build(), new ObjectMapper());
        imagen = new ImagenPreprocesada(new byte[]{1, 2, 3}, "rx.png", "image/png", 100, 100);
    }

    @Test
    @DisplayName("Debe deserializar correctamente una respuesta 200 OK válida")
    void solicitarInferencia_exitoso_retornaPrediccionDTO() {
        String jsonRespuesta = """
            {
                "gradoKL": 2,
                "confianza": 0.88,
                "probabilidades": [0.02, 0.05, 0.88, 0.03, 0.02],
                "heatmapBase64": "aGVhdG1hcA==",
                "modelo": "simulado"
            }
            """;

        mockServer.expect(requestTo("http://localhost:5000/infer"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(jsonRespuesta, MediaType.APPLICATION_JSON));

        PrediccionDTO resultado = adapter.solicitarInferencia(imagen);

        mockServer.verify();
        assertThat(resultado.gradoKL()).isEqualTo(2);
        assertThat(resultado.confianza()).isEqualTo(0.88);
        assertThat(resultado.modelo()).isEqualTo("simulado");
        assertThat(resultado.heatmapBase64()).isEqualTo("aGVhdG1hcA==");
    }

    @Test
    @DisplayName("Debe lanzar ImagenInvalidaException cuando el servicio responde 4xx")
    void solicitarInferencia_error4xx_lanzaImagenInvalidaException() {
        String jsonError = """
            {
                "mensaje": "La imagen es demasiado pequeña para analizarla."
            }
            """;

        mockServer.expect(requestTo("http://localhost:5000/infer"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.UNPROCESSABLE_ENTITY)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(jsonError));

        assertThatThrownBy(() -> adapter.solicitarInferencia(imagen))
                .isInstanceOf(ImagenInvalidaException.class)
                .hasMessage("La imagen es demasiado pequeña para analizarla.");

        mockServer.verify();
    }

    @Test
    @DisplayName("Debe lanzar ModeloInferenciaException cuando el servicio responde 5xx")
    void solicitarInferencia_error5xx_lanzaModeloInferenciaException() {
        mockServer.expect(requestTo("http://localhost:5000/infer"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"mensaje\": \"Fallo interno de inferencia.\"}"));

        assertThatThrownBy(() -> adapter.solicitarInferencia(imagen))
                .isInstanceOf(ModeloInferenciaException.class)
                .hasMessage("Fallo interno de inferencia.");

        mockServer.verify();
    }

    @Test
    @DisplayName("Debe lanzar ModeloInferenciaException si la respuesta no cumple el contrato (grado KL > 4)")
    void solicitarInferencia_respuestaIncompleta_lanzaModeloInferenciaException() {
        String jsonInvalido = """
            {
                "gradoKL": 9,
                "confianza": 0.88,
                "probabilidades": [0.02, 0.05, 0.88, 0.03, 0.02],
                "heatmapBase64": "aGVhdG1hcA==",
                "modelo": "simulado"
            }
            """;

        mockServer.expect(requestTo("http://localhost:5000/infer"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(jsonInvalido, MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> adapter.solicitarInferencia(imagen))
                .isInstanceOf(ModeloInferenciaException.class)
                .hasMessageContaining("El modelo de IA devolvió un resultado incompleto.");

        mockServer.verify();
    }
}
