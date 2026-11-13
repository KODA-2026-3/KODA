package com.koda.backend.modulo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpHeaders;

import com.fasterxml.jackson.databind.JsonNode;
import com.koda.backend.ia.IModuloIAClient;
import com.koda.backend.model.Rol;

/**
 * CP-11 · Modulo Estadisticas (RF-21): el medico ve solo su actividad y el
 * administrador la global. Corre sobre H2 con analisis reales registrados por
 * el flujo completo (la IA responde siempre grado 3).
 */
@DisplayName("CP-11 · Módulo Estadísticas: panel del médico y panel del administrador")
class CP11EstadisticasModuloTest extends ModuloTestBase {

    @MockBean
    private IModuloIAClient ia;

    private String tokenAdmin;

    @BeforeEach
    void preparar() throws Exception {
        when(ia.solicitarInferencia(any())).thenReturn(prediccionGrado3());
        tokenAdmin = obtenerToken(CORREO_ADMIN, CONTRASENA_DEMO);
    }

    private JsonNode consultar(String ruta, String token) throws Exception {
        return leerJson(mockMvc.perform(get(ruta).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk())
                .andReturn());
    }

    private static long cantidadGrado(JsonNode estadisticas, int grado) {
        for (JsonNode conteo : estadisticas.get("distribucionKL")) {
            if (conteo.get("gradoKL").asInt() == grado) {
                return conteo.get("cantidad").asLong();
            }
        }
        return 0;
    }

    @Test
    @DisplayName("Estadísticas personales: reflejan los análisis del médico (total, hoy, semana, grado y confianza)")
    void estadisticasPersonalesDelMedico() throws Exception {
        String tokenMedico = tokenDeOtroMedico();
        analizar(tokenMedico, "DERECHA").andExpect(status().isOk());
        analizar(tokenMedico, "IZQUIERDA").andExpect(status().isOk());

        JsonNode personales = consultar("/estadisticas/personales", tokenMedico);

        assertThat(personales.get("totalRadiografias").asLong()).isEqualTo(2);
        assertThat(personales.get("radiografiasHoy").asLong()).isEqualTo(2);
        assertThat(personales.get("radiografiasSemana").asLong()).isEqualTo(2);
        assertThat(personales.get("confianzaPromedio").asDouble()).isBetween(0.79, 0.81);
        assertThat(cantidadGrado(personales, 3)).isEqualTo(2);
    }

    @Test
    @DisplayName("Los análisis de otro médico no aparecen en las estadísticas personales")
    void estadisticasPersonalesAisladas() throws Exception {
        String tokenQueAnaliza = tokenDeOtroMedico();
        String tokenSinAnalisis = tokenDeOtroMedico();
        analizar(tokenQueAnaliza, "DERECHA").andExpect(status().isOk());

        JsonNode personales = consultar("/estadisticas/personales", tokenSinAnalisis);

        assertThat(personales.get("totalRadiografias").asLong()).isZero();
        assertThat(personales.get("radiografiasHoy").asLong()).isZero();
    }

    @Test
    @DisplayName("Estadísticas globales: suman los análisis de todos los médicos e informan los médicos activos")
    void estadisticasGlobalesDelAdministrador() throws Exception {
        JsonNode antes = consultar("/estadisticas", tokenAdmin);

        analizar(tokenDeOtroMedico(), "DERECHA").andExpect(status().isOk());
        analizar(tokenDeOtroMedico(), "IZQUIERDA").andExpect(status().isOk());

        JsonNode despues = consultar("/estadisticas", tokenAdmin);
        assertThat(despues.get("totalRadiografias").asLong())
                .isEqualTo(antes.get("totalRadiografias").asLong() + 2);
        assertThat(despues.get("radiografiasHoy").asLong())
                .isEqualTo(antes.get("radiografiasHoy").asLong() + 2);
        assertThat(cantidadGrado(despues, 3)).isEqualTo(cantidadGrado(antes, 3) + 2);
        assertThat(despues.get("medicosActivos").asLong())
                .isEqualTo(usuarios.countByRolAndActivoTrue(Rol.MEDICO));
    }

    @Test
    @DisplayName("Cada panel solo lo ve su rol: médico → globales 403, administrador → personales 403")
    void cadaPanelSoloParaSuRol() throws Exception {
        mockMvc.perform(get("/estadisticas")
                        .header(HttpHeaders.AUTHORIZATION, bearer(obtenerToken(CORREO_MEDICO, CONTRASENA_DEMO))))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/estadisticas/personales").header(HttpHeaders.AUTHORIZATION, bearer(tokenAdmin)))
                .andExpect(status().isForbidden());
    }
}
