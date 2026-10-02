package com.koda.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.koda.backend.model.MetadatoAnalisis;

public interface RepositorioAnalisis extends JpaRepository<MetadatoAnalisis, Long> {

    List<MetadatoAnalisis> findByUsuarioIdOrderByFechaCreacionDesc(String usuarioId);

    /** Un analisis de otro medico se trata como inexistente. */
    Optional<MetadatoAnalisis> findByIdAndUsuarioId(Long id, String usuarioId);
}
