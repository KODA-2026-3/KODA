package com.koda.backend.controller;

import java.security.Principal;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.koda.backend.dto.ResultadoDTO;
import com.koda.backend.service.OrquestadorAnalisisService;

/** Analisis de radiografias (CU-01 a CU-03). Solo accesible con rol MEDICO. */
@RestController
public class ControladorAnalisis {

    private final OrquestadorAnalisisService orquestador;

    public ControladorAnalisis(OrquestadorAnalisisService orquestador) {
        this.orquestador = orquestador;
    }

    @PostMapping(path = "/predict", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResultadoDTO analizar(@RequestParam("imagen") MultipartFile imagen, Principal usuario) {
        // El filtro JWT establece el correo del usuario como nombre del principal.
        return orquestador.procesarRadiografia(imagen, usuario.getName());
    }
}
