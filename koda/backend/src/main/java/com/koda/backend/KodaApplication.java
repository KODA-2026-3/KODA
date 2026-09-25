package com.koda.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;

// La autenticacion la resuelve SecurityConfig con JWT: se excluye el usuario
// en memoria que Spring Boot crearia por defecto (imprime una contrasena
// aleatoria en cada arranque y no se usa).
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
public class KodaApplication {

    public static void main(String[] args) {
        SpringApplication.run(KodaApplication.class, args);
    }

}
