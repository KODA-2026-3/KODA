package com.koda.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.koda.backend.model.Rol;
import com.koda.backend.model.Usuario;
import com.koda.backend.repository.UsuarioRepository;

/**
 * Carga las cuentas de demostracion cuando la tabla de usuarios esta vacia.
 * Se ejecuta tanto con H2 en memoria como con PostgreSQL.
 */
@Configuration
public class DatosIniciales {

    private static final Logger log = LoggerFactory.getLogger(DatosIniciales.class);

    /** Contrasena de las cuentas sembradas; cambiar antes de cualquier despliegue real. */
    private static final String CONTRASENA_DEMO = "OsteoKnee2026!";

    @Bean
    public CommandLineRunner sembrarUsuarios(UsuarioRepository repositorio, PasswordEncoder encoder) {
        return args -> {
            if (repositorio.count() > 0) {
                return;
            }

            repositorio.save(new Usuario(
                    "Dra. María García",
                    "mgarcia@hospital.org",
                    "mgarcia",
                    encoder.encode(CONTRASENA_DEMO),
                    Rol.MEDICO,
                    "Centro Médico de Diagnóstico"));

            repositorio.save(new Usuario(
                    "Carlos Méndez",
                    "cmendez@hospital.org",
                    "cmendez",
                    encoder.encode(CONTRASENA_DEMO),
                    Rol.ADMIN,
                    "Hospital de Clínicas"));

            log.info("Cuentas de demostración creadas: mgarcia@hospital.org (MEDICO), cmendez@hospital.org (ADMIN)");
        };
    }
}
