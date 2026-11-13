package com.koda.backend.modulo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;

import com.koda.backend.model.Rol;
import com.koda.backend.model.Usuario;

/**
 * CP-09 · Modulo Medicos: consulta, actualizacion y eliminacion de cuentas
 * (RF-11). La creacion se cubre en CP-01 y el correo de bienvenida en CP-08.
 */
@DisplayName("CP-09 · Módulo Médicos: consultar, actualizar y eliminar")
class CP09MedicosModuloTest extends ModuloTestBase {

    private static final String NO_ENCONTRADO = "No existe una cuenta de médico con el identificador indicado.";

    private String tokenAdmin;
    private Usuario medico;

    @BeforeEach
    void preparar() throws Exception {
        tokenAdmin = obtenerToken(CORREO_ADMIN, CONTRASENA_DEMO);
        String sufijo = sufijoUnico();
        medico = usuarios.save(new Usuario("Dr. Módulo " + sufijo, "modulo." + sufijo + "@hospital.org",
                "modulo" + sufijo, encoder.encode(CONTRASENA_DEMO), Rol.MEDICO, "Hospital de Pruebas"));
    }

    private ResultActions conAdmin(org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder solicitud)
            throws Exception {
        return mockMvc.perform(solicitud.header(HttpHeaders.AUTHORIZATION, bearer(tokenAdmin)));
    }

    private String datosActualizados(String correo, String usuario) throws Exception {
        return objectMapper.writeValueAsString(Map.of(
                "nombre", "Dr. Módulo Actualizado",
                "correo", correo,
                "usuario", usuario,
                "telefono", "3109998877",
                "institucion", "Hospital Actualizado"));
    }

    @Test
    @DisplayName("Listar médicos: incluye los médicos y no incluye cuentas de administrador")
    void listarMedicos() throws Exception {
        conAdmin(get("/medicos"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].correo", hasItem(medico.getCorreo())))
                .andExpect(jsonPath("$[*].correo", hasItem(CORREO_MEDICO)))
                .andExpect(jsonPath("$[*].correo", not(hasItem(CORREO_ADMIN))));
    }

    @Test
    @DisplayName("Obtener un médico por su id: retorna sus datos sin la contraseña")
    void obtenerMedicoPorId() throws Exception {
        conAdmin(get("/medicos/" + medico.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(medico.getId()))
                .andExpect(jsonPath("$.correo").value(medico.getCorreo()))
                .andExpect(jsonPath("$.contrasena").doesNotExist());
    }

    @Test
    @DisplayName("Obtener un id inexistente o el de un administrador: 404 con mensaje")
    void obtenerMedicoInexistente() throws Exception {
        conAdmin(get("/medicos/no-existe-" + sufijoUnico()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.mensaje").value(NO_ENCONTRADO));

        String idAdmin = usuarios.findByCorreoIgnoreCase(CORREO_ADMIN).orElseThrow().getId();
        conAdmin(get("/medicos/" + idAdmin))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.mensaje").value(NO_ENCONTRADO));
    }

    @Test
    @DisplayName("Actualizar un médico registrado: retorna los datos nuevos y quedan en la base de datos")
    void actualizarMedico() throws Exception {
        String sufijo = sufijoUnico();
        String correoNuevo = "actualizado." + sufijo + "@hospital.org";

        conAdmin(put("/medicos/" + medico.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(datosActualizados(correoNuevo, "actualizado" + sufijo)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nombre").value("Dr. Módulo Actualizado"))
                .andExpect(jsonPath("$.correo").value(correoNuevo));

        Usuario guardado = usuarios.findById(medico.getId()).orElseThrow();
        assertThat(guardado.getCorreo()).isEqualTo(correoNuevo);
        assertThat(guardado.getInstitucion()).isEqualTo("Hospital Actualizado");
    }

    @Test
    @DisplayName("Actualizar un médico no registrado: 404 con mensaje")
    void actualizarMedicoInexistente() throws Exception {
        String sufijo = sufijoUnico();
        conAdmin(put("/medicos/no-existe-" + sufijo)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(datosActualizados("x." + sufijo + "@hospital.org", "x" + sufijo)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.mensaje").value(NO_ENCONTRADO));
    }

    @Test
    @DisplayName("Actualizar con el correo de otra cuenta: 409 y los datos no cambian")
    void actualizarConCorreoDeOtraCuenta() throws Exception {
        conAdmin(put("/medicos/" + medico.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(datosActualizados(CORREO_MEDICO, medico.getUsuario())))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.mensaje").value("Ya existe una cuenta con ese correo electrónico."));

        assertThat(usuarios.findById(medico.getId()).orElseThrow().getCorreo()).isEqualTo(medico.getCorreo());
    }

    @Test
    @DisplayName("Eliminar un médico registrado: 204, desaparece de la base y ya no puede iniciar sesión")
    void eliminarMedico() throws Exception {
        conAdmin(delete("/medicos/" + medico.getId())).andExpect(status().isNoContent());

        assertThat(usuarios.findById(medico.getId())).isEmpty();
        intentarLogin(medico.getCorreo(), CONTRASENA_DEMO).andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Eliminar un médico no registrado: 404 con mensaje")
    void eliminarMedicoInexistente() throws Exception {
        conAdmin(delete("/medicos/no-existe-" + sufijoUnico()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.mensaje").value(NO_ENCONTRADO));
    }
}
