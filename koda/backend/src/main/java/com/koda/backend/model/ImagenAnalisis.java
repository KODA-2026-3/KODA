package com.koda.backend.model;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Radiografia y mapa de calor de un analisis, conservados hasta expiraEn
 * (koda.analisis.retencion-dias). Comparte la clave con su MetadatoAnalisis:
 * al borrarse la imagen, el registro del analisis se conserva.
 */
@Entity
@Table(name = "imagenes_analisis")
public class ImagenAnalisis {

    @Id
    @Column(name = "analisis_id")
    private Long analisisId;

    @Column(name = "imagen", nullable = false)
    private byte[] imagen;

    @Column(name = "tipo_contenido", nullable = false)
    private String tipoContenido;

    @Column(name = "heatmap", nullable = false)
    private byte[] heatmap;

    @Column(name = "expira_en", nullable = false)
    private LocalDateTime expiraEn;

    protected ImagenAnalisis() {
        // requerido por JPA
    }

    public ImagenAnalisis(Long analisisId, byte[] imagen, String tipoContenido, byte[] heatmap,
                          LocalDateTime expiraEn) {
        this.analisisId = analisisId;
        this.imagen = imagen;
        this.tipoContenido = tipoContenido;
        this.heatmap = heatmap;
        this.expiraEn = expiraEn;
    }

    public Long getAnalisisId() {
        return analisisId;
    }

    public byte[] getImagen() {
        return imagen;
    }

    public String getTipoContenido() {
        return tipoContenido;
    }

    public byte[] getHeatmap() {
        return heatmap;
    }

    public LocalDateTime getExpiraEn() {
        return expiraEn;
    }
}
