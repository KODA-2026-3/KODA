package com.koda.backend.service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.koda.backend.dto.AnalisisResponse;
import com.koda.backend.model.MetadatoAnalisis;
import com.koda.backend.model.Usuario;
import com.koda.backend.repository.RepositorioAnalisis;
import com.koda.backend.repository.UsuarioRepository;

/** Consulta el historial de analisis realizados. */
@Service
public class HistorialService {

    private final RepositorioAnalisis repositorioAnalisis;
    private final UsuarioRepository usuarioRepository;

    public HistorialService(RepositorioAnalisis repositorioAnalisis,
                            UsuarioRepository usuarioRepository) {
        this.repositorioAnalisis = repositorioAnalisis;
        this.usuarioRepository = usuarioRepository;
    }

    /** Todos los analisis del sistema, con nombre del medico asociado. */
    public List<AnalisisResponse> listarTodos() {
        List<MetadatoAnalisis> analisis = repositorioAnalisis.findAllByOrderByFechaCreacionDesc();
        Map<String, String> nombresPorId = usuarioRepository.findAll().stream()
                .collect(Collectors.toMap(Usuario::getId, Usuario::getNombre, (a, b) -> a));
        return analisis.stream()
                .map(a -> toResponse(a, nombresPorId.getOrDefault(a.getUsuarioId(), null)))
                .toList();
    }

    /** Analisis realizados por un medico especifico. */
    public List<AnalisisResponse> listarPorUsuario(String usuarioId) {
        return repositorioAnalisis.findByUsuarioIdOrderByFechaCreacionDesc(usuarioId).stream()
                .map(a -> toResponse(a, null))
                .toList();
    }

    private AnalisisResponse toResponse(MetadatoAnalisis a, String medicoNombre) {
        return new AnalisisResponse(
                a.getId(),
                a.getNombreArchivo(),
                a.getGradoKL(),
                a.getConfianza(),
                a.getTiempoProcesamientoMs(),
                a.getModelo(),
                a.getFechaCreacion(),
                medicoNombre);
    }
}
