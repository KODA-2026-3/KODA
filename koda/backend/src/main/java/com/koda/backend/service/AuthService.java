package com.koda.backend.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.koda.backend.dto.LoginRequest;
import com.koda.backend.dto.LoginResponse;
import com.koda.backend.dto.UsuarioResponse;
import com.koda.backend.exception.CredencialesInvalidasException;
import com.koda.backend.model.Usuario;
import com.koda.backend.repository.UsuarioRepository;
import com.koda.backend.security.JwtService;

@Service
public class AuthService {

    private final UsuarioRepository repositorio;
    private final PasswordEncoder encoder;
    private final JwtService jwtService;

    public AuthService(UsuarioRepository repositorio, PasswordEncoder encoder, JwtService jwtService) {
        this.repositorio = repositorio;
        this.encoder = encoder;
        this.jwtService = jwtService;
    }

    /**
     * Valida las credenciales y emite el token de acceso.
     * Correo inexistente, contrasena incorrecta y cuenta desactivada
     * producen el mismo error, para no revelar que cuentas existen.
     */
    @Transactional(readOnly = true)
    public LoginResponse authenticate(LoginRequest request) {
        Usuario usuario = repositorio.findByCorreoIgnoreCase(request.email())
                .filter(u -> encoder.matches(request.password(), u.getContrasena()))
                .filter(Usuario::isActivo)
                .orElseThrow(CredencialesInvalidasException::new);

        return new LoginResponse(
                jwtService.generarToken(usuario),
                "Bearer",
                jwtService.getExpiracionMs() / 1000,
                UsuarioResponse.desde(usuario));
    }
}
