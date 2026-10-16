package com.koda.backend.controller;

import java.time.LocalDateTime;
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

import com.koda.backend.dto.AnalisisResponse;
import com.koda.backend.repository.UsuarioRepository;
import com.koda.backend.security.JwtService;
import com.koda.backend.service.HistorialService;

@WebMvcTest(HistorialController.class)
@AutoConfigureMockMvc(addFilters = false)
class HistorialControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private HistorialService historialService;

    @MockBean
    private UsuarioRepository usuarioRepository;

    @MockBean
    private JwtService jwtService;

    @Test
    @DisplayName("GET /admin/analisis debe retornar el listado completo de análisis para el administrador")
    void listarTodos_retorna200() throws Exception {
        AnalisisResponse item = new AnalisisResponse(
                10L, "rx_admin.png", 3, 0.87, 350L, "diko_stage2", LocalDateTime.now(), "Dra. María García");

        when(historialService.listarTodos()).thenReturn(List.of(item));

        mockMvc.perform(get("/admin/analisis"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(10))
                .andExpect(jsonPath("$[0].nombreArchivo").value("rx_admin.png"))
                .andExpect(jsonPath("$[0].medicoNombre").value("Dra. María García"));
    }
}

