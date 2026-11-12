-- Rodilla de la radiografia (izquierda o derecha), indicada por el medico al cargarla.
-- Nula en los analisis anteriores a esta migracion.
ALTER TABLE metadatos_analisis ADD COLUMN lateralidad VARCHAR(10);

ALTER TABLE metadatos_analisis ADD CONSTRAINT ck_metadatos_analisis_lateralidad
    CHECK (lateralidad IN ('IZQUIERDA', 'DERECHA'));
