package com.koda.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.koda.backend.model.Rol;
import com.koda.backend.model.Usuario;

public interface UsuarioRepository extends JpaRepository<Usuario, String> {

    Optional<Usuario> findByCorreoIgnoreCase(String correo);

    Optional<Usuario> findByUsuarioIgnoreCase(String usuario);

    List<Usuario> findByRolOrderByNombreAsc(Rol rol);
}
