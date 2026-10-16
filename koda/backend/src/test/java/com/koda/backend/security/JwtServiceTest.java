package com.koda.backend.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import com.koda.backend.model.Rol;
import com.koda.backend.model.Usuario;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.JwtException;

class JwtServiceTest {

    private static final String SECRETO_TEST = "secreto_de_prueba_de_al_menos_32_bytes_de_largo_12345";
    private static final long EXPIRACION_MS = 3600000L; // 1 hora

    private JwtService jwtService;
    private Usuario usuario;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService(SECRETO_TEST, EXPIRACION_MS);
        usuario = new Usuario(
                "Dra. Maria Garcia",
                "mgarcia@hospital.org",
                "mgarcia",
                "hash",
                Rol.MEDICO,
                "Hospital Central");
    }

    @Test
    @DisplayName("Debe generar un token válido y poder verificar sus claims")
    void generarToken_y_verificar_exitoso() {
        String token = jwtService.generarToken(usuario);

        assertThat(token).isNotBlank();

        Jws<Claims> jws = jwtService.verificar(token);
        Claims claims = jws.getPayload();

        assertThat(claims.getSubject()).isEqualTo("mgarcia@hospital.org");
        assertThat(claims.get("rol", String.class)).isEqualTo("MEDICO");
        assertThat(claims.get("nombre", String.class)).isEqualTo("Dra. Maria Garcia");
        assertThat(claims.getExpiration()).isNotNull();
    }

    @Test
    @DisplayName("Debe fallar si el token fue firmado con otra clave")
    void verificar_conClaveDiferente_lanzaJwtException() {
        String token = jwtService.generarToken(usuario);

        JwtService otroServicio = new JwtService("otra_clave_distinta_de_al_menos_32_bytes_segura!", EXPIRACION_MS);

        assertThatThrownBy(() -> otroServicio.verificar(token))
                .isInstanceOf(JwtException.class);
    }

    @Test
    @DisplayName("Debe fallar si el token ya expiró")
    void verificar_tokenExpirado_lanzaJwtException() {
        JwtService servicioExpirado = new JwtService(SECRETO_TEST, -1000L); // ya expirado al crearse
        String token = servicioExpirado.generarToken(usuario);

        assertThatThrownBy(() -> jwtService.verificar(token))
                .isInstanceOf(JwtException.class);
    }

    @Test
    @DisplayName("Debe fallar si el token es texto corrupto")
    void verificar_tokenInvalido_lanzaJwtException() {
        assertThatThrownBy(() -> jwtService.verificar("esto.no.es.un.jwt"))
                .isInstanceOf(JwtException.class);
    }
}
