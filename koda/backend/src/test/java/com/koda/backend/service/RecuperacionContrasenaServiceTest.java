package com.koda.backend.service;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import org.mockito.Mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import com.koda.backend.exception.CodigoRecuperacionInvalidoException;
import com.koda.backend.model.CodigoRecuperacion;
import com.koda.backend.model.Rol;
import com.koda.backend.model.Usuario;
import com.koda.backend.repository.RepositorioCodigoRecuperacion;
import com.koda.backend.repository.UsuarioRepository;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class RecuperacionContrasenaServiceTest {

    private static final String CORREO = "mgarcia@hospital.org";
    private static final String ID = "u-1";

    @Mock
    private UsuarioRepository usuarios;

    @Mock
    private RepositorioCodigoRecuperacion codigos;

    @Mock
    private PasswordEncoder encoder;

    @Mock
    private NotificadorRecuperacion notificador;

    private RecuperacionContrasenaService servicio;

    private Usuario usuario;

    @BeforeEach
    void setUp() {
        servicio = new RecuperacionContrasenaService(usuarios, codigos, encoder, notificador, 15, 60);
        usuario = new Usuario("Dra. Maria Garcia", CORREO, "mgarcia", "hash-viejo", Rol.MEDICO, "Hospital Central");
        ReflectionTestUtils.setField(usuario, "id", ID);
        when(usuarios.findByCorreoIgnoreCase(CORREO)).thenReturn(Optional.of(usuario));
        when(encoder.encode(anyString())).thenReturn("hash-nuevo");
    }

    private CodigoRecuperacion codigoVigente() {
        return new CodigoRecuperacion(ID, "hash-codigo", LocalDateTime.now().plusMinutes(10),
                LocalDateTime.now().minusMinutes(5));
    }

    @Test
    @DisplayName("Solicitar genera un código de 6 dígitos, guarda solo su hash y lo envía")
    void solicitar_cuentaActiva_guardaHashYEnvia() {
        when(codigos.findById(ID)).thenReturn(Optional.empty());

        servicio.solicitar(CORREO);

        ArgumentCaptor<CodigoRecuperacion> guardado = ArgumentCaptor.forClass(CodigoRecuperacion.class);
        verify(codigos).save(guardado.capture());
        assertThat(guardado.getValue().getCodigoHash()).isEqualTo("hash-nuevo");
        assertThat(guardado.getValue().getExpiraEn()).isAfter(LocalDateTime.now().plusMinutes(14));

        ArgumentCaptor<String> codigo = ArgumentCaptor.forClass(String.class);
        verify(notificador).enviarCodigo(eq(CORREO), anyString(), codigo.capture(), eq(15));
        assertThat(codigo.getValue()).matches("\\d{6}");
    }

    @Test
    @DisplayName("Solicitar con un correo desconocido no falla ni envía nada")
    void solicitar_correoDesconocido_noEnvia() {
        when(usuarios.findByCorreoIgnoreCase("nadie@hospital.org")).thenReturn(Optional.empty());

        servicio.solicitar("nadie@hospital.org");

        verify(codigos, never()).save(any());
        verify(notificador, never()).enviarCodigo(anyString(), anyString(), anyString(), anyInt());
    }

    @Test
    @DisplayName("Solicitar con una cuenta desactivada no envía nada")
    void solicitar_cuentaInactiva_noEnvia() {
        usuario.setActivo(false);

        servicio.solicitar(CORREO);

        verify(notificador, never()).enviarCodigo(anyString(), anyString(), anyString(), anyInt());
    }

    @Test
    @DisplayName("Solicitar otra vez antes de la espera no genera otro código")
    void solicitar_codigoReciente_noReenvia() {
        when(codigos.findById(ID)).thenReturn(Optional.of(new CodigoRecuperacion(ID, "hash-codigo",
                LocalDateTime.now().plusMinutes(14), LocalDateTime.now().minusSeconds(10))));

        servicio.solicitar(CORREO);

        verify(codigos, never()).save(any());
        verify(notificador, never()).enviarCodigo(anyString(), anyString(), anyString(), anyInt());
    }

    @Test
    @DisplayName("Restablecer con el código correcto cambia la contraseña y consume el código")
    void restablecer_codigoCorrecto_cambiaContrasena() {
        CodigoRecuperacion registro = codigoVigente();
        when(codigos.findById(ID)).thenReturn(Optional.of(registro));
        when(encoder.matches("123456", "hash-codigo")).thenReturn(true);

        servicio.restablecer(CORREO, "123456", "NuevaClave1!");

        assertThat(usuario.getContrasena()).isEqualTo("hash-nuevo");
        verify(usuarios).save(usuario);
        verify(codigos).delete(registro);
    }

    @Test
    @DisplayName("Restablecer con un código errado no cambia la contraseña y cuenta el intento")
    void restablecer_codigoErrado_registraIntento() {
        CodigoRecuperacion registro = codigoVigente();
        when(codigos.findById(ID)).thenReturn(Optional.of(registro));
        when(encoder.matches("000000", "hash-codigo")).thenReturn(false);

        assertThatThrownBy(() -> servicio.restablecer(CORREO, "000000", "NuevaClave1!"))
                .isInstanceOf(CodigoRecuperacionInvalidoException.class);

        assertThat(usuario.getContrasena()).isEqualTo("hash-viejo");
        assertThat(registro.getIntentos()).isEqualTo(1);
        verify(codigos).save(registro);
    }

    @Test
    @DisplayName("Al quinto intento fallido el código se borra")
    void restablecer_intentosAgotados_borraCodigo() {
        CodigoRecuperacion registro = codigoVigente();
        for (int i = 0; i < 4; i++) {
            registro.registrarIntentoFallido();
        }
        when(codigos.findById(ID)).thenReturn(Optional.of(registro));
        when(encoder.matches("000000", "hash-codigo")).thenReturn(false);

        assertThatThrownBy(() -> servicio.restablecer(CORREO, "000000", "NuevaClave1!"))
                .isInstanceOf(CodigoRecuperacionInvalidoException.class);

        verify(codigos).delete(registro);
    }

    @Test
    @DisplayName("Restablecer con un código vencido falla aunque el código sea correcto")
    void restablecer_codigoVencido_falla() {
        when(codigos.findById(ID)).thenReturn(Optional.of(new CodigoRecuperacion(ID, "hash-codigo",
                LocalDateTime.now().minusMinutes(1), LocalDateTime.now().minusMinutes(16))));
        when(encoder.matches("123456", "hash-codigo")).thenReturn(true);

        assertThatThrownBy(() -> servicio.restablecer(CORREO, "123456", "NuevaClave1!"))
                .isInstanceOf(CodigoRecuperacionInvalidoException.class);

        assertThat(usuario.getContrasena()).isEqualTo("hash-viejo");
    }

    @Test
    @DisplayName("Restablecer sin haber solicitado un código falla")
    void restablecer_sinCodigo_falla() {
        when(codigos.findById(ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> servicio.restablecer(CORREO, "123456", "NuevaClave1!"))
                .isInstanceOf(CodigoRecuperacionInvalidoException.class);
    }
}
