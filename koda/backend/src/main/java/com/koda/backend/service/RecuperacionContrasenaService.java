package com.koda.backend.service;

import java.security.SecureRandom;
import java.time.LocalDateTime;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.koda.backend.exception.CodigoRecuperacionInvalidoException;
import com.koda.backend.model.CodigoRecuperacion;
import com.koda.backend.model.Usuario;
import com.koda.backend.repository.RepositorioCodigoRecuperacion;
import com.koda.backend.repository.UsuarioRepository;

/** Restablecimiento de contrasena con un codigo de un solo uso enviado al correo (RF-13). */
@Service
public class RecuperacionContrasenaService {

    private static final int MAXIMO_INTENTOS = 5;
    private static final int LIMITE_CODIGO = 1_000_000;

    private final SecureRandom aleatorio = new SecureRandom();

    private final UsuarioRepository usuarios;
    private final RepositorioCodigoRecuperacion codigos;
    private final PasswordEncoder encoder;
    private final NotificadorCorreo notificador;
    private final int minutosVigencia;
    private final int segundosEntreCodigos;

    public RecuperacionContrasenaService(UsuarioRepository usuarios, RepositorioCodigoRecuperacion codigos,
                                         PasswordEncoder encoder, NotificadorCorreo notificador,
                                         @Value("${koda.recuperacion.vigencia-minutos}") int minutosVigencia,
                                         @Value("${koda.recuperacion.espera-segundos}") int segundosEntreCodigos) {
        this.usuarios = usuarios;
        this.codigos = codigos;
        this.encoder = encoder;
        this.notificador = notificador;
        this.minutosVigencia = minutosVigencia;
        this.segundosEntreCodigos = segundosEntreCodigos;
    }

    /** No informa si la cuenta existe: el resultado es el mismo para cualquier correo. */
    @Transactional
    public void solicitar(String correo) {
        // El hash se calcula siempre: si solo se hiciera con cuentas reales, el
        // tiempo de respuesta delataria cuales existen.
        String codigo = String.format("%06d", aleatorio.nextInt(LIMITE_CODIGO));
        String hash = encoder.encode(codigo);
        LocalDateTime ahora = LocalDateTime.now();

        usuarios.findByCorreoIgnoreCase(correo.trim())
                .filter(Usuario::isActivo)
                .filter(usuario -> !tieneCodigoReciente(usuario.getId(), ahora))
                .ifPresent(usuario -> {
                    codigos.save(new CodigoRecuperacion(usuario.getId(), hash, ahora.plusMinutes(minutosVigencia), ahora));
                    notificador.enviarCodigo(usuario.getCorreo(), usuario.getNombre(), codigo, minutosVigencia);
                });
    }

    // noRollbackFor: el intento fallido debe quedar guardado aunque se lance la excepcion.
    @Transactional(noRollbackFor = CodigoRecuperacionInvalidoException.class)
    public void restablecer(String correo, String codigo, String nuevaContrasena) {
        Usuario usuario = usuarios.findByCorreoIgnoreCase(correo.trim())
                .filter(Usuario::isActivo)
                .orElseThrow(CodigoRecuperacionInvalidoException::new);
        CodigoRecuperacion registro = codigos.findById(usuario.getId())
                .filter(c -> c.getExpiraEn().isAfter(LocalDateTime.now()))
                .orElseThrow(CodigoRecuperacionInvalidoException::new);

        if (!encoder.matches(codigo, registro.getCodigoHash())) {
            registrarFallo(registro);
            throw new CodigoRecuperacionInvalidoException();
        }

        usuario.setContrasena(encoder.encode(nuevaContrasena));
        usuarios.save(usuario);
        codigos.delete(registro);
    }

    private boolean tieneCodigoReciente(String usuarioId, LocalDateTime ahora) {
        return codigos.findById(usuarioId)
                .filter(c -> c.getCreadoEn().plusSeconds(segundosEntreCodigos).isAfter(ahora))
                .isPresent();
    }

    /** Agotados los intentos el codigo se borra: seis digitos no resisten probar sin limite. */
    private void registrarFallo(CodigoRecuperacion registro) {
        registro.registrarIntentoFallido();
        if (registro.getIntentos() >= MAXIMO_INTENTOS) {
            codigos.delete(registro);
        } else {
            codigos.save(registro);
        }
    }
}
