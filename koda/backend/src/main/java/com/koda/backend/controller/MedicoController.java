package com.koda.backend.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.koda.backend.dto.ActualizarMedicoRequest;
import com.koda.backend.dto.CrearMedicoRequest;
import com.koda.backend.dto.MedicoResponse;
import com.koda.backend.service.MedicoService;

import jakarta.validation.Valid;

/** Gestion de cuentas de medico. Solo accesible con rol ADMIN. */
@RestController
@RequestMapping("/medicos")
public class MedicoController {

    private final MedicoService servicio;

    public MedicoController(MedicoService servicio) {
        this.servicio = servicio;
    }

    @GetMapping
    public List<MedicoResponse> listar() {
        return servicio.listar();
    }

    @GetMapping("/{id}")
    public MedicoResponse obtener(@PathVariable String id) {
        return servicio.obtener(id);
    }

    @PostMapping
    public ResponseEntity<MedicoResponse> crear(@Valid @RequestBody CrearMedicoRequest solicitud) {
        return ResponseEntity.status(HttpStatus.CREATED).body(servicio.crear(solicitud));
    }

    @PutMapping("/{id}")
    public MedicoResponse actualizar(@PathVariable String id,
                                     @Valid @RequestBody ActualizarMedicoRequest solicitud) {
        return servicio.actualizar(id, solicitud);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable String id) {
        servicio.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
