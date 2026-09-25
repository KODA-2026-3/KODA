package com.koda.backend.security;

import java.io.IOException;
import java.util.List;

import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jws;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/** Autentica la peticion a partir del encabezado Authorization: Bearer. */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String PREFIJO = "Bearer ";

    private final JwtService jwtService;

    public JwtAuthenticationFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String encabezado = request.getHeader(HttpHeaders.AUTHORIZATION);

        if (encabezado != null && encabezado.startsWith(PREFIJO)
                && SecurityContextHolder.getContext().getAuthentication() == null) {
            try {
                Jws<Claims> jws = jwtService.verificar(encabezado.substring(PREFIJO.length()));
                Claims claims = jws.getPayload();

                var autoridades = List.of(
                        new SimpleGrantedAuthority("ROLE_" + claims.get("rol", String.class)));
                var autenticacion = new UsernamePasswordAuthenticationToken(
                        claims.getSubject(), null, autoridades);

                SecurityContextHolder.getContext().setAuthentication(autenticacion);
            } catch (JwtException e) {
                // Token invalido o expirado: la peticion sigue sin autenticar
                // y la cadena de seguridad respondera 401 si la ruta lo exige.
                SecurityContextHolder.clearContext();
            }
        }

        chain.doFilter(request, response);
    }
}
