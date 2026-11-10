package com.koda.backend.controller;

import com.koda.backend.dto.LoginRequest;
import com.koda.backend.dto.LoginResponse;
import com.koda.backend.dto.RestablecerContrasenaRequest;
import com.koda.backend.dto.SolicitarRecuperacionRequest;
import com.koda.backend.service.AuthService;
import com.koda.backend.service.RecuperacionContrasenaService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;
    private final RecuperacionContrasenaService recuperacion;

    public AuthController(AuthService authService, RecuperacionContrasenaService recuperacion) {
        this.authService = authService;
        this.recuperacion = recuperacion;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.authenticate(request));
    }

    /** Siempre responde 204: no revela si el correo pertenece a una cuenta. */
    @PostMapping("/recuperacion")
    public ResponseEntity<Void> solicitarRecuperacion(@Valid @RequestBody SolicitarRecuperacionRequest solicitud) {
        recuperacion.solicitar(solicitud.correo());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/recuperacion/restablecer")
    public ResponseEntity<Void> restablecer(@Valid @RequestBody RestablecerContrasenaRequest solicitud) {
        recuperacion.restablecer(solicitud.correo(), solicitud.codigo(), solicitud.nuevaContrasena());
        return ResponseEntity.noContent().build();
    }
}
