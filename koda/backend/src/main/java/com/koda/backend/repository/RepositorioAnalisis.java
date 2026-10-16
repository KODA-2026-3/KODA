package com.koda.backend.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.koda.backend.dto.ConteoGradoKL;
import com.koda.backend.dto.ConteoPorDia;
import com.koda.backend.model.MetadatoAnalisis;

public interface RepositorioAnalisis extends JpaRepository<MetadatoAnalisis, Long> {

    long countByFechaCreacionBetween(LocalDateTime desde, LocalDateTime hasta);

    long countByUsuarioId(String usuarioId);

    long countByUsuarioIdAndFechaCreacionBetween(String usuarioId, LocalDateTime desde, LocalDateTime hasta);

    @Query("SELECT COALESCE(AVG(m.confianza), 0) FROM MetadatoAnalisis m")
    double confianzaPromedio();

    @Query("SELECT COALESCE(AVG(m.confianza), 0) FROM MetadatoAnalisis m WHERE m.usuarioId = :usuarioId")
    double confianzaPromedioPorUsuario(@Param("usuarioId") String usuarioId);

    @Query("""
            SELECT new com.koda.backend.dto.ConteoGradoKL(m.gradoKL, COUNT(m))
            FROM MetadatoAnalisis m
            GROUP BY m.gradoKL
            ORDER BY m.gradoKL
            """)
    List<ConteoGradoKL> contarPorGradoKL();

    @Query("""
            SELECT new com.koda.backend.dto.ConteoGradoKL(m.gradoKL, COUNT(m))
            FROM MetadatoAnalisis m
            WHERE m.usuarioId = :usuarioId
            GROUP BY m.gradoKL
            ORDER BY m.gradoKL
            """)
    List<ConteoGradoKL> contarPorGradoKLPorUsuario(@Param("usuarioId") String usuarioId);

    @Query("""
            SELECT new com.koda.backend.dto.ConteoPorDia(CAST(m.fechaCreacion AS LocalDate), COUNT(m))
            FROM MetadatoAnalisis m
            WHERE m.fechaCreacion >= :desde
            GROUP BY CAST(m.fechaCreacion AS LocalDate)
            ORDER BY CAST(m.fechaCreacion AS LocalDate)
            """)
    List<ConteoPorDia> contarPorDiaDesde(@Param("desde") LocalDateTime desde);

    @Query("""
            SELECT new com.koda.backend.dto.ConteoPorDia(CAST(m.fechaCreacion AS LocalDate), COUNT(m))
            FROM MetadatoAnalisis m
            WHERE m.usuarioId = :usuarioId AND m.fechaCreacion >= :desde
            GROUP BY CAST(m.fechaCreacion AS LocalDate)
            ORDER BY CAST(m.fechaCreacion AS LocalDate)
            """)
    List<ConteoPorDia> contarPorDiaDesdePorUsuario(@Param("usuarioId") String usuarioId,
                                                    @Param("desde") LocalDateTime desde);
}
