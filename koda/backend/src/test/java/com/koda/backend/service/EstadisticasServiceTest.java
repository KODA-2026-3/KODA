package com.koda.backend.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import org.mockito.Mock;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;

import com.koda.backend.dto.ConteoGradoKL;
import com.koda.backend.dto.ConteoPorDia;
import com.koda.backend.dto.EstadisticasDTO;
import com.koda.backend.model.Rol;
import com.koda.backend.repository.RepositorioAnalisis;
import com.koda.backend.repository.UsuarioRepository;

@ExtendWith(MockitoExtension.class)
class EstadisticasServiceTest {

    @Mock
    private RepositorioAnalisis repositorioAnalisis;

    @Mock
    private UsuarioRepository usuarios;

    private EstadisticasService servicio;

    @BeforeEach
    void setUp() {
        servicio = new EstadisticasService(repositorioAnalisis, usuarios);
    }

    @Test
    @DisplayName("Debe calcular estadísticas completas rellenando grados KL del 0 al 4 y 14 días")
    void obtener_retornaEstadisticasConDistribucionCompleta() {
        when(repositorioAnalisis.count()).thenReturn(150L);
        when(repositorioAnalisis.countByFechaCreacionBetween(any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(12L);
        when(repositorioAnalisis.confianzaPromedio()).thenReturn(0.875);
        when(usuarios.countByRolAndActivoTrue(Rol.MEDICO)).thenReturn(5L);

        // Solo tenemos datos para grados 1 y 3 en la BD
        when(repositorioAnalisis.contarPorGradoKL()).thenReturn(List.of(
                new ConteoGradoKL(1, 30L),
                new ConteoGradoKL(3, 50L)
        ));

        // Solo tenemos datos para hoy en la BD
        LocalDate hoy = LocalDate.now();
        when(repositorioAnalisis.contarPorDiaDesde(any(LocalDateTime.class))).thenReturn(List.of(
                new ConteoPorDia(hoy, 12L)
        ));

        EstadisticasDTO resultado = servicio.obtener();

        assertThat(resultado).isNotNull();
        assertThat(resultado.totalRadiografias()).isEqualTo(150L);
        assertThat(resultado.radiografiasHoy()).isEqualTo(12L);
        assertThat(resultado.confianzaPromedio()).isEqualTo(0.875);
        assertThat(resultado.medicosActivos()).isEqualTo(5L);

        // Distribucion KL debe tener exactamente los 5 grados (0, 1, 2, 3, 4)
        assertThat(resultado.distribucionKL()).hasSize(5);
        assertThat(resultado.distribucionKL().get(0)).isEqualTo(new ConteoGradoKL(0, 0L));
        assertThat(resultado.distribucionKL().get(1)).isEqualTo(new ConteoGradoKL(1, 30L));
        assertThat(resultado.distribucionKL().get(2)).isEqualTo(new ConteoGradoKL(2, 0L));
        assertThat(resultado.distribucionKL().get(3)).isEqualTo(new ConteoGradoKL(3, 50L));
        assertThat(resultado.distribucionKL().get(4)).isEqualTo(new ConteoGradoKL(4, 0L));

        // Historial por dia debe tener exactamente 14 dias
        assertThat(resultado.radiografiasPorDia()).hasSize(14);
        assertThat(resultado.radiografiasPorDia().get(13).fecha()).isEqualTo(hoy);
        assertThat(resultado.radiografiasPorDia().get(13).cantidad()).isEqualTo(12L);
        assertThat(resultado.radiografiasPorDia().get(0).cantidad()).isEqualTo(0L);
    }

    @Test
    @DisplayName("Debe calcular estadísticas personales del médico (7 días) o retornar vacías si no existe")
    void obtenerPersonales_retornaActividadDelMedico() {
        com.koda.backend.model.Usuario medico = org.mockito.Mockito.mock(com.koda.backend.model.Usuario.class);
        when(medico.getId()).thenReturn("uuid-medico-1");
        when(usuarios.findByCorreoIgnoreCase("mgarcia@hospital.org"))
                .thenReturn(java.util.Optional.of(medico));
        when(repositorioAnalisis.countByUsuarioId("uuid-medico-1")).thenReturn(25L);
        when(repositorioAnalisis.countByUsuarioIdAndFechaCreacionBetween(
                org.mockito.ArgumentMatchers.eq("uuid-medico-1"), any(LocalDateTime.class), any(LocalDateTime.class)))
                .thenReturn(4L);
        when(repositorioAnalisis.confianzaPromedioPorUsuario("uuid-medico-1")).thenReturn(0.91);
        when(repositorioAnalisis.contarPorGradoKLPorUsuario("uuid-medico-1"))
                .thenReturn(List.of(new ConteoGradoKL(2, 10L)));
        when(repositorioAnalisis.contarPorDiaDesdePorUsuario(
                org.mockito.ArgumentMatchers.eq("uuid-medico-1"), any(LocalDateTime.class)))
                .thenReturn(List.of(new ConteoPorDia(LocalDate.now(), 4L)));

        var personales = servicio.obtenerPersonales("mgarcia@hospital.org");

        assertThat(personales.totalRadiografias()).isEqualTo(25L);
        assertThat(personales.confianzaPromedio()).isEqualTo(0.91);
        assertThat(personales.distribucionKL()).hasSize(5);
        assertThat(personales.radiografiasPorDia()).hasSize(7);
    }
}
