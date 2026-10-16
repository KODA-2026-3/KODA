package com.koda.backend.service;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import org.mockito.Mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.koda.backend.dto.ActualizarMedicoRequest;
import com.koda.backend.dto.CrearMedicoRequest;
import com.koda.backend.dto.MedicoResponse;
import com.koda.backend.exception.ConflictoException;
import com.koda.backend.exception.RecursoNoEncontradoException;
import com.koda.backend.model.Rol;
import com.koda.backend.model.Usuario;
import com.koda.backend.repository.UsuarioRepository;

@ExtendWith(MockitoExtension.class)
class MedicoServiceTest {

    @Mock
    private UsuarioRepository repositorio;

    @Mock
    private PasswordEncoder encoder;

    private MedicoService servicio;

    private Usuario medico;

    @BeforeEach
    void setUp() {
        servicio = new MedicoService(repositorio, encoder);
        medico = new Usuario(
                "Dra. Maria Garcia",
                "mgarcia@hospital.org",
                "mgarcia",
                "encodedPass",
                Rol.MEDICO,
                "Hospital Central");
        org.springframework.test.util.ReflectionTestUtils.setField(medico, "id", "medico-id-123");
    }

    @Test
    @DisplayName("Debe listar todos los médicos ordenados")
    void listar_retornaListaDeMedicos() {
        when(repositorio.findByRolOrderByNombreAsc(Rol.MEDICO)).thenReturn(List.of(medico));

        List<MedicoResponse> resultado = servicio.listar();

        assertThat(resultado).hasSize(1);
        assertThat(resultado.get(0).correo()).isEqualTo("mgarcia@hospital.org");
    }

    @Test
    @DisplayName("Debe obtener un médico por su ID")
    void obtener_idExistente_retornaMedico() {
        when(repositorio.findById(medico.getId())).thenReturn(Optional.of(medico));

        MedicoResponse response = servicio.obtener(medico.getId());

        assertThat(response).isNotNull();
        assertThat(response.id()).isEqualTo(medico.getId());
        assertThat(response.correo()).isEqualTo("mgarcia@hospital.org");
    }

    @Test
    @DisplayName("Debe fallar al obtener si el ID no existe o no tiene rol MEDICO")
    void obtener_idInexistente_lanzaRecursoNoEncontradoException() {
        when(repositorio.findById("inexistente")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> servicio.obtener("inexistente"))
                .isInstanceOf(RecursoNoEncontradoException.class);
    }

    @Test
    @DisplayName("Debe fallar al obtener un usuario con rol ADMIN a través del servicio de médicos")
    void obtener_usuarioAdmin_lanzaRecursoNoEncontradoException() {
        Usuario admin = new Usuario("Admin", "admin@hospital.org", "admin", "pass", Rol.ADMIN, "Hospital");
        when(repositorio.findById(admin.getId())).thenReturn(Optional.of(admin));

        assertThatThrownBy(() -> servicio.obtener(admin.getId()))
                .isInstanceOf(RecursoNoEncontradoException.class);
    }

    @Test
    @DisplayName("Debe crear un médico exitosamente")
    void crear_medicoValido_retornaCreado() {
        CrearMedicoRequest request = new CrearMedicoRequest(
                "Dr. Juan Perez",
                "jperez@hospital.org",
                "jperez",
                "ClaveSegura123!",
                "3001234567",
                "Hospital San Jose");

        when(repositorio.findByCorreoIgnoreCase("jperez@hospital.org")).thenReturn(Optional.empty());
        when(repositorio.findByUsuarioIgnoreCase("jperez")).thenReturn(Optional.empty());
        when(encoder.encode("ClaveSegura123!")).thenReturn("encodedClaveSegura");
        when(repositorio.save(any(Usuario.class))).thenAnswer(inv -> inv.getArgument(0));

        MedicoResponse response = servicio.crear(request);

        assertThat(response).isNotNull();
        assertThat(response.nombre()).isEqualTo("Dr. Juan Perez");
        assertThat(response.correo()).isEqualTo("jperez@hospital.org");
        assertThat(response.usuario()).isEqualTo("jperez");
        assertThat(response.telefono()).isEqualTo("3001234567");
        verify(repositorio).save(any(Usuario.class));
    }

    @Test
    @DisplayName("Debe rechazar la creación si el correo ya está registrado")
    void crear_correoDuplicado_lanzaConflictoException() {
        CrearMedicoRequest request = new CrearMedicoRequest(
                "Dr. Juan Perez",
                "mgarcia@hospital.org",
                "jperez",
                "ClaveSegura123!",
                null,
                "Hospital San Jose");

        when(repositorio.findByCorreoIgnoreCase("mgarcia@hospital.org")).thenReturn(Optional.of(medico));

        assertThatThrownBy(() -> servicio.crear(request))
                .isInstanceOf(ConflictoException.class)
                .hasMessageContaining("Ya existe una cuenta con ese correo");
    }

    @Test
    @DisplayName("Debe rechazar la creación si el nombre de usuario ya está en uso")
    void crear_usuarioDuplicado_lanzaConflictoException() {
        CrearMedicoRequest request = new CrearMedicoRequest(
                "Dr. Juan Perez",
                "jperez@hospital.org",
                "mgarcia",
                "ClaveSegura123!",
                null,
                "Hospital San Jose");

        when(repositorio.findByCorreoIgnoreCase("jperez@hospital.org")).thenReturn(Optional.empty());
        when(repositorio.findByUsuarioIgnoreCase("mgarcia")).thenReturn(Optional.of(medico));

        assertThatThrownBy(() -> servicio.crear(request))
                .isInstanceOf(ConflictoException.class)
                .hasMessageContaining("Ya existe una cuenta con ese nombre de usuario");
    }

    @Test
    @DisplayName("Debe actualizar un médico existente")
    void actualizar_medicoExistente_retornaActualizado() {
        ActualizarMedicoRequest request = new ActualizarMedicoRequest(
                "Dra. Maria Garcia Modificada",
                "mgarcia.nueva@hospital.org",
                "mgarcia.nueva",
                "3119876543",
                "Hospital Privado");

        when(repositorio.findById(medico.getId())).thenReturn(Optional.of(medico));
        when(repositorio.findByCorreoIgnoreCase("mgarcia.nueva@hospital.org")).thenReturn(Optional.empty());
        when(repositorio.findByUsuarioIgnoreCase("mgarcia.nueva")).thenReturn(Optional.empty());
        when(repositorio.save(medico)).thenReturn(medico);

        MedicoResponse response = servicio.actualizar(medico.getId(), request);

        assertThat(response.nombre()).isEqualTo("Dra. Maria Garcia Modificada");
        assertThat(response.correo()).isEqualTo("mgarcia.nueva@hospital.org");
        assertThat(response.telefono()).isEqualTo("3119876543");
        verify(repositorio).save(medico);
    }

    @Test
    @DisplayName("Debe eliminar un médico existente")
    void eliminar_medicoExistente_ejecutaDelete() {
        when(repositorio.findById(medico.getId())).thenReturn(Optional.of(medico));

        servicio.eliminar(medico.getId());

        verify(repositorio).delete(medico);
    }
}
