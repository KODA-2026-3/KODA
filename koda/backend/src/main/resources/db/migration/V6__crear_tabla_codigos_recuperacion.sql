-- Codigos de un solo uso para restablecer la contrasena (RF-13, CU-07). Cada usuario
-- tiene como maximo uno vigente: pedir otro reemplaza al anterior.
CREATE TABLE codigos_recuperacion (
    usuario_id  VARCHAR(255) NOT NULL,
    -- Hash BCrypt del codigo: quien lea la base no puede usarlo.
    codigo_hash VARCHAR(255) NOT NULL,
    expira_en   TIMESTAMP    NOT NULL,
    creado_en   TIMESTAMP    NOT NULL,
    intentos    INTEGER      NOT NULL,

    CONSTRAINT pk_codigos_recuperacion PRIMARY KEY (usuario_id),
    CONSTRAINT fk_codigos_recuperacion_usuario FOREIGN KEY (usuario_id)
        REFERENCES usuarios (id) ON DELETE CASCADE
);
