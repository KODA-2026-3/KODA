package com.koda.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import static org.mockito.ArgumentMatchers.any;
import org.mockito.Mock;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

@ExtendWith(MockitoExtension.class)
class NotificadorCorreoTest {

    private static final String URL = "https://koda.example";

    @Mock
    private ObjectProvider<JavaMailSender> proveedor;

    @Mock
    private JavaMailSender correo;

    private NotificadorCorreo notificador(String servidor) {
        lenient().when(proveedor.getObject()).thenReturn(correo);
        return new NotificadorCorreo(proveedor, servidor, "koda@example.org", URL);
    }

    private SimpleMailMessage mensajeEnviado() {
        ArgumentCaptor<SimpleMailMessage> mensaje = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(correo).send(mensaje.capture());
        return mensaje.getValue();
    }

    @Test
    @DisplayName("El correo de bienvenida trae las credenciales y explica cómo restablecer la contraseña")
    void enviarCredenciales_incluyeDatosEInstrucciones() {
        notificador("smtp.example").enviarCredenciales("medico@hospital.org", "Dra. Prueba", "Temporal2026!");

        SimpleMailMessage mensaje = mensajeEnviado();
        assertThat(mensaje.getTo()).containsExactly("medico@hospital.org");
        assertThat(mensaje.getFrom()).isEqualTo("koda@example.org");
        assertThat(mensaje.getText())
                .contains("Dra. Prueba", "medico@hospital.org", "Temporal2026!", URL + "/login", "¿Olvidó su contraseña?");
    }

    @Test
    @DisplayName("Sin servidor SMTP no se intenta enviar")
    void enviarCredenciales_sinServidor_noEnvia() {
        notificador("").enviarCredenciales("medico@hospital.org", "Dra. Prueba", "Temporal2026!");

        verify(correo, never()).send(any(SimpleMailMessage.class));
    }

    @Test
    @DisplayName("Un fallo del servidor de correo no se propaga")
    void enviarCredenciales_falloSmtp_noLanza() {
        doThrow(new MailSendException("sin conexión")).when(correo).send(any(SimpleMailMessage.class));

        notificador("smtp.example").enviarCredenciales("medico@hospital.org", "Dra. Prueba", "Temporal2026!");

        verify(correo).send(any(SimpleMailMessage.class));
    }

    @Test
    @DisplayName("El correo de recuperación trae el código y su vigencia")
    void enviarCodigo_incluyeCodigoYVigencia() {
        notificador("smtp.example").enviarCodigo("medico@hospital.org", "Dra. Prueba", "123456", 15);

        assertThat(mensajeEnviado().getText()).contains("123456", "15 minutos");
    }
}
