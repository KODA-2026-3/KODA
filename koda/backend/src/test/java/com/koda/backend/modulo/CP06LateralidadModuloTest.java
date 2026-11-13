package com.koda.backend.modulo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.sql.Timestamp;
import java.time.LocalDateTime;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MvcResult;

import com.koda.backend.ia.IModuloIAClient;
import com.koda.backend.model.HallazgosPredeterminados;
import com.koda.backend.model.Lateralidad;
import com.koda.backend.model.MetadatoAnalisis;
import com.koda.backend.repository.RepositorioAnalisis;

/**
 * CP-06 · Modulo Analisis: la rodilla (RF-24) y los hallazgos predeterminados (RF-25).
 *
 * Recorre controlador, orquestador, historial y base de datos H2 (migraciones
 * V7 y V8). El servicio de inferencia se sustituye por un doble que responde
 * grado 3, para que la prueba no dependa del modelo.
 */
@DisplayName("CP-06 · Módulo Análisis: lateralidad y hallazgos predeterminados")
class CP06LateralidadModuloTest extends ModuloTestBase {

    @MockBean
    private IModuloIAClient ia;

    @Autowired
    private RepositorioAnalisis registros;

    @Autowired
    private JdbcTemplate jdbc;

    private String tokenMedico;

    @BeforeEach
    void preparar() throws Exception {
        when(ia.solicitarInferencia(any())).thenReturn(prediccionGrado3());
        tokenMedico = obtenerToken(CORREO_MEDICO, CONTRASENA_DEMO);
    }

    @Test
    @DisplayName("Con la rodilla indicada: el registro guarda la lateralidad y los hallazgos del grado")
    void analisisConRodillaGuardaLateralidadYHallazgos() throws Exception {
        MvcResult resultado = analizar(tokenMedico, "IZQUIERDA")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.lateralidad").value("IZQUIERDA"))
                .andExpect(jsonPath("$.hallazgos").value(HallazgosPredeterminados.para(3)))
                .andReturn();
        long id = leerJson(resultado).get("analisisId").asLong();

        MetadatoAnalisis guardado = registros.findById(id).orElseThrow();
        assertThat(guardado.getLateralidad()).isEqualTo(Lateralidad.IZQUIERDA);
        assertThat(guardado.getHallazgos()).isEqualTo(HallazgosPredeterminados.para(3));
        // La columna queda escrita, no solo calculada al leer.
        assertThat(jdbc.queryForObject("SELECT hallazgos FROM metadatos_analisis WHERE id = ?", String.class, id))
                .isEqualTo(HallazgosPredeterminados.para(3));

        // El historial y el detalle devuelven la misma rodilla
        mockMvc.perform(get("/analisis/" + id).header(HttpHeaders.AUTHORIZATION, bearer(tokenMedico)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.lateralidad").value("IZQUIERDA"));
    }

    @Test
    @DisplayName("Sin la rodilla: 400 con mensaje claro, sin llamar al modelo ni crear registro")
    void analisisSinRodillaSeRechazaSinEfectos() throws Exception {
        long antes = registros.count();

        analizar(tokenMedico, null)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensaje").value("Indique si la radiografía es de la rodilla izquierda o derecha."));

        verify(ia, never()).solicitarInferencia(any());
        assertThat(registros.count()).isEqualTo(antes);
    }

    @Test
    @DisplayName("Con un valor de rodilla no válido: 400, sin llamar al modelo ni crear registro")
    void analisisConRodillaInvalidaSeRechaza() throws Exception {
        long antes = registros.count();

        analizar(tokenMedico, "CENTRO").andExpect(status().isBadRequest());

        verify(ia, never()).solicitarInferencia(any());
        assertThat(registros.count()).isEqualTo(antes);
    }

    @Test
    @DisplayName("Un análisis anterior a V7/V8 se consulta sin rodilla y con los hallazgos del grado")
    void analisisAnteriorSinRodillaNiHallazgos() throws Exception {
        String usuarioId = usuarios.findByCorreoIgnoreCase(CORREO_MEDICO).orElseThrow().getId();
        jdbc.update("""
                INSERT INTO metadatos_analisis (usuario_id, nombre_archivo, grado_kl, confianza,
                    tiempo_procesamiento_ms, modelo, fecha_creacion, probabilidades)
                VALUES (?, 'antiguo.png', 2, 0.7, 900, 'diko_stage2', ?, '0.05,0.1,0.7,0.1,0.05')
                """, usuarioId, Timestamp.valueOf(LocalDateTime.now().minusDays(30)));
        Long id = jdbc.queryForObject(
                "SELECT MAX(id) FROM metadatos_analisis WHERE nombre_archivo = 'antiguo.png'", Long.class);

        mockMvc.perform(get("/analisis/" + id).header(HttpHeaders.AUTHORIZATION, bearer(tokenMedico)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.lateralidad").doesNotExist())
                .andExpect(jsonPath("$.hallazgos").value(HallazgosPredeterminados.para(2)));
    }

    @Test
    @DisplayName("La base de datos rechaza una lateralidad distinta de IZQUIERDA o DERECHA (V7)")
    void laBaseRechazaLateralidadInvalida() {
        String usuarioId = usuarios.findByCorreoIgnoreCase(CORREO_MEDICO).orElseThrow().getId();

        assertThatThrownBy(() -> jdbc.update("""
                INSERT INTO metadatos_analisis (usuario_id, nombre_archivo, grado_kl, confianza,
                    tiempo_procesamiento_ms, modelo, fecha_creacion, lateralidad)
                VALUES (?, 'invalido.png', 1, 0.5, 900, 'diko_stage2', ?, 'CENTRO')
                """, usuarioId, Timestamp.valueOf(LocalDateTime.now())))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}
