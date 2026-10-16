package com.koda.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.zip.CRC32;

import javax.imageio.ImageIO;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import com.koda.backend.dto.AnalisisResumenDTO;
import com.koda.backend.dto.ImagenPreprocesada;
import com.koda.backend.dto.PrediccionDTO;
import com.koda.backend.dto.ResultadoDTO;
import com.koda.backend.exception.RecursoNoEncontradoException;
import com.koda.backend.repository.RepositorioAnalisis;

/**
 * Retencion de radiografias: guardado, acceso solo del medico duenio, borrado
 * al vencer el plazo y por pedido del medico. Corre sobre H2 con las mismas
 * migraciones Flyway, con las cuentas de demostracion de DatosIniciales.
 */
@SpringBootTest
@ActiveProfiles("h2")
@Transactional
class HistorialAnalisisServiceTest {

    private static final String MEDICO = "mgarcia@hospital.org";
    private static final String OTRO_USUARIO = "cmendez@hospital.org";

    @Autowired
    private HistorialAnalisisService historial;

    @Autowired
    private RepositorioAnalisis registros;

    @Test
    void registraElAnalisisConSuImagenPorSieteDias() throws Exception {
        ResultadoDTO resultado = registrar();

        assertThat(resultado.imagenExpiraEn()).isAfter(resultado.fechaAnalisis().plusDays(7).minusMinutes(1));

        AnalisisResumenDTO resumen = historial.obtener(resultado.analisisId(), MEDICO);
        assertThat(resumen.imagenDisponible()).isTrue();
        assertThat(resumen.gradoKL()).isEqualTo(3);
        assertThat(resumen.probabilidades()).containsExactly(0.0, 0.05, 0.1, 0.8, 0.05);
        assertThat(historial.imagen(resultado.analisisId(), MEDICO).getHeatmap()).isEqualTo(heatmap());
        assertThat(historial.listar(MEDICO)).extracting(AnalisisResumenDTO::analisisId)
                .contains(resultado.analisisId());
    }

    @Test
    void otroUsuarioNoPuedeVerNiBorrarElAnalisis() throws Exception {
        Long id = registrar().analisisId();

        assertThatThrownBy(() -> historial.obtener(id, OTRO_USUARIO))
                .isInstanceOf(RecursoNoEncontradoException.class);
        assertThatThrownBy(() -> historial.imagen(id, OTRO_USUARIO))
                .isInstanceOf(RecursoNoEncontradoException.class);
        assertThatThrownBy(() -> historial.eliminarImagen(id, OTRO_USUARIO))
                .isInstanceOf(RecursoNoEncontradoException.class);
        assertThat(historial.listar(OTRO_USUARIO)).extracting(AnalisisResumenDTO::analisisId).doesNotContain(id);
    }

    @Test
    void alVencerElPlazoSeBorraLaImagenYQuedaElRegistro() throws Exception {
        Long id = registrar().analisisId();

        assertThat(historial.eliminarVencidas(LocalDateTime.now().plusDays(6))).isZero();
        assertThat(historial.obtener(id, MEDICO).imagenDisponible()).isTrue();

        assertThat(historial.eliminarVencidas(LocalDateTime.now().plusDays(8))).isPositive();

        AnalisisResumenDTO resumen = historial.obtener(id, MEDICO);
        assertThat(resumen.imagenDisponible()).isFalse();
        assertThat(resumen.imagenExpiraEn()).isNull();
        assertThat(resumen.probabilidades()).hasSize(5);
        assertThat(registros.existsById(id)).isTrue();
        assertThatThrownBy(() -> historial.imagen(id, MEDICO)).isInstanceOf(RecursoNoEncontradoException.class);
    }

    @Test
    void elMedicoPuedeBorrarLaImagenAntesDelPlazo() throws Exception {
        Long id = registrar().analisisId();

        historial.eliminarImagen(id, MEDICO);

        assertThat(historial.obtener(id, MEDICO).imagenDisponible()).isFalse();
        assertThat(registros.existsById(id)).isTrue();
    }

    @Test
    void seGuardaLaImagenSinSusMetadatosEmbebidos() throws Exception {
        byte[] conTexto = conBloqueDeTexto(png(), "Paciente: Juan Perez");
        assertThat(new String(conTexto, StandardCharsets.ISO_8859_1)).contains("Juan Perez");

        byte[] guardada = HistorialAnalisisService.sinMetadatos(conTexto, "image/png");

        assertThat(new String(guardada, StandardCharsets.ISO_8859_1)).doesNotContain("Juan Perez");
        BufferedImage original = ImageIO.read(new ByteArrayInputStream(conTexto));
        BufferedImage limpia = ImageIO.read(new ByteArrayInputStream(guardada));
        assertThat(limpia.getRGB(10, 10)).isEqualTo(original.getRGB(10, 10));
    }

    private ResultadoDTO registrar() throws Exception {
        PrediccionDTO prediccion = new PrediccionDTO(3, 0.8, List.of(0.0, 0.05, 0.1, 0.8, 0.05),
                Base64.getEncoder().encodeToString(heatmap()), "diko_stage2");
        ImagenPreprocesada imagen = new ImagenPreprocesada(png(), "rodilla.png", "image/png", 64, 64);
        return historial.registrar(MEDICO, imagen, prediccion, 1200);
    }

    private static byte[] png() throws Exception {
        BufferedImage imagen = new BufferedImage(64, 64, BufferedImage.TYPE_BYTE_GRAY);
        imagen.getRaster().setSample(10, 10, 0, 200);
        ByteArrayOutputStream salida = new ByteArrayOutputStream();
        ImageIO.write(imagen, "png", salida);
        return salida.toByteArray();
    }

    private static byte[] heatmap() {
        return new byte[] {(byte) 0x89, 'P', 'N', 'G', 1, 2, 3};
    }

    /** Inserta un bloque tEXt despues del IHDR (firma de 8 bytes + IHDR de 25). */
    private static byte[] conBloqueDeTexto(byte[] png, String texto) {
        byte[] datos = ("Comment\0" + texto).getBytes(StandardCharsets.ISO_8859_1);
        CRC32 crc = new CRC32();
        crc.update("tEXt".getBytes(StandardCharsets.US_ASCII));
        crc.update(datos);
        ByteBuffer bloque = ByteBuffer.allocate(12 + datos.length)
                .putInt(datos.length)
                .put("tEXt".getBytes(StandardCharsets.US_ASCII))
                .put(datos)
                .putInt((int) crc.getValue());
        ByteArrayOutputStream salida = new ByteArrayOutputStream();
        salida.write(png, 0, 33);
        salida.writeBytes(bloque.array());
        salida.write(png, 33, png.length - 33);
        return salida.toByteArray();
    }
}
