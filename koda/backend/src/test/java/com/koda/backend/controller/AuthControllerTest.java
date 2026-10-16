package com.koda.backend.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.koda.backend.dto.LoginRequest;
import com.koda.backend.dto.LoginResponse;
import com.koda.backend.dto.UsuarioResponse;
import com.koda.backend.exception.CredencialesInvalidasException;
import com.koda.backend.security.JwtService;
import com.koda.backend.service.AuthService;

@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = false)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthService authService;

    @MockBean
    private JwtService jwtService;

    @Test
    @DisplayName("POST /auth/login con credenciales válidas debe retornar 200 OK y token")
    void login_exitoso_retorna200() throws Exception {
        LoginRequest request = new LoginRequest("mgarcia@hospital.org", "Password123!", false);
        UsuarioResponse usuarioResponse = new UsuarioResponse(
                "u-1", "Dra. Maria Garcia", "mgarcia@hospital.org", "mgarcia", "MEDICO", "Hospital", "MG");
        LoginResponse response = new LoginResponse("mock.jwt.token", "Bearer", 86400, usuarioResponse);

        when(authService.authenticate(any(LoginRequest.class))).thenReturn(response);

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("mock.jwt.token"))
                .andExpect(jsonPath("$.usuario.correo").value("mgarcia@hospital.org"))
                .andExpect(jsonPath("$.usuario.rol").value("MEDICO"));
    }

    @Test
    @DisplayName("POST /auth/login con credenciales inválidas debe retornar 401 UNAUTHORIZED")
    void login_invalido_retorna401() throws Exception {
        LoginRequest request = new LoginRequest("mgarcia@hospital.org", "BadPass", false);

        when(authService.authenticate(any(LoginRequest.class)))
                .thenThrow(new CredencialesInvalidasException());

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.mensaje").value("Las credenciales ingresadas no son válidas. Intente nuevamente."));
    }

    @Test
    @DisplayName("POST /auth/login con correo inválido debe retornar 400 BAD REQUEST por validación")
    void login_datosInvalidos_retorna400() throws Exception {
        LoginRequest request = new LoginRequest("no-es-correo", "", false);

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }
}
