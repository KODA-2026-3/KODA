package com.koda.backend.autenticacion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.ResultActions;

import com.koda.backend.model.Rol;
import com.koda.backend.model.Usuario;
import com.koda.backend.repository.UsuarioRepository;
import com.koda.backend.service.NotificadorCorreo;

/** Flujo completo con la base real: cada prueba usa su propia cuenta para no afectar las sembradas. */
class CP05RestablecerContrasenaTest extends AutenticacionTestBase {

    private static final String CONTRASENA_INICIAL = "Inicial2026!";
    private static final String CONTRASENA_NUEVA = "Renovada2026!";

    @MockBean
    private NotificadorCorreo notificador;

    @Autowired
    private UsuarioRepository usuarios;

    @Autowired
    private PasswordEncoder encoder;

    private String correo;

    @BeforeEach
    void crearCuenta() {
        String sufijo = sufijoUnico();
        correo = "recuperacion" + sufijo + "@hospital.org";
        usuarios.save(new Usuario("Dra. Prueba", correo, "recuperacion" + sufijo,
                encoder.encode(CONTRASENA_INICIAL), Rol.MEDICO, "Hospital Central"));
    }

    private ResultActions solicitar(String destinatario) throws Exception {
        return mockMvc.perform(post("/auth/recuperacion")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("correo", destinatario))));
    }

    private ResultActions restablecer(String codigo) throws Exception {
        return mockMvc.perform(post("/auth/recuperacion/restablecer")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of(
                        "correo", correo, "codigo", codigo, "nuevaContrasena", CONTRASENA_NUEVA))));
    }

    private String codigoEnviado() {
        ArgumentCaptor<String> codigo = ArgumentCaptor.forClass(String.class);
        verify(notificador).enviarCodigo(eq(correo), anyString(), codigo.capture(), anyInt());
        return codigo.getValue();
    }

    @Test
    @DisplayName("Con el código enviado la contraseña cambia: entra la nueva y deja de entrar la anterior")
    void codigoCorrecto_cambiaLaContrasena() throws Exception {
        solicitar(correo).andExpect(status().isNoContent());

        restablecer(codigoEnviado()).andExpect(status().isNoContent());

        intentarLogin(correo, CONTRASENA_NUEVA).andExpect(status().isOk());
        intentarLogin(correo, CONTRASENA_INICIAL).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("El código solo se puede usar una vez")
    void codigoUsado_noSirveOtraVez() throws Exception {
        solicitar(correo).andExpect(status().isNoContent());
        String codigo = codigoEnviado();

        restablecer(codigo).andExpect(status().isNoContent());

        restablecer(codigo).andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Sin el código correcto la contraseña no cambia")
    void codigoErrado_noCambiaLaContrasena() throws Exception {
        solicitar(correo).andExpect(status().isNoContent());
        String correcto = codigoEnviado();
        String errado = correcto.equals("000000") ? "000001" : "000000";

        restablecer(errado).andExpect(status().isBadRequest());

        intentarLogin(correo, CONTRASENA_INICIAL).andExpect(status().isOk());
    }

    @Test
    @DisplayName("Tras cinco intentos fallidos ni el código correcto sirve")
    void intentosAgotados_invalidanElCodigo() throws Exception {
        solicitar(correo).andExpect(status().isNoContent());
        String correcto = codigoEnviado();
        String errado = correcto.equals("000000") ? "000001" : "000000";

        for (int i = 0; i < 5; i++) {
            restablecer(errado).andExpect(status().isBadRequest());
        }

        restablecer(correcto).andExpect(status().isBadRequest());
        assertThat(encoder.matches(CONTRASENA_INICIAL,
                usuarios.findByCorreoIgnoreCase(correo).orElseThrow().getContrasena())).isTrue();
    }

    @Test
    @DisplayName("Un correo desconocido recibe la misma respuesta y no se envía nada")
    void correoDesconocido_noRevelaNada() throws Exception {
        solicitar("nadie" + sufijoUnico() + "@hospital.org").andExpect(status().isNoContent());

        verify(notificador, never()).enviarCodigo(anyString(), anyString(), anyString(), anyInt());
    }
}
