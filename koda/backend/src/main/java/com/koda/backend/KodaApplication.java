package com.koda.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;
import org.springframework.scheduling.annotation.EnableScheduling;

// La autenticacion la resuelve SecurityConfig con JWT: se excluye el usuario
// en memoria que Spring Boot crearia por defecto (imprime una contrasena
// aleatoria en cada arranque y no se usa).
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
// Tareas programadas: limpieza de las radiografias vencidas (HistorialAnalisisService).
@EnableScheduling
public class KodaApplication {

    public static void main(String[] args) {
        SpringApplication.run(KodaApplication.class, args);
    }

}
