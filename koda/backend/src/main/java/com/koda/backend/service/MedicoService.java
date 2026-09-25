package com.koda.backend.service;

import java.util.List;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.koda.backend.dto.ActualizarMedicoRequest;
import com.koda.backend.dto.CrearMedicoRequest;
import com.koda.backend.dto.MedicoResponse;
import com.koda.backend.exception.ConflictoException;
import com.koda.backend.exception.RecursoNoEncontradoException;
import com.koda.backend.model.Rol;
import com.koda.backend.model.Usuario;
import com.koda.backend.repository.UsuarioRepository;

/** Alta, consulta, edicion y baja de cuentas de medico. */
@Service
public class MedicoService {

    private final UsuarioRepository repositorio;
    private final PasswordEncoder encoder;

    public MedicoService(UsuarioRepository repositorio, PasswordEncoder encoder) {
        this.repositorio = repositorio;
        this.encoder = encoder;
    }

    @Transactional(readOnly = true)
    public List<MedicoResponse> listar() {
        return repositorio.findByRolOrderByNombreAsc(Rol.MEDICO).stream()
                .map(MedicoResponse::desde)
                .toList();
    }

    @Transactional(readOnly = true)
    public MedicoResponse obtener(String id) {
        return MedicoResponse.desde(buscarMedico(id));
    }

    @Transactional
    public MedicoResponse crear(CrearMedicoRequest solicitud) {
        verificarDisponibilidad(solicitud.correo(), solicitud.usuario(), null);

        Usuario medico = new Usuario(
                solicitud.nombre().trim(),
                solicitud.correo().trim().toLowerCase(),
                solicitud.usuario().trim().toLowerCase(),
                encoder.encode(solicitud.contrasenaTemporal()),
                Rol.MEDICO,
                solicitud.institucion());
        medico.setTelefono(solicitud.telefono());

        return MedicoResponse.desde(repositorio.save(medico));
    }

    @Transactional
    public MedicoResponse actualizar(String id, ActualizarMedicoRequest solicitud) {
        Usuario medico = buscarMedico(id);
        verificarDisponibilidad(solicitud.correo(), solicitud.usuario(), id);

        medico.setNombre(solicitud.nombre().trim());
        medico.setCorreo(solicitud.correo().trim().toLowerCase());
        medico.setUsuario(solicitud.usuario().trim().toLowerCase());
        medico.setInstitucion(solicitud.institucion());
        medico.setTelefono(solicitud.telefono());

        return MedicoResponse.desde(repositorio.save(medico));
    }

    @Transactional
    public void eliminar(String id) {
        repositorio.delete(buscarMedico(id));
    }

    /**
     * Solo se gestionan cuentas de medico: pedir un administrador por esta via
     * responde lo mismo que un identificador inexistente.
     */
    private Usuario buscarMedico(String id) {
        return repositorio.findById(id)
                .filter(u -> u.getRol() == Rol.MEDICO)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No existe una cuenta de médico con el identificador indicado."));
    }

    /** El correo y el nombre de usuario son unicos en toda la tabla. */
    private void verificarDisponibilidad(String correo, String usuario, String idQueSeEdita) {
        repositorio.findByCorreoIgnoreCase(correo.trim())
                .filter(u -> !u.getId().equals(idQueSeEdita))
                .ifPresent(u -> {
                    throw new ConflictoException("Ya existe una cuenta con ese correo electrónico.");
                });

        repositorio.findByUsuarioIgnoreCase(usuario.trim())
                .filter(u -> !u.getId().equals(idQueSeEdita))
                .ifPresent(u -> {
                    throw new ConflictoException("Ya existe una cuenta con ese nombre de usuario.");
                });
    }
}
