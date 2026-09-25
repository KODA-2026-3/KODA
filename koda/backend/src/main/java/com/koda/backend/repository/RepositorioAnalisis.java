package com.koda.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.koda.backend.model.MetadatoAnalisis;

public interface RepositorioAnalisis extends JpaRepository<MetadatoAnalisis, Long> {
}
