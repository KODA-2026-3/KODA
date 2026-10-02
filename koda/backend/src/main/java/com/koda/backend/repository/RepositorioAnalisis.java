package com.koda.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.koda.backend.model.MetadatoAnalisis;

public interface RepositorioAnalisis extends JpaRepository<MetadatoAnalisis, Long> {

    List<MetadatoAnalisis> findByUsuarioIdOrderByFechaCreacionDesc(String usuarioId);

    List<MetadatoAnalisis> findAllByOrderByFechaCreacionDesc();
}
