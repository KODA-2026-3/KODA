package com.koda.backend.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.koda.backend.dto.ConteoGradoKL;
import com.koda.backend.dto.ConteoPorDia;
import com.koda.backend.dto.EstadisticasDTO;
import com.koda.backend.dto.EstadisticasPersonalesDTO;
import com.koda.backend.model.Rol;
import com.koda.backend.repository.RepositorioAnalisis;
import com.koda.backend.repository.UsuarioRepository;

/** Metricas de uso de la plataforma: panel del administrador y panel personal del medico. */
@Service
public class EstadisticasService {

    /** Ventana del grafico "radiografias por dia" en el panel del administrador. */
    private static final int DIAS_HISTORIAL_ADMIN = 14;

    /** Ventana del grafico personal del medico: la semana en curso. */
    private static final int DIAS_HISTORIAL_MEDICO = 7;

    private final RepositorioAnalisis repositorioAnalisis;
    private final UsuarioRepository usuarios;

    public EstadisticasService(RepositorioAnalisis repositorioAnalisis, UsuarioRepository usuarios) {
        this.repositorioAnalisis = repositorioAnalisis;
        this.usuarios = usuarios;
    }

    @Transactional(readOnly = true)
    public EstadisticasDTO obtener() {
        LocalDate hoy = LocalDate.now();

        return new EstadisticasDTO(
                repositorioAnalisis.count(),
                repositorioAnalisis.countByFechaCreacionBetween(hoy.atStartOfDay(), LocalTime.MAX.atDate(hoy)),
                repositorioAnalisis.confianzaPromedio(),
                usuarios.countByRolAndActivoTrue(Rol.MEDICO),
                distribucionKLCompleta(repositorioAnalisis.contarPorGradoKL()),
                radiografiasPorDiaCompleto(repositorioAnalisis::contarPorDiaDesde, hoy, DIAS_HISTORIAL_ADMIN));
    }

    /**
     * Actividad del medico autenticado. Si la cuenta ya no existe (se elimino
     * durante la sesion) se responden estadisticas vacias en vez de un error.
     */
    @Transactional(readOnly = true)
    public EstadisticasPersonalesDTO obtenerPersonales(String correoUsuario) {
        String usuarioId = usuarios.findByCorreoIgnoreCase(correoUsuario).map(u -> u.getId()).orElse(null);
        if (usuarioId == null) {
            return new EstadisticasPersonalesDTO(0, 0, 0, 0, distribucionKLCompleta(List.of()),
                    radiografiasPorDiaCompleto(desde -> List.of(), LocalDate.now(), DIAS_HISTORIAL_MEDICO));
        }

        LocalDate hoy = LocalDate.now();
        LocalDateTime inicioSemana = hoy.minusDays(DIAS_HISTORIAL_MEDICO - 1).atStartOfDay();

        return new EstadisticasPersonalesDTO(
                repositorioAnalisis.countByUsuarioId(usuarioId),
                repositorioAnalisis.countByUsuarioIdAndFechaCreacionBetween(
                        usuarioId, hoy.atStartOfDay(), LocalTime.MAX.atDate(hoy)),
                repositorioAnalisis.countByUsuarioIdAndFechaCreacionBetween(
                        usuarioId, inicioSemana, LocalTime.MAX.atDate(hoy)),
                repositorioAnalisis.confianzaPromedioPorUsuario(usuarioId),
                distribucionKLCompleta(repositorioAnalisis.contarPorGradoKLPorUsuario(usuarioId)),
                radiografiasPorDiaCompleto(
                        desde -> repositorioAnalisis.contarPorDiaDesdePorUsuario(usuarioId, desde),
                        hoy, DIAS_HISTORIAL_MEDICO));
    }

    /** Completa con cantidad 0 los grados KL que todavia no tienen ningun registro. */
    private List<ConteoGradoKL> distribucionKLCompleta(List<ConteoGradoKL> conteos) {
        Map<Integer, Long> porGrado = conteos.stream()
                .collect(Collectors.toMap(ConteoGradoKL::gradoKL, ConteoGradoKL::cantidad));

        return IntStream.rangeClosed(0, 4)
                .mapToObj(grado -> new ConteoGradoKL(grado, porGrado.getOrDefault(grado, 0L)))
                .toList();
    }

    /** Completa con cantidad 0 los dias sin analisis para que el grafico no tenga huecos. */
    private List<ConteoPorDia> radiografiasPorDiaCompleto(
            java.util.function.Function<LocalDateTime, List<ConteoPorDia>> consulta, LocalDate hoy, int dias) {
        LocalDate desde = hoy.minusDays(dias - 1);

        Map<LocalDate, Long> porDia = consulta.apply(desde.atStartOfDay()).stream()
                .collect(Collectors.toMap(ConteoPorDia::fecha, ConteoPorDia::cantidad));

        return desde.datesUntil(hoy.plusDays(1))
                .map(fecha -> new ConteoPorDia(fecha, porDia.getOrDefault(fecha, 0L)))
                .toList();
    }
}
