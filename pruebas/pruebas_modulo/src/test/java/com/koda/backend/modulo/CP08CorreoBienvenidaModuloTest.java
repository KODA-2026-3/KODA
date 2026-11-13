package com.koda.backend.modulo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.after;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.ResultActions;

/**
 * CP-08 · Modulo Medicos + componente de correo: correo de bienvenida (RF-26).
 *
 * Usa el MedicoService y el NotificadorCorreo reales; solo el servidor SMTP
 * (JavaMailSender) es un doble, para comprobar que mensaje sale sin enviar
 * correos de verdad. El envio es asincrono, por eso se verifica con timeout.
 */
@DisplayName("CP-08 · Módulo Médicos: correo de bienvenida con credenciales")
@TestPropertySource(properties = {
        "spring.mail.host=smtp.pruebas.koda",
        "koda.correo.remitente=no-reply@koda.local",
        "koda.correo.url-frontend=http://koda.pruebas"
})
class CP08CorreoBienvenidaModuloTest extends ModuloTestBase {

    @MockBean
    private JavaMailSender servidorCorreo;

    private String tokenAdmin;

    @BeforeEach
    void preparar() throws Exception {
        Mockito.reset(servidorCorreo);
        tokenAdmin = obtenerToken(CORREO_ADMIN, CONTRASENA_DEMO);
    }

    private ResultActions crearMedico(String correo, String usuario, String contrasena) throws Exception {
        Map<String, String> datos = Map.of(
                "nombre", "Dra. Laura Ríos",
                "correo", correo,
                "usuario", usuario,
                "contrasenaTemporal", contrasena,
                "telefono", "3001234567",
                "institucion", "Hospital San Ignacio");
        return mockMvc.perform(post("/medicos")
                .header(HttpHeaders.AUTHORIZATION, bearer(tokenAdmin))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(datos)));
    }

    @Test
    @DisplayName("Al crear un médico se le envía un correo con usuario, contraseña temporal, enlace e instrucciones")
    void creaMedicoYEnviaCredenciales() throws Exception {
        String sufijo = sufijoUnico();
        String correo = "lrios." + sufijo + "@hospital.org";

        crearMedico(correo, "lrios" + sufijo, "Temporal2026!").andExpect(status().isCreated());

        ArgumentCaptor<SimpleMailMessage> enviado = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(servidorCorreo, timeout(3000)).send(enviado.capture());
        SimpleMailMessage mensaje = enviado.getValue();
        assertThat(mensaje.getTo()).containsExactly(correo);
        assertThat(mensaje.getFrom()).isEqualTo("no-reply@koda.local");
        assertThat(mensaje.getSubject()).isEqualTo("KODA: su cuenta fue creada");
        assertThat(mensaje.getText())
                .contains("Dra. Laura Ríos")
                .contains("Correo: " + correo)
                .contains("Contraseña temporal: Temporal2026!")
                .contains("http://koda.pruebas/login")
                .contains("¿Olvidó su contraseña?");
    }

    @Test
    @DisplayName("Si el servidor de correo falla, la cuenta se crea igual y puede iniciar sesión")
    void unFalloSmtpNoImpideCrearLaCuenta() throws Exception {
        doThrow(new MailSendException("SMTP no disponible")).when(servidorCorreo).send(any(SimpleMailMessage.class));
        String sufijo = sufijoUnico();
        String correo = "lrios." + sufijo + "@hospital.org";

        crearMedico(correo, "lrios" + sufijo, "Temporal2026!").andExpect(status().isCreated());

        verify(servidorCorreo, timeout(3000)).send(any(SimpleMailMessage.class));
        assertThat(usuarios.findByCorreoIgnoreCase(correo)).isPresent();
        intentarLogin(correo, "Temporal2026!").andExpect(status().isOk());
    }

    @Test
    @DisplayName("Si la creación falla por correo repetido (409), no se envía ningún correo")
    void conCorreoRepetidoNoSeEnviaCorreo() throws Exception {
        crearMedico(CORREO_MEDICO, "nuevo" + sufijoUnico(), "Temporal2026!").andExpect(status().isConflict());

        verify(servidorCorreo, after(1000).never()).send(any(SimpleMailMessage.class));
    }
}
