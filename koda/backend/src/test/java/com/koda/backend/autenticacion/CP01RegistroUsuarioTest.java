package com.koda.backend.autenticacion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.emptyOrNullString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.koda.backend.model.Rol;
import com.koda.backend.model.Usuario;
import com.koda.backend.repository.UsuarioRepository;

/**
 * CP-01 · Verificar el registro de un nuevo usuario en la plataforma.
 *
 * En KODA no hay auto-registro: el alta la hace un ADMIN desde el modulo de
 * gestion de medicos (POST /medicos). Precondicion: el usuario no existe.
 * Resultado esperado: queda registrado y puede iniciar sesion (el frontend
 * lo lleva al login / panel).
 */
@DisplayName("CP-01 · Registro de un nuevo usuario")
class CP01RegistroUsuarioTest extends AutenticacionTestBase {

    @Autowired
    private UsuarioRepository repositorio;

    @Autowired
    private PasswordEncoder encoder;

    private Map<String, String> datosValidos(String correo, String usuario, String contrasena) {
        return Map.of(
                "nombre", "Dr. Andrés Pérez",
                "correo", correo,
                "usuario", usuario,
                "contrasenaTemporal", contrasena,
                "telefono", "3001234567",
                "institucion", "Hospital San Ignacio");
    }

    @Test
    @DisplayName("Registro con datos válidos: queda guardado y el nuevo usuario puede iniciar sesión")
    void registroExitosoConDatosValidos() throws Exception {
        String sufijo = sufijoUnico();
        String correo = "aperez." + sufijo + "@hospital.org";
        String usuario = "aperez" + sufijo;
        String contrasena = "Temporal2026!";

        // Precondicion: el usuario no existe
        assertThat(repositorio.findByCorreoIgnoreCase(correo)).isEmpty();

        String tokenAdmin = obtenerToken(CORREO_ADMIN, CONTRASENA_DEMO);

        // Pasos 1-3: diligenciar campos obligatorios y confirmar el registro
        mockMvc.perform(post("/medicos")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokenAdmin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(datosValidos(correo, usuario, contrasena))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", not(emptyOrNullString())))
                .andExpect(jsonPath("$.correo").value(correo))
                .andExpect(jsonPath("$.usuario").value(usuario))
                .andExpect(jsonPath("$.activo").value(true))
                // La contrasena nunca vuelve en la respuesta
                .andExpect(jsonPath("$.contrasena").doesNotExist())
                .andExpect(jsonPath("$.contrasenaTemporal").doesNotExist());

        // El usuario queda registrado correctamente, con rol MEDICO y contrasena cifrada
        Usuario guardado = repositorio.findByCorreoIgnoreCase(correo).orElseThrow();
        assertThat(guardado.getRol()).isEqualTo(Rol.MEDICO);
        assertThat(guardado.isActivo()).isTrue();
        assertThat(guardado.getContrasena()).isNotEqualTo(contrasena);
        assertThat(encoder.matches(contrasena, guardado.getContrasena())).isTrue();

        // Tras el registro puede iniciar sesion y entrar a su panel (rol MEDICO)
        intentarLogin(correo, contrasena)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken", not(emptyOrNullString())))
                .andExpect(jsonPath("$.usuario.correo").value(correo))
                .andExpect(jsonPath("$.usuario.rol").value("MEDICO"));
    }

    @Test
    @DisplayName("Registro con un correo que ya existe: se rechaza con 409")
    void registroConCorreoExistenteSeRechaza() throws Exception {
        String tokenAdmin = obtenerToken(CORREO_ADMIN, CONTRASENA_DEMO);
        long totalAntes = repositorio.count();

        mockMvc.perform(post("/medicos")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokenAdmin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                datosValidos(CORREO_MEDICO, "otro" + sufijoUnico(), "Temporal2026!"))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.mensaje", not(emptyOrNullString())));

        assertThat(repositorio.count()).isEqualTo(totalAntes);
    }

    @Test
    @DisplayName("Registro con campos obligatorios vacíos o inválidos: se rechaza con 400 y no se guarda")
    void registroConCamposInvalidosSeRechaza() throws Exception {
        String tokenAdmin = obtenerToken(CORREO_ADMIN, CONTRASENA_DEMO);
        String sufijo = sufijoUnico();
        String correo = "invalido." + sufijo + "@hospital.org";

        // Nombre vacio
        Map<String, String> sinNombre = Map.of(
                "nombre", "",
                "correo", correo,
                "usuario", "invalido" + sufijo,
                "contrasenaTemporal", "Temporal2026!");

        mockMvc.perform(post("/medicos")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokenAdmin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(sinNombre)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensaje", not(emptyOrNullString())));

        // Contrasena de menos de 8 caracteres
        Map<String, String> contrasenaCorta = Map.of(
                "nombre", "Dr. Prueba",
                "correo", correo,
                "usuario", "invalido" + sufijo,
                "contrasenaTemporal", "123");

        mockMvc.perform(post("/medicos")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokenAdmin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(contrasenaCorta)))
                .andExpect(status().isBadRequest());

        // Correo con formato invalido
        Map<String, String> correoInvalido = Map.of(
                "nombre", "Dr. Prueba",
                "correo", "no-es-un-correo",
                "usuario", "invalido" + sufijo,
                "contrasenaTemporal", "Temporal2026!");

        mockMvc.perform(post("/medicos")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokenAdmin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(correoInvalido)))
                .andExpect(status().isBadRequest());

        assertThat(repositorio.findByCorreoIgnoreCase(correo)).isEmpty();
    }

    @Test
    @DisplayName("Solo un ADMIN puede registrar usuarios: sin sesión 401, con rol MEDICO 403")
    void registroRequiereRolAdmin() throws Exception {
        String sufijo = sufijoUnico();
        String cuerpo = objectMapper.writeValueAsString(
                datosValidos("x." + sufijo + "@hospital.org", "x" + sufijo, "Temporal2026!"));

        mockMvc.perform(post("/medicos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpo))
                .andExpect(status().isUnauthorized());

        String tokenMedico = obtenerToken(CORREO_MEDICO, CONTRASENA_DEMO);
        mockMvc.perform(post("/medicos")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokenMedico))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpo))
                .andExpect(status().isForbidden());

        assertThat(repositorio.findByCorreoIgnoreCase("x." + sufijo + "@hospital.org")).isEmpty();
    }
}