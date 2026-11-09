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

/**
 * Envia el codigo de recuperacion por correo. Sin servidor SMTP configurado
 * (MAIL_HOST vacio) lo escribe en el log, para poder probar el flujo en desarrollo.
 */
@Component
public class NotificadorRecuperacion {

    private static final Logger log = LoggerFactory.getLogger(NotificadorRecuperacion.class);

    private final ObjectProvider<JavaMailSender> correo;
    private final String servidor;
    private final String remitente;

    public NotificadorRecuperacion(ObjectProvider<JavaMailSender> correo,
                                   @Value("${spring.mail.host:}") String servidor,
                                   @Value("${koda.recuperacion.remitente}") String remitente) {
        this.correo = correo;
        this.servidor = servidor;
        this.remitente = remitente;
    }

    // Asincrono: si la respuesta esperara al SMTP, su demora revelaria que la cuenta existe.
    @Async
    public void enviarCodigo(String destinatario, String nombre, String codigo, int minutosVigencia) {
        if (!StringUtils.hasText(servidor)) {
            log.warn("MAIL_HOST no configurado. Codigo de recuperacion para {}: {}", destinatario, codigo);
            return;
        }
        SimpleMailMessage mensaje = new SimpleMailMessage();
        mensaje.setFrom(remitente);
        mensaje.setTo(destinatario);
        mensaje.setSubject("KODA: código para restablecer su contraseña");
        mensaje.setText("Hola, " + nombre + ".\n\n"
                + "Su código para restablecer la contraseña de KODA es: " + codigo + "\n\n"
                + "Vence en " + minutosVigencia + " minutos y solo se puede usar una vez. "
                + "Si usted no lo solicitó, ignore este mensaje: su contraseña no cambiará.");
        try {
            correo.getObject().send(mensaje);
        } catch (MailException e) {
            log.error("No se pudo enviar el codigo de recuperacion a {}: {}", destinatario, e.getMessage());
        }
    }
}
