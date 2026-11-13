package com.koda.backend.modulo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

import com.koda.backend.ia.IModuloIAClient;
import com.koda.backend.model.HallazgosPredeterminados;
import com.koda.backend.repository.RepositorioAnalisis;

/**
 * CP-07 · Modulo Historial: edicion de los hallazgos radiograficos (RF-25).
 *
 * Solo el medico que hizo el analisis puede cambiar el texto; queda guardado
 * en metadatos_analisis.hallazgos (V8) y se devuelve al reabrir el analisis.
 */
@DisplayName("CP-07 · Módulo Historial: edición de hallazgos radiográficos")
class CP07HallazgosModuloTest extends ModuloTestBase {

    @MockBean
    private IModuloIAClient ia;

    @Autowired
    private RepositorioAnalisis registros;

    private String tokenMedico;
    private long analisisId;

    @BeforeEach
    void preparar() throws Exception {
        when(ia.solicitarInferencia(any())).thenReturn(prediccionGrado3());
        tokenMedico = obtenerToken(CORREO_MEDICO, CONTRASENA_DEMO);
        analisisId = leerJson(analizar(tokenMedico, "DERECHA").andExpect(status().isOk()).andReturn())
                .get("analisisId").asLong();
    }

    private ResultActions guardarHallazgos(String token, String texto) throws Exception {
        var solicitud = put("/analisis/" + analisisId + "/hallazgos")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("hallazgos", texto)));
        if (token != null) {
            solicitud.header(HttpHeaders.AUTHORIZATION, bearer(token));
        }
        return mockMvc.perform(solicitud);
    }

    private String hallazgosGuardados() {
        return registros.findById(analisisId).orElseThrow().getHallazgos();
    }

    @Test
    @DisplayName("El médico dueño edita los hallazgos: se guardan sin espacios sobrantes y se devuelven al reabrir")
    void elMedicoEditaSusHallazgos() throws Exception {
        String texto = "Osteofitos marginales en el compartimento medial.\nSin esclerosis subcondral.";

        guardarHallazgos(tokenMedico, "   " + texto + "   ")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hallazgos").value(texto));

        assertThat(hallazgosGuardados()).isEqualTo(texto);
        mockMvc.perform(get("/analisis/" + analisisId).header(HttpHeaders.AUTHORIZATION, bearer(tokenMedico)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hallazgos").value(texto));
    }

    @Test
    @DisplayName("Otro médico no puede editar los hallazgos: 404 y el texto no cambia")
    void otroMedicoNoPuedeEditar() throws Exception {
        String tokenOtro = tokenDeOtroMedico();

        guardarHallazgos(tokenOtro, "Texto ajeno").andExpect(status().isNotFound());

        assertThat(hallazgosGuardados()).isEqualTo(HallazgosPredeterminados.para(3));
    }

    @Test
    @DisplayName("Texto vacío o de más de 2000 caracteres: 400 y el texto no cambia; 2000 exactos se aceptan")
    void validaElLargoDelTexto() throws Exception {
        guardarHallazgos(tokenMedico, "   ").andExpect(status().isBadRequest());
        guardarHallazgos(tokenMedico, "a".repeat(2001)).andExpect(status().isBadRequest());
        assertThat(hallazgosGuardados()).isEqualTo(HallazgosPredeterminados.para(3));

        guardarHallazgos(tokenMedico, "a".repeat(2000)).andExpect(status().isOk());
        assertThat(hallazgosGuardados()).hasSize(2000);
    }

    @Test
    @DisplayName("Sin sesión responde 401 y con el rol ADMIN responde 403")
    void soloElRolMedicoPuedeEditar() throws Exception {
        guardarHallazgos(null, "Sin sesión").andExpect(status().isUnauthorized());
        guardarHallazgos(obtenerToken(CORREO_ADMIN, CONTRASENA_DEMO), "Administrador")
                .andExpect(status().isForbidden());

        assertThat(hallazgosGuardados()).isEqualTo(HallazgosPredeterminados.para(3));
    }
}
