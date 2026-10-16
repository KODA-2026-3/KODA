package com.koda.backend.autenticacion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.emptyOrNullString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MvcResult;

import com.koda.backend.model.Rol;
import com.koda.backend.model.Usuario;
import com.koda.backend.repository.UsuarioRepository;

/**
 * CP-03 · Verificar el manejo de credenciales invalidas.
 *
 * Resultado esperado: el sistema rechaza el acceso y muestra un mensaje claro
 * sin exponer informacion sensible (no revela si el correo existe, ni hashes,
 * ni trazas de error).
 */
@DisplayName("CP-03 · Manejo de credenciales inválidas")
class CP03CredencialesInvalidasTest extends AutenticacionTestBase {

    @Autowired
    private UsuarioRepository repositorio;

    @Autowired
    private PasswordEncoder encoder;

    @Test
    @DisplayName("Contraseña incorrecta: 401, mensaje claro y sin token")
    void contrasenaIncorrectaSeRechaza() throws Exception {
        MvcResult resultado = intentarLogin(CORREO_MEDICO, "ContrasenaEquivocada1!")
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.accessToken").doesNotExist())
                .andReturn();

        assertThat(leerJson(resultado).get("mensaje").asText())
                .isEqualTo(MENSAJE_CREDENCIALES_INVALIDAS);
        assertSinInformacionSensible(cuerpo(resultado), CORREO_MEDICO);
    }

    @Test
    @DisplayName("Usuario inexistente: 401 con el mismo mensaje que una contraseña incorrecta")
    void usuarioInexistenteSeRechazaSinRevelarloQueNoExiste() throws Exception {
        String correoInexistente = "noexiste." + sufijoUnico() + "@hospital.org";

        MvcResult inexistente = intentarLogin(correoInexistente, CONTRASENA_DEMO)
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.accessToken").doesNotExist())
                .andReturn();

        MvcResult contrasenaMala = intentarLogin(CORREO_MEDICO, "ContrasenaEquivocada1!")
                .andExpect(status().isUnauthorized())
                .andReturn();

        // Misma respuesta en ambos casos: no se puede averiguar que cuentas existen
        assertThat(cuerpo(inexistente)).isEqualTo(cuerpo(contrasenaMala));
        assertSinInformacionSensible(cuerpo(inexistente), correoInexistente);
    }

    @Test
    @DisplayName("Cuenta desactivada con contraseña correcta: 401 con el mismo mensaje genérico")
    void cuentaDesactivadaSeRechaza() throws Exception {
        String sufijo = sufijoUnico();
        String correo = "inactivo." + sufijo + "@hospital.org";
        String contrasena = "Inactivo2026!";

        Usuario inactivo = new Usuario("Dr. Inactivo Prueba", correo, "inactivo" + sufijo,
                encoder.encode(contrasena), Rol.MEDICO, "Hospital de Pruebas");
        inactivo.setActivo(false);
        repositorio.save(inactivo);

        MvcResult resultado = intentarLogin(correo, contrasena)
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.accessToken").doesNotExist())
                .andReturn();

        assertThat(leerJson(resultado).get("mensaje").asText())
                .isEqualTo(MENSAJE_CREDENCIALES_INVALIDAS);
    }

    @Test
    @DisplayName("Campos vacíos o correo mal formado: 400 con mensaje y sin token")
    void camposVaciosOFormatoInvalidoSeRechazan() throws Exception {
        intentarLogin("", "")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensaje", not(emptyOrNullString())))
                .andExpect(jsonPath("$.accessToken").doesNotExist());

        intentarLogin("esto-no-es-un-correo", CONTRASENA_DEMO)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.accessToken").doesNotExist());
    }

    /** La respuesta de error no debe filtrar datos internos ni del usuario. */
    private void assertSinInformacionSensible(String cuerpo, String correoIntentado) {
        assertThat(cuerpo)
                .doesNotContain("$2a$", "$2b$")              // hashes BCrypt
                .doesNotContain("Exception", "at com.", "trace") // trazas de error
                .doesNotContain("SQL", "Hibernate")
                .doesNotContain(correoIntentado)
                .doesNotContainIgnoringCase("no existe")
                .doesNotContainIgnoringCase("contraseña incorrecta");
    }
}