package com.koda.backend.model;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Codigo de un solo uso para restablecer la contrasena. Comparte la clave con
 * su Usuario: guardar uno nuevo reemplaza al anterior y reinicia los intentos.
 */
@Entity
@Table(name = "codigos_recuperacion")
public class CodigoRecuperacion {

    @Id
    @Column(name = "usuario_id")
    private String usuarioId;

    @Column(name = "codigo_hash", nullable = false)
    private String codigoHash;

    @Column(name = "expira_en", nullable = false)
    private LocalDateTime expiraEn;

    @Column(name = "creado_en", nullable = false)
    private LocalDateTime creadoEn;

    @Column(name = "intentos", nullable = false)
    private int intentos;

    protected CodigoRecuperacion() {
        // requerido por JPA
    }

    public CodigoRecuperacion(String usuarioId, String codigoHash, LocalDateTime expiraEn, LocalDateTime creadoEn) {
        this.usuarioId = usuarioId;
        this.codigoHash = codigoHash;
        this.expiraEn = expiraEn;
        this.creadoEn = creadoEn;
    }

    public String getUsuarioId() {
        return usuarioId;
    }

    public String getCodigoHash() {
        return codigoHash;
    }

    public LocalDateTime getExpiraEn() {
        return expiraEn;
    }

    public LocalDateTime getCreadoEn() {
        return creadoEn;
    }

    public int getIntentos() {
        return intentos;
    }

    public void registrarIntentoFallido() {
        intentos++;
    }
}
