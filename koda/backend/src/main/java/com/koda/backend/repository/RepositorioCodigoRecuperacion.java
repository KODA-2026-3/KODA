package com.koda.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.koda.backend.model.CodigoRecuperacion;

public interface RepositorioCodigoRecuperacion extends JpaRepository<CodigoRecuperacion, String> {
}
