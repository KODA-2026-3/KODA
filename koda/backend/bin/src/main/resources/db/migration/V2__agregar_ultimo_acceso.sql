-- Momento del ultimo inicio de sesion, que la gestion de medicos muestra en
-- la tabla. Nulo mientras la cuenta no haya entrado nunca.
ALTER TABLE usuarios ADD COLUMN ultimo_acceso TIMESTAMP;
