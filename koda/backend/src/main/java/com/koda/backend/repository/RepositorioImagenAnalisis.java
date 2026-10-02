package com.koda.backend.repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.koda.backend.model.ImagenAnalisis;

public interface RepositorioImagenAnalisis extends JpaRepository<ImagenAnalisis, Long> {

    /** Vencimiento de las imagenes guardadas, sin cargar los bytes, para armar el historial. */
    interface Vencimiento {
        Long getAnalisisId();

        LocalDateTime getExpiraEn();
    }

    List<Vencimiento> findByAnalisisIdIn(Collection<Long> ids);

    // El borrado masivo va directo a la base: sin limpiar el contexto, una imagen ya
    // cargada en la misma transaccion seguiria apareciendo como disponible.
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from ImagenAnalisis i where i.expiraEn <= :ahora")
    int eliminarVencidas(@Param("ahora") LocalDateTime ahora);
}
