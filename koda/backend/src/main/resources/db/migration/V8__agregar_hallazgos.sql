-- Hallazgos radiograficos del analisis: al registrarlo se guarda el texto
-- predeterminado de su grado KL y el medico puede editarlo despues.
-- Nulo en los analisis anteriores a esta migracion.
ALTER TABLE metadatos_analisis ADD COLUMN hallazgos VARCHAR(2000);
