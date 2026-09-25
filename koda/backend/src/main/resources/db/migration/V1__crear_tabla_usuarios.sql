-- Cuentas autorizadas para usar KODA.
-- Refleja la entidad com.koda.backend.model.Usuario.
CREATE TABLE usuarios (
    id          VARCHAR(255) NOT NULL,
    nombre      VARCHAR(255) NOT NULL,
    correo      VARCHAR(255) NOT NULL,
    usuario     VARCHAR(255) NOT NULL,
    -- Hash BCrypt; nunca se guarda la contrasena en claro.
    contrasena  VARCHAR(255) NOT NULL,
    rol         VARCHAR(255) NOT NULL,
    institucion VARCHAR(255),
    activo      BOOLEAN      NOT NULL,

    CONSTRAINT pk_usuarios          PRIMARY KEY (id),
    CONSTRAINT uq_usuarios_correo   UNIQUE (correo),
    CONSTRAINT uq_usuarios_usuario  UNIQUE (usuario),
    CONSTRAINT ck_usuarios_rol      CHECK (rol IN ('MEDICO', 'ADMIN'))
);
