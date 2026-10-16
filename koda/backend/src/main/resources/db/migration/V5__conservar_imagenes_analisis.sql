-- Las radiografias se conservan por un plazo limitado (koda.analisis.retencion-dias,
-- 7 por defecto) para que el medico pueda volver a abrir un resultado. Al vencer,
-- se borran la imagen y el mapa de calor; el registro de metadatos_analisis se
-- conserva como auditoria.

-- Probabilidades de los grados 0 a 4, separadas por coma. Viven en el registro y
-- no con la imagen para que la distribucion siga visible despues de la limpieza.
-- Nulas en los analisis anteriores a esta migracion.
ALTER TABLE metadatos_analisis ADD COLUMN probabilidades VARCHAR(200);

CREATE TABLE imagenes_analisis (
    analisis_id    BIGINT      NOT NULL,
    -- Radiografia sin metadatos embebidos (EXIF, texto PNG): se recodifica al guardarla.
    imagen         BYTEA       NOT NULL,
    tipo_contenido VARCHAR(50) NOT NULL,
    -- Radiografia con el mapa Grad-CAM superpuesto, tal como la devolvio el modulo de IA (PNG).
    heatmap        BYTEA       NOT NULL,
    expira_en      TIMESTAMP   NOT NULL,

    CONSTRAINT pk_imagenes_analisis PRIMARY KEY (analisis_id),
    CONSTRAINT fk_imagenes_analisis_registro FOREIGN KEY (analisis_id)
        REFERENCES metadatos_analisis (id) ON DELETE CASCADE
);

-- La limpieza periodica busca por fecha de vencimiento.
CREATE INDEX ix_imagenes_analisis_expira ON imagenes_analisis (expira_en);
