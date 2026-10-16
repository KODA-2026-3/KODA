package com.koda.backend.controller;

import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.koda.backend.dto.ActualizarMedicoRequest;
import com.koda.backend.dto.CrearMedicoRequest;
import com.koda.backend.dto.MedicoResponse;
import com.koda.backend.exception.ConflictoException;
import com.koda.backend.exception.RecursoNoEncontradoException;
import com.koda.backend.security.JwtService;
import com.koda.backend.service.MedicoService;

@WebMvcTest(MedicoController.class)
@AutoConfigureMockMvc(addFilters = false)
class MedicoControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private MedicoService servicio;

    @MockBean
    private JwtService jwtService;

    @Test
    @DisplayName("GET /medicos debe listar médicos correctamente")
    void listar_retorna200() throws Exception {
        MedicoResponse res = new MedicoResponse(
                "u-1", "Dra. Maria Garcia", "mgarcia@hospital.org", "mgarcia", "3001234567", "Hospital", true, Instant.now());
        when(servicio.listar()).thenReturn(List.of(res));

        mockMvc.perform(get("/medicos"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("u-1"))
                .andExpect(jsonPath("$[0].correo").value("mgarcia@hospital.org"));
    }

    @Test
    @DisplayName("GET /medicos/{id} debe devolver un médico existente")
    void obtener_existente_retorna200() throws Exception {
        MedicoResponse res = new MedicoResponse(
                "u-1", "Dra. Maria Garcia", "mgarcia@hospital.org", "mgarcia", "3001234567", "Hospital", true, Instant.now());
        when(servicio.obtener("u-1")).thenReturn(res);

        mockMvc.perform(get("/medicos/u-1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("u-1"))
                .andExpect(jsonPath("$.nombre").value("Dra. Maria Garcia"));
    }

    @Test
    @DisplayName("GET /medicos/{id} con ID no encontrado debe retornar 404")
    void obtener_inexistente_retorna404() throws Exception {
        when(servicio.obtener("u-inexistente"))
                .thenThrow(new RecursoNoEncontradoException("No existe"));

        mockMvc.perform(get("/medicos/u-inexistente"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.mensaje").value("No existe"));
    }

    @Test
    @DisplayName("POST /medicos debe crear un médico y retornar 201 CREATED")
    void crear_valido_retorna201() throws Exception {
        CrearMedicoRequest req = new CrearMedicoRequest(
                "Dr. Pedro", "pedro@hospital.org", "ppedro", "Clave12345!", "Hospital", "1234567");
        MedicoResponse res = new MedicoResponse(
                "u-2", "Dr. Pedro", "pedro@hospital.org", "ppedro", "1234567", "Hospital", true, Instant.now());

        when(servicio.crear(any(CrearMedicoRequest.class))).thenReturn(res);

        mockMvc.perform(post("/medicos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value("u-2"))
                .andExpect(jsonPath("$.correo").value("pedro@hospital.org"));
    }

    @Test
    @DisplayName("POST /medicos con conflicto de correo debe retornar 409 CONFLICT")
    void crear_conflicto_retorna409() throws Exception {
        CrearMedicoRequest req = new CrearMedicoRequest(
                "Dr. Pedro", "pedro@hospital.org", "ppedro", "Clave12345!", "Hospital", "1234567");

        when(servicio.crear(any(CrearMedicoRequest.class)))
                .thenThrow(new ConflictoException("Ya existe una cuenta con ese correo"));

        mockMvc.perform(post("/medicos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.mensaje").value("Ya existe una cuenta con ese correo"));
    }

    @Test
    @DisplayName("PUT /medicos/{id} debe actualizar el médico")
    void actualizar_valido_retorna200() throws Exception {
        ActualizarMedicoRequest req = new ActualizarMedicoRequest(
                "Dr. Pedro Modificado", "pedro@hospital.org", "ppedro", "Hospital", "1234567");
        MedicoResponse res = new MedicoResponse(
                "u-2", "Dr. Pedro Modificado", "pedro@hospital.org", "ppedro", "1234567", "Hospital", true, Instant.now());

        when(servicio.actualizar(eq("u-2"), any(ActualizarMedicoRequest.class))).thenReturn(res);

        mockMvc.perform(put("/medicos/u-2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nombre").value("Dr. Pedro Modificado"));
    }

    @Test
    @DisplayName("DELETE /medicos/{id} debe eliminar y retornar 204 NO CONTENT")
    void eliminar_retorna204() throws Exception {
        doNothing().when(servicio).eliminar("u-1");

        mockMvc.perform(delete("/medicos/u-1"))
                .andExpect(status().isNoContent());
    }
}
