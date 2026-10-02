package com.koda.backend.controller;

import java.security.Principal;
import java.util.List;

import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.koda.backend.dto.AnalisisResumenDTO;
import com.koda.backend.dto.ResultadoDTO;
import com.koda.backend.model.ImagenAnalisis;
import com.koda.backend.service.HistorialAnalisisService;
import com.koda.backend.service.OrquestadorAnalisisService;

/**
 * Analisis de radiografias (CU-01 a CU-03) e historial del medico. Solo
 * accesible con rol MEDICO; cada medico ve unicamente sus analisis.
 * El filtro JWT establece el correo del usuario como nombre del principal.
 */
@RestController
public class ControladorAnalisis {

    private final OrquestadorAnalisisService orquestador;
    private final HistorialAnalisisService historial;

    public ControladorAnalisis(OrquestadorAnalisisService orquestador, HistorialAnalisisService historial) {
        this.orquestador = orquestador;
        this.historial = historial;
    }

    @PostMapping(path = "/predict", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResultadoDTO analizar(@RequestParam("imagen") MultipartFile imagen, Principal usuario) {
        return orquestador.procesarRadiografia(imagen, usuario.getName());
    }

    @GetMapping("/analisis")
    public List<AnalisisResumenDTO> listar(Principal usuario) {
        return historial.listar(usuario.getName());
    }

    @GetMapping("/analisis/{id}")
    public AnalisisResumenDTO obtener(@PathVariable Long id, Principal usuario) {
        return historial.obtener(id, usuario.getName());
    }

    @GetMapping("/analisis/{id}/imagen")
    public ResponseEntity<byte[]> imagen(@PathVariable Long id, Principal usuario) {
        ImagenAnalisis imagen = historial.imagen(id, usuario.getName());
        return sinCache(imagen.getImagen(), MediaType.parseMediaType(imagen.getTipoContenido()));
    }

    @GetMapping("/analisis/{id}/heatmap")
    public ResponseEntity<byte[]> heatmap(@PathVariable Long id, Principal usuario) {
        return sinCache(historial.imagen(id, usuario.getName()).getHeatmap(), MediaType.IMAGE_PNG);
    }

    @DeleteMapping("/analisis/{id}/imagen")
    public ResponseEntity<Void> eliminarImagen(@PathVariable Long id, Principal usuario) {
        historial.eliminarImagen(id, usuario.getName());
        return ResponseEntity.noContent().build();
    }

    /** Son imagenes clinicas: ni el navegador ni un proxy deben guardar copia. */
    private static ResponseEntity<byte[]> sinCache(byte[] contenido, MediaType tipo) {
        return ResponseEntity.ok().contentType(tipo).cacheControl(CacheControl.noStore()).body(contenido);
    }
}
