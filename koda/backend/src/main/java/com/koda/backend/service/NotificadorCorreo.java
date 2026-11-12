package com.koda.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/** Correos que envia KODA. Sin servidor SMTP configurado (MAIL_HOST vacio) no se envia nada. */
@Component
public class NotificadorCorreo {

    private static final Logger log = LoggerFactory.getLogger(NotificadorCorreo.class);

    private final ObjectProvider<JavaMailSender> correo;
    private final String servidor;
    private final String remitente;
    private final String urlFrontend;

    public NotificadorCorreo(ObjectProvider<JavaMailSender> correo,
                             @Value("${spring.mail.host:}") String servidor,
                             @Value("${koda.correo.remitente}") String remitente,
                             @Value("${koda.correo.url-frontend}") String urlFrontend) {
        this.correo = correo;
        this.servidor = servidor;
        this.remitente = remitente;
        this.urlFrontend = urlFrontend;
    }

    // Asincrono: si la respuesta esperara al SMTP, su demora revelaria que la cuenta existe.
    @Async
    public void enviarCodigo(String destinatario, String nombre, String codigo, int minutosVigencia) {
        if (!hayServidor()) {
            // En desarrollo el log permite probar el flujo sin servidor de correo.
            log.warn("MAIL_HOST no configurado. Codigo de recuperacion para {}: {}", destinatario, codigo);
            return;
        }
        enviar(destinatario, "KODA: código para restablecer su contraseña",
                "Hola, " + nombre + ".\n\n"
                        + "Su código para restablecer la contraseña de KODA es: " + codigo + "\n\n"
                        + "Vence en " + minutosVigencia + " minutos y solo se puede usar una vez. "
                        + "Si usted no lo solicitó, ignore este mensaje: su contraseña no cambiará.");
    }

    @Async
    public void enviarCredenciales(String destinatario, String nombre, String contrasenaTemporal) {
        if (!hayServidor()) {
            // A diferencia del codigo, la contrasena no se escribe en el log: no vence.
            log.warn("MAIL_HOST no configurado. No se enviaron las credenciales a {}", destinatario);
            return;
        }
        enviar(destinatario, "KODA: su cuenta fue creada",
                "Hola, " + nombre + ".\n\n"
                        + "Se creó su cuenta en KODA. Estos son sus datos de acceso:\n\n"
                        + "Correo: " + destinatario + "\n"
                        + "Contraseña temporal: " + contrasenaTemporal + "\n\n"
                        + "Ingrese en: " + urlFrontend + "/login\n\n"
                        + "Si desea restablecer su contraseña, ingrese a la página, haga clic en "
                        + "\"¿Olvidó su contraseña?\" y siga los pasos.");
    }

    private boolean hayServidor() {
        return StringUtils.hasText(servidor);
    }

    private void enviar(String destinatario, String asunto, String texto) {
        SimpleMailMessage mensaje = new SimpleMailMessage();
        mensaje.setFrom(remitente);
        mensaje.setTo(destinatario);
        mensaje.setSubject(asunto);
        mensaje.setText(texto);
        try {
            correo.getObject().send(mensaje);
        } catch (MailException e) {
            log.error("No se pudo enviar el correo \"{}\" a {}: {}", asunto, destinatario, e.getMessage());
        }
    }
}
