package com.koda.backend.autenticacion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MvcResult;

import com.koda.backend.model.Usuario;
import com.koda.backend.repository.UsuarioRepository;
import com.koda.backend.security.JwtService;

import io.jsonwebtoken.Claims;

/**
 * CP-02 · Verificar el inicio de sesion con credenciales validas.
 *
 * Precondicion: usuario previamente registrado (cuentas sembradas por DatosIniciales).
 * Resultado esperado: el sistema autentica mediante JWT y el usuario puede
 * entrar a su panel principal (el frontend decide el panel segun el rol).
 */
@DisplayName("CP-02 · Inicio de sesión con credenciales válidas")
class CP02InicioSesionValidoTest extends AutenticacionTestBase {

    /** Formato compacto de un JWT: cabecera.payload.firma en Base64URL. */
    private static final String PATRON_JWT = "^[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+$";

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UsuarioRepository repositorio;

    @Test
    @DisplayName("Login válido devuelve un JWT Bearer y los datos del usuario sin exponer la contraseña")
    void loginValidoDevuelveJwt() throws Exception {
        MvcResult resultado = intentarLogin(CORREO_MEDICO, CONTRASENA_DEMO)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.accessToken", matchesPattern(PATRON_JWT)))
                .andExpect(jsonPath("$.expiresIn").value(86400))
                .andExpect(jsonPath("$.usuario.correo").value(CORREO_MEDICO))
                .andExpect(jsonPath("$.usuario.rol").value("MEDICO"))
                .andExpect(jsonPath("$.usuario.contrasena").doesNotExist())
                .andReturn();

        // El token es un JWT firmado por el backend con la identidad y el rol correctos
        String token = leerJson(resultado).get("accessToken").asText();
        Claims claims = jwtService.verificar(token).getPayload();

        assertThat(claims.getSubject()).isEqualTo(CORREO_MEDICO);
        assertThat(claims.get("rol", String.class)).isEqualTo("MEDICO");
        assertThat(claims.getExpiration()).isAfter(claims.getIssuedAt());
    }

    @Test
    @DisplayName("El correo no distingue mayúsculas y el login registra el último acceso")
    void loginRegistraUltimoAcceso() throws Exception {
        intentarLogin(CORREO_MEDICO.toUpperCase(), CONTRASENA_DEMO)
                .andExpect(status().isOk());

        Usuario usuario = repositorio.findByCorreoIgnoreCase(CORREO_MEDICO).orElseThrow();
        assertThat(usuario.getUltimoAcceso()).isNotNull();
    }

    @Test
    @DisplayName("Con el JWT el ADMIN accede a su panel principal (gestión de médicos)")
    void adminAccedeASuPanelConElToken() throws Exception {
        String token = obtenerToken(CORREO_ADMIN, CONTRASENA_DEMO);

        mockMvc.perform(get(RUTA_PROTEGIDA)
                        .header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @DisplayName("Con el JWT el MÉDICO supera la seguridad de su panel principal (análisis)")
    void medicoAccedeASuPanelConElToken() throws Exception {
        String token = obtenerToken(CORREO_MEDICO, CONTRASENA_DEMO);

        // Se envia la peticion sin imagen: basta con comprobar que la seguridad
        // la deja pasar (no 401 ni 403) sin llegar a invocar el modulo de IA.
        MvcResult resultado = mockMvc.perform(multipart("/predict")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andReturn();

        assertThat(resultado.getResponse().getStatus()).isNotIn(401, 403);
    }
}