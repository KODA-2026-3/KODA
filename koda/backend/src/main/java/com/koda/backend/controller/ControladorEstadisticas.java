package com.koda.backend.controller;

import java.security.Principal;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.koda.backend.dto.EstadisticasDTO;
import com.koda.backend.dto.EstadisticasPersonalesDTO;
import com.koda.backend.service.EstadisticasService;

/**
 * Metricas de uso de la plataforma. GET /estadisticas es del administrador
 * (todas las cuentas); GET /estadisticas/personales es del medico autenticado
 * (solo su propia actividad).
 */
@RestController
@RequestMapping("/estadisticas")
public class ControladorEstadisticas {

    private final EstadisticasService servicio;

    public ControladorEstadisticas(EstadisticasService servicio) {
        this.servicio = servicio;
    }

    @GetMapping
    public EstadisticasDTO obtener() {
        return servicio.obtener();
    }

    @GetMapping("/personales")
    public EstadisticasPersonalesDTO personales(Principal usuario) {
        return servicio.obtenerPersonales(usuario.getName());
    }
}
