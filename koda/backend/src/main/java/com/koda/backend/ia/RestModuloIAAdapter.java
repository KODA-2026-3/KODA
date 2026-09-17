package com.koda.backend.ia;

import java.io.IOException;
import java.net.SocketTimeoutException;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.koda.backend.dto.ImagenPreprocesada;
import com.koda.backend.dto.PrediccionDTO;
import com.koda.backend.exception.ImagenInvalidaException;
import com.koda.backend.exception.InferenciaTimeoutException;
import com.koda.backend.exception.ModeloInferenciaException;
import com.koda.backend.exception.ModuloIANoDisponibleException;

/** Invoca el microservicio Python de inferencia via HTTP (POST /infer). */
@Component
public class RestModuloIAAdapter implements IModuloIAClient {

    private static final int GRADOS_KL = 5;

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public RestModuloIAAdapter(RestClient.Builder builder,
                               ObjectMapper objectMapper,
                               @Value("${koda.inference.url}") String url,
                               @Value("${koda.inference.connect-timeout-ms}") int connectTimeoutMs,
                               @Value("${koda.inference.read-timeout-ms}") int readTimeoutMs) {
        SimpleClientHttpRequestFactory fabrica = new SimpleClientHttpRequestFactory();
        fabrica.setConnectTimeout(connectTimeoutMs);
        // Por debajo de los 30 s del SRS (RD-03), para responder al usuario antes del limite.
        fabrica.setReadTimeout(readTimeoutMs);

        this.restClient = builder.baseUrl(url).requestFactory(fabrica).build();
        this.objectMapper = objectMapper;
    }

    @Override
    public PrediccionDTO solicitarInferencia(ImagenPreprocesada imagen) {
        try {
            PrediccionDTO prediccion = restClient.post()
                    .uri("/infer")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(cuerpoMultipart(imagen))
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, (solicitud, respuesta) -> {
                        throw new ImagenInvalidaException(
                                mensajeDe(respuesta, "La imagen no pudo ser analizada."));
                    })
                    .onStatus(HttpStatusCode::is5xxServerError, (solicitud, respuesta) -> {
                        throw new ModeloInferenciaException(
                                mensajeDe(respuesta, "El modelo de IA no pudo procesar la imagen."));
                    })
                    .body(PrediccionDTO.class);

            return verificar(prediccion);
        } catch (RestClientException e) {
            // Las excepciones propias lanzadas en onStatus no son RestClientException
            // y llegan intactas al manejador global.
            throw traducir(e);
        }
    }

    /**
     * El timeout puede ocurrir esperando la respuesta (ResourceAccessException) o
     * a mitad de la lectura del cuerpo (RestClientException generica), por eso se
     * busca en toda la cadena de causas.
     */
    private RuntimeException traducir(RestClientException e) {
        for (Throwable causa = e; causa != null; causa = causa.getCause()) {
            if (causa instanceof SocketTimeoutException) {
                return new InferenciaTimeoutException();
            }
        }
        if (e instanceof ResourceAccessException) {
            return new ModuloIANoDisponibleException();
        }
        return new ModeloInferenciaException("El modelo de IA devolvió una respuesta que no se pudo interpretar.");
    }

    private MultiValueMap<String, Object> cuerpoMultipart(ImagenPreprocesada imagen) {
        HttpHeaders cabeceras = new HttpHeaders();
        cabeceras.setContentType(MediaType.parseMediaType(imagen.tipoContenido()));

        ByteArrayResource recurso = new ByteArrayResource(imagen.datosImagen()) {
            @Override
            public String getFilename() {
                return imagen.nombreArchivo();
            }
        };

        MultiValueMap<String, Object> cuerpo = new LinkedMultiValueMap<>();
        cuerpo.add("imagen", new HttpEntity<>(recurso, cabeceras));
        return cuerpo;
    }

    /** El servicio responde los errores como {"mensaje": "..."}. */
    private String mensajeDe(ClientHttpResponse respuesta, String porDefecto) {
        try {
            JsonNode nodo = objectMapper.readTree(respuesta.getBody());
            return nodo.hasNonNull("mensaje") ? nodo.get("mensaje").asText() : porDefecto;
        } catch (IOException e) {
            return porDefecto;
        }
    }

    /** No se muestra al medico un resultado que no respete el contrato. */
    private PrediccionDTO verificar(PrediccionDTO p) {
        boolean coherente = p != null
                && p.gradoKL() >= 0 && p.gradoKL() < GRADOS_KL
                && p.probabilidades() != null && p.probabilidades().size() == GRADOS_KL
                && p.confianza() >= 0 && p.confianza() <= 1
                && p.heatmapBase64() != null && !p.heatmapBase64().isBlank()
                && p.modelo() != null && !p.modelo().isBlank();

        if (!coherente) {
            throw new ModeloInferenciaException("El modelo de IA devolvió un resultado incompleto.");
        }
        return p;
    }
}
