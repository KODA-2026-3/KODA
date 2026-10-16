package com.koda.backend.controller;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.koda.backend.dto.PrediccionDTO;
import com.koda.backend.dto.ResultadoDTO;
import com.koda.backend.security.JwtService;
import com.koda.backend.service.OrquestadorAnalisisService;

@WebMvcTest(ControladorAnalisis.class)
@AutoConfigureMockMvc(addFilters = false)
class ControladorAnalisisTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private OrquestadorAnalisisService orquestador;

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
                101L, prediccion, LocalDateTime.now(), "rx.png", 230L);

        when(orquestador.procesarRadiografia(any(), eq("mgarcia@hospital.org"))).thenReturn(resultado);

        Principal principal = () -> "mgarcia@hospital.org";

        mockMvc.perform(multipart("/predict")
                        .file(imagen)
                        .principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.analisisId").value(101))
                .andExpect(jsonPath("$.prediccion.gradoKL").value(1))
                .andExpect(jsonPath("$.prediccion.confianza").value(0.92))
                .andExpect(jsonPath("$.nombreArchivo").value("rx.png"));
    }
}
