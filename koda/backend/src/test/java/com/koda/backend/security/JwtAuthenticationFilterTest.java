package com.koda.backend.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import com.koda.backend.model.Rol;
import com.koda.backend.model.Usuario;
import com.koda.backend.repository.UsuarioRepository;

/** Una cuenta desactivada o eliminada pierde el acceso aunque su token siga vigente. */
class JwtAuthenticationFilterTest {

    private static final String SECRETO_TEST = "secreto_de_prueba_de_al_menos_32_bytes_de_largo_12345";

    private UsuarioRepository usuarios;
    private JwtAuthenticationFilter filtro;
    private Usuario medico;
    private String token;

    @BeforeEach
    void setUp() {
        JwtService jwtService = new JwtService(SECRETO_TEST, 3600000L);
        usuarios = mock(UsuarioRepository.class);
        filtro = new JwtAuthenticationFilter(jwtService, usuarios);
        medico = new Usuario("Dra. Maria Garcia", "mgarcia@hospital.org", "mgarcia", "hash",
                Rol.MEDICO, "Hospital Central");
        token = jwtService.generarToken(medico);
    }

    @AfterEach
    void limpiar() {
        SecurityContextHolder.clearContext();
    }

    private Authentication filtrar() throws Exception {
        MockHttpServletRequest solicitud = new MockHttpServletRequest();
        solicitud.addHeader("Authorization", "Bearer " + token);
        MockFilterChain cadena = new MockFilterChain();
        filtro.doFilter(solicitud, new MockHttpServletResponse(), cadena);
        // La peticion siempre continua: la cadena de seguridad decide si responde 401.
        assertThat(cadena.getRequest()).isNotNull();
        return SecurityContextHolder.getContext().getAuthentication();
    }

    @Test
    @DisplayName("Cuenta activa: el token autentica la petición")
    void cuentaActiva_autentica() throws Exception {
        when(usuarios.findByCorreoIgnoreCase("mgarcia@hospital.org")).thenReturn(Optional.of(medico));

        Authentication autenticacion = filtrar();

        assertThat(autenticacion).isNotNull();
        assertThat(autenticacion.getName()).isEqualTo("mgarcia@hospital.org");
        assertThat(autenticacion.getAuthorities()).extracting("authority").containsExactly("ROLE_MEDICO");
        verify(usuarios).findByCorreoIgnoreCase("mgarcia@hospital.org");
    }

    @Test
    @DisplayName("Cuenta desactivada: el token vigente deja de autenticar")
    void cuentaDesactivada_noAutentica() throws Exception {
        medico.setActivo(false);
        when(usuarios.findByCorreoIgnoreCase("mgarcia@hospital.org")).thenReturn(Optional.of(medico));

        assertThat(filtrar()).isNull();
    }

    @Test
    @DisplayName("Cuenta eliminada: el token vigente deja de autenticar")
    void cuentaEliminada_noAutentica() throws Exception {
        when(usuarios.findByCorreoIgnoreCase("mgarcia@hospital.org")).thenReturn(Optional.empty());

        assertThat(filtrar()).isNull();
    }
}
