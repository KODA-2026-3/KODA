package com.koda.backend.controller;

import java.security.Principal;
import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.koda.backend.dto.AnalisisResponse;
import com.koda.backend.repository.UsuarioRepository;
import com.koda.backend.service.HistorialService;

/** Historial de analisis de radiografias. */
@RestController
@RequestMapping("/analisis")
public class HistorialController {

    private final HistorialService historialService;
    private final UsuarioRepository usuarioRepository;

    public HistorialController(HistorialService historialService,
                               UsuarioRepository usuarioRepository) {
        this.historialService = historialService;
        this.usuarioRepository = usuarioRepository;
    }

    /** Todos los analisis del sistema. Solo accesible con rol ADMIN. */
    @GetMapping
    public List<AnalisisResponse> listarTodos() {
        return historialService.listarTodos();
    }

    /** Analisis del medico autenticado. Solo accesible con rol MEDICO. */
    @GetMapping("/mis-analisis")
    public List<AnalisisResponse> misAnalisis(Principal principal) {
        String usuarioId = usuarioRepository.findByCorreoIgnoreCase(principal.getName())
                .map(u -> u.getId())
                .orElse(null);
        if (usuarioId == null) return List.of();
        return historialService.listarPorUsuario(usuarioId);
    }
}
