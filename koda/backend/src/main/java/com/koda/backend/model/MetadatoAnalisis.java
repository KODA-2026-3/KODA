package com.koda.backend.model;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Registro de un analisis realizado. No contiene la imagen ni datos del paciente. */
@Entity
@Table(name = "metadatos_analisis")
public class MetadatoAnalisis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "usuario_id")
    private String usuarioId;

    @Column(name = "nombre_archivo", nullable = false)
    private String nombreArchivo;

    @Column(name = "grado_kl", nullable = false)
    private int gradoKL;

    @Column(name = "confianza", nullable = false)
    private double confianza;

    @Column(name = "tiempo_procesamiento_ms", nullable = false)
    private long tiempoProcesamientoMs;

    @Column(name = "modelo", nullable = false)
    private String modelo;

    @Column(name = "fecha_creacion", nullable = false)
    private LocalDateTime fechaCreacion;

    protected MetadatoAnalisis() {
        // requerido por JPA
    }

    public MetadatoAnalisis(String usuarioId, String nombreArchivo, int gradoKL, double confianza,
                            long tiempoProcesamientoMs, String modelo, LocalDateTime fechaCreacion) {
        this.usuarioId = usuarioId;
        this.nombreArchivo = nombreArchivo;
        this.gradoKL = gradoKL;
        this.confianza = confianza;
        this.tiempoProcesamientoMs = tiempoProcesamientoMs;
        this.modelo = modelo;
        this.fechaCreacion = fechaCreacion;
    }

    public Long getId() {
        return id;
    }

    public String getUsuarioId() {
        return usuarioId;
    }

    public String getNombreArchivo() {
        return nombreArchivo;
    }

    public int getGradoKL() {
        return gradoKL;
    }

    public double getConfianza() {
        return confianza;
    }

    public long getTiempoProcesamientoMs() {
        return tiempoProcesamientoMs;
    }

    public String getModelo() {
        return modelo;
    }

    public LocalDateTime getFechaCreacion() {
        return fechaCreacion;
    }
}
