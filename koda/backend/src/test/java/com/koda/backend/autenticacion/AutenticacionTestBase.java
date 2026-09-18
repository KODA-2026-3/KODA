package com.koda.backend.autenticacion;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;


@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
public abstract class AutenticacionTestBase {

    /** Cuentas sembradas por DatosIniciales. */
    protected static final String CORREO_ADMIN = "cmendez@hospital.org";
    protected static final String CORREO_MEDICO = "mgarcia@hospital.org";
    protected static final String CONTRASENA_DEMO = "OsteoKnee2026!";

    /** Mensaje unico que devuelve el backend ante cualquier fallo de credenciales. */
    protected static final String MENSAJE_CREDENCIALES_INVALIDAS =
            "Las credenciales ingresadas no son válidas. Intente nuevamente.";

    /** Vista protegida del panel de administracion (/admin/medicos en el frontend). */
    protected static final String RUTA_PROTEGIDA = "/medicos";

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected ObjectMapper objectMapper;

    protected ResultActions intentarLogin(String correo, String contrasena) throws Exception {
        String cuerpo = objectMapper.writeValueAsString(Map.of(
                "email", correo,
                "password", contrasena,
                "rememberSession", false));

        return mockMvc.perform(post("/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(cuerpo));
    }

    /** Inicia sesion y devuelve el JWT; falla la prueba si el login no responde 200. */
    protected String obtenerToken(String correo, String contrasena) throws Exception {
        MvcResult resultado = intentarLogin(correo, contrasena)
                .andExpect(status().isOk())
                .andReturn();
        return leerJson(resultado).get("accessToken").asText();
    }

    protected JsonNode leerJson(MvcResult resultado) throws Exception {
        return objectMapper.readTree(cuerpo(resultado));
    }

    /** Cuerpo de la respuesta en UTF-8, para comparar mensajes con tildes. */
    protected String cuerpo(MvcResult resultado) throws Exception {
        return resultado.getResponse().getContentAsString(StandardCharsets.UTF_8);
    }

    protected static String bearer(String token) {
        return "Bearer " + token;
    }

    protected static String sufijoUnico() {
        return UUID.randomUUID().toString().substring(0, 8);
    }
}