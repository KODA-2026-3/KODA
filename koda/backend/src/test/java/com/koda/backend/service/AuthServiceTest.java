package com.koda.backend.service;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import org.mockito.Mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.koda.backend.dto.LoginRequest;
import com.koda.backend.dto.LoginResponse;
import com.koda.backend.exception.CredencialesInvalidasException;
import com.koda.backend.model.Rol;
import com.koda.backend.model.Usuario;
import com.koda.backend.repository.UsuarioRepository;
import com.koda.backend.security.JwtService;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    private AuthService authService;

    private Usuario usuarioPrueba;

    @BeforeEach
    void setUp() {
        authService = new AuthService(usuarioRepository, passwordEncoder, jwtService);
        usuarioPrueba = new Usuario(
                "Dra. Maria Garcia",
                "mgarcia@hospital.org",
                "mgarcia",
                "$2a$10$encodedPasswordHash",
                Rol.MEDICO,
                "Hospital Central");
    }

    @Test
    @DisplayName("Debe autenticar correctamente con credenciales válidas y usuario activo")
    void autenticar_credencialesValidas_retornaTokenYUsuario() {
        LoginRequest request = new LoginRequest("mgarcia@hospital.org", "Password123!", false);

        when(usuarioRepository.findByCorreoIgnoreCase("mgarcia@hospital.org"))
                .thenReturn(Optional.of(usuarioPrueba));
        when(passwordEncoder.matches("Password123!", usuarioPrueba.getContrasena()))
                .thenReturn(true);
        when(jwtService.generarToken(usuarioPrueba)).thenReturn("token.jwt.firmado");
        when(jwtService.getExpiracionMs()).thenReturn(86400000L);

        LoginResponse response = authService.authenticate(request);

        assertThat(response).isNotNull();
        assertThat(response.accessToken()).isEqualTo("token.jwt.firmado");
        assertThat(response.tokenType()).isEqualTo("Bearer");
        assertThat(response.expiresIn()).isEqualTo(86400L);
        assertThat(response.usuario().correo()).isEqualTo("mgarcia@hospital.org");
        assertThat(response.usuario().rol()).isEqualTo("MEDICO");

        verify(usuarioRepository).save(usuarioPrueba);
        assertThat(usuarioPrueba.getUltimoAcceso()).isNotNull();
    }

    @Test
    @DisplayName("Debe fallar si el correo no existe")
    void autenticar_correoInexistente_lanzaExcepcion() {
        LoginRequest request = new LoginRequest("inexistente@hospital.org", "Password123!", false);

        when(usuarioRepository.findByCorreoIgnoreCase("inexistente@hospital.org"))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.authenticate(request))
                .isInstanceOf(CredencialesInvalidasException.class);

        verify(usuarioRepository, never()).save(any());
    }

    @Test
    @DisplayName("Debe fallar si la contraseña no coincide")
    void autenticar_contrasenaIncorrecta_lanzaExcepcion() {
        LoginRequest request = new LoginRequest("mgarcia@hospital.org", "ContrasenaEquivocada", false);

        when(usuarioRepository.findByCorreoIgnoreCase("mgarcia@hospital.org"))
                .thenReturn(Optional.of(usuarioPrueba));
        when(passwordEncoder.matches("ContrasenaEquivocada", usuarioPrueba.getContrasena()))
                .thenReturn(false);

        assertThatThrownBy(() -> authService.authenticate(request))
                .isInstanceOf(CredencialesInvalidasException.class);

        verify(usuarioRepository, never()).save(any());
    }

    @Test
    @DisplayName("Debe fallar si el usuario está inactivo")
    void autenticar_usuarioInactivo_lanzaExcepcion() {
        usuarioPrueba.setActivo(false);
        LoginRequest request = new LoginRequest("mgarcia@hospital.org", "Password123!", false);

        when(usuarioRepository.findByCorreoIgnoreCase("mgarcia@hospital.org"))
                .thenReturn(Optional.of(usuarioPrueba));
        when(passwordEncoder.matches("Password123!", usuarioPrueba.getContrasena()))
                .thenReturn(true);

        assertThatThrownBy(() -> authService.authenticate(request))
                .isInstanceOf(CredencialesInvalidasException.class);

        verify(usuarioRepository, never()).save(any());
    }
}
