package com.koda.backend.controller;

import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.mockito.Mockito.when;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.koda.backend.dto.ConteoGradoKL;
import com.koda.backend.dto.ConteoPorDia;
import com.koda.backend.dto.EstadisticasDTO;
import com.koda.backend.security.JwtService;
import com.koda.backend.service.EstadisticasService;

@WebMvcTest(ControladorEstadisticas.class)
@AutoConfigureMockMvc(addFilters = false)
class ControladorEstadisticasTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private EstadisticasService servicio;

    @MockBean
    private JwtService jwtService;

    @Test
    @DisplayName("GET /estadisticas debe retornar 200 OK con el DTO de estadísticas")
    void obtener_retorna200() throws Exception {
        EstadisticasDTO dto = new EstadisticasDTO(
                100L,
                15L,
                0.89,
                4L,
                List.of(new ConteoGradoKL(0, 10L), new ConteoGradoKL(1, 20L)),
                List.of(new ConteoPorDia(LocalDate.now(), 15L)));

        when(servicio.obtener()).thenReturn(dto);

        mockMvc.perform(get("/estadisticas"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalRadiografias").value(100))
                .andExpect(jsonPath("$.radiografiasHoy").value(15))
                .andExpect(jsonPath("$.confianzaPromedio").value(0.89))
                .andExpect(jsonPath("$.medicosActivos").value(4));
    }
}
