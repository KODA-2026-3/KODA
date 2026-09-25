package com.koda.backend.ia;

import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Health check del modulo de IA (ADR-03). Aparece como componente "moduloIA"
 * en /actuator/health, para verificar antes de cada sesion de validacion que
 * el backend puede alcanzar el servicio de inferencia.
 */
@Component("moduloIA")
public class ModuloIAHealthIndicator implements HealthIndicator {

    private static final int TIMEOUT_MS = 2000;

    private final RestClient restClient;
    private final String url;

    public ModuloIAHealthIndicator(RestClient.Builder builder, @Value("${koda.inference.url}") String url) {
        SimpleClientHttpRequestFactory fabrica = new SimpleClientHttpRequestFactory();
        fabrica.setConnectTimeout(TIMEOUT_MS);
        fabrica.setReadTimeout(TIMEOUT_MS);
        this.restClient = builder.baseUrl(url).requestFactory(fabrica).build();
        this.url = url;
    }

    @Override
    @SuppressWarnings("unchecked")
    public Health health() {
        try {
            Map<String, Object> estado = restClient.get().uri("/health").retrieve().body(Map.class);
            Object modelo = estado == null ? null : estado.get("modelo");
            return Health.up()
                    .withDetail("url", url)
                    .withDetail("modelo", modelo == null ? "desconocido" : modelo)
                    .build();
        } catch (RuntimeException e) {
            return Health.down()
                    .withDetail("url", url)
                    .withDetail("error", "No se pudo contactar al servicio de inferencia")
                    .build();
        }
    }
}
