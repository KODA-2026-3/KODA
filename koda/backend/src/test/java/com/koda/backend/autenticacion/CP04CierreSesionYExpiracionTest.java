package com.koda.backend.autenticacion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;

import com.koda.backend.model.Usuario;
import com.koda.backend.repository.UsuarioRepository;
import com.koda.backend.security.JwtService;

/**
 * CP-04 · Verificar el cierre de sesion y la expiracion del token.
 *
 * La API es sin estado (JWT): cerrar sesion en el frontend (AuthService.cerrarSesion)
 * borra el token del navegador, asi que las siguientes peticiones llegan sin
 * encabezado Authorization. Aqui se comprueba que, sin token, con un token
 * expirado o con uno manipulado, el backend responde 401; ese 401 es lo que
 * hace que el frontend redirija a la pantalla de inicio de sesion.
 */
@DisplayName("CP-04 · Cierre de sesión y expiración del token")
class CP04CierreSesionYExpiracionTest extends AutenticacionTestBase {

    @Autowired
    private UsuarioRepository repositorio;

    @Value("${koda.jwt.secret}")
    private String secreto;

    @Test
    @DisplayName("Tras cerrar sesión (token descartado) la vista protegida responde 401")
    void despuesDeCerrarSesionNoSePuedeAccederAVistaProtegida() throws Exception {
        // Usuario autenticado: accede a la vista protegida
        String token = obtenerToken(CORREO_ADMIN, CONTRASENA_DEMO);
        mockMvc.perform(get(RUTA_PROTEGIDA).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk());

        // Cierra sesion: el cliente elimina el token y reintenta sin el
        mockMvc.perform(get(RUTA_PROTEGIDA))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Un token expirado es rechazado con 401")
    void tokenExpiradoSeRechaza() throws Exception {
        Usuario admin = repositorio.findByCorreoIgnoreCase(CORREO_ADMIN).orElseThrow();

        // Mismo secreto que el backend, pero con vencimiento en el pasado
        JwtService emisorVencido = new JwtService(secreto, -60_000);
        String tokenExpirado = emisorVencido.generarToken(admin);

        mockMvc.perform(get(RUTA_PROTEGIDA).header(HttpHeaders.AUTHORIZATION, bearer(tokenExpirado)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Un token firmado con otra clave es rechazado con 401")
    void tokenConFirmaAjenaSeRechaza() throws Exception {
        Usuario admin = repositorio.findByCorreoIgnoreCase(CORREO_ADMIN).orElseThrow();

        JwtService emisorAjeno = new JwtService("otra_clave_secreta_que_no_es_la_del_backend_koda", 3_600_000);
        String tokenAjeno = emisorAjeno.generarToken(admin);

        mockMvc.perform(get(RUTA_PROTEGIDA).header(HttpHeaders.AUTHORIZATION, bearer(tokenAjeno)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Un token alterado para escalar de MEDICO a ADMIN es rechazado con 401")
    void tokenManipuladoSeRechaza() throws Exception {
        String tokenMedico = obtenerToken(CORREO_MEDICO, CONTRASENA_DEMO);

        String[] partes = tokenMedico.split("\\.");
        String payload = new String(Base64.getUrlDecoder().decode(partes[1]), StandardCharsets.UTF_8);
        String payloadAlterado = payload.replace("\"rol\":\"MEDICO\"", "\"rol\":\"ADMIN\"");
        assertThat(payloadAlterado).isNotEqualTo(payload);

        String tokenAlterado = partes[0] + "."
                + Base64.getUrlEncoder().withoutPadding()
                        .encodeToString(payloadAlterado.getBytes(StandardCharsets.UTF_8))
                + "." + partes[2];

        mockMvc.perform(get(RUTA_PROTEGIDA).header(HttpHeaders.AUTHORIZATION, bearer(tokenAlterado)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Un encabezado Authorization con basura es rechazado con 401")
    void tokenMalFormadoSeRechaza() throws Exception {
        mockMvc.perform(get(RUTA_PROTEGIDA).header(HttpHeaders.AUTHORIZATION, "Bearer esto.no.es-un-jwt"))
                .andExpect(status().isUnauthorized());
    }
}