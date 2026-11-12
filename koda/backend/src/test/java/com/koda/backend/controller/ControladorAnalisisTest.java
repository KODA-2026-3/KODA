package com.koda.backend.controller;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.koda.backend.dto.AnalisisResumenDTO;
import com.koda.backend.dto.PrediccionDTO;
import com.koda.backend.dto.ResultadoDTO;
import com.koda.backend.model.Lateralidad;
import com.koda.backend.security.JwtService;
import com.koda.backend.service.HistorialAnalisisService;
import com.koda.backend.service.OrquestadorAnalisisService;

@WebMvcTest(ControladorAnalisis.class)
@AutoConfigureMockMvc(addFilters = false)
class ControladorAnalisisTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OrquestadorAnalisisService orquestador;

    @MockBean
    private HistorialAnalisisService historial;

    @MockBean
    private JwtService jwtService;

    @Test
    @DisplayName("POST /predict debe procesar la radiografía y retornar ResultadoDTO")
    void analizar_exitoso_retorna200() throws Exception {
        MockMultipartFile imagen = new MockMultipartFile(
                "imagen", "rx.png", "image/png", new byte[]{1, 2, 3, 4});

        PrediccionDTO prediccion = new PrediccionDTO(
                1, 0.92, List.of(0.02, 0.92, 0.04, 0.01, 0.01), "heatmapBase64", "simulado");
        ResultadoDTO resultado = new ResultadoDTO(
                101L, prediccion, LocalDateTime.now(), "rx.png", 230L, LocalDateTime.now().plusDays(7),
                Lateralidad.IZQUIERDA, "Texto del grado 1");

        when(orquestador.procesarRadiografia(any(), eq(Lateralidad.IZQUIERDA), eq("mgarcia@hospital.org")))
                .thenReturn(resultado);

        Principal principal = () -> "mgarcia@hospital.org";

        mockMvc.perform(multipart("/predict")
                        .file(imagen)
                        .param("lateralidad", "IZQUIERDA")
                        .principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.lateralidad").value("IZQUIERDA"))
                .andExpect(jsonPath("$.analisisId").value(101))
                .andExpect(jsonPath("$.prediccion.gradoKL").value(1))
                .andExpect(jsonPath("$.prediccion.confianza").value(0.92))
                .andExpect(jsonPath("$.nombreArchivo").value("rx.png"));
    }

    @Test
    @DisplayName("POST /predict sin indicar la rodilla responde 400 con un mensaje claro")
    void analizar_sinLateralidad_retorna400() throws Exception {
        MockMultipartFile imagen = new MockMultipartFile(
                "imagen", "rx.png", "image/png", new byte[]{1, 2, 3, 4});

        mockMvc.perform(multipart("/predict").file(imagen).principal(() -> "mgarcia@hospital.org"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensaje").value("Indique si la radiografía es de la rodilla izquierda o derecha."));
    }

    @Test
    @DisplayName("POST /predict con una rodilla inválida responde 400")
    void analizar_lateralidadInvalida_retorna400() throws Exception {
        MockMultipartFile imagen = new MockMultipartFile(
                "imagen", "rx.png", "image/png", new byte[]{1, 2, 3, 4});

        mockMvc.perform(multipart("/predict").file(imagen).param("lateralidad", "CENTRO")
                        .principal(() -> "mgarcia@hospital.org"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("GET /analisis debe listar el historial del médico autenticado")
    void listar_retorna200() throws Exception {
        LocalDateTime ahora = LocalDateTime.now();
        AnalisisResumenDTO item = new AnalisisResumenDTO(
                55L, ahora, "rx_55.png", 2, 0.88, List.of(0.01, 0.05, 0.88, 0.04, 0.02),
                "diko_stage2", 420L, true, ahora.plusDays(7), Lateralidad.DERECHA, "Texto del grado 2");

        when(historial.listar("mgarcia@hospital.org")).thenReturn(List.of(item));

        Principal principal = () -> "mgarcia@hospital.org";

        mockMvc.perform(get("/analisis").principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].analisisId").value(55))
                .andExpect(jsonPath("$[0].gradoKL").value(2))
                .andExpect(jsonPath("$[0].lateralidad").value("DERECHA"));
    }

    @Test
    @DisplayName("PUT /analisis/{id}/hallazgos guarda el texto editado por el médico")
    void actualizarHallazgos_retorna200() throws Exception {
        LocalDateTime ahora = LocalDateTime.now();
        AnalisisResumenDTO actualizado = new AnalisisResumenDTO(
                55L, ahora, "rx_55.png", 2, 0.88, List.of(0.01, 0.05, 0.88, 0.04, 0.02),
                "diko_stage2", 420L, true, ahora.plusDays(7), Lateralidad.DERECHA, "Texto editado");
        when(historial.actualizarHallazgos(55L, "mgarcia@hospital.org", "Texto editado")).thenReturn(actualizado);

        mockMvc.perform(put("/analisis/55/hallazgos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"hallazgos\":\"Texto editado\"}")
                        .principal(() -> "mgarcia@hospital.org"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hallazgos").value("Texto editado"));
    }

    @Test
    @DisplayName("PUT /analisis/{id}/hallazgos rechaza un texto vacío")
    void actualizarHallazgos_vacio_retorna400() throws Exception {
        mockMvc.perform(put("/analisis/55/hallazgos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"hallazgos\":\"   \"}")
                        .principal(() -> "mgarcia@hospital.org"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("DELETE /analisis/{id}/imagen debe eliminar la imagen y retornar 204")
    void eliminarImagen_retorna204() throws Exception {
        Principal principal = () -> "mgarcia@hospital.org";

        mockMvc.perform(delete("/analisis/55/imagen").principal(principal))
                .andExpect(status().isNoContent());

        verify(historial).eliminarImagen(55L, "mgarcia@hospital.org");
    }
}
