package com.koda.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.util.unit.DataSize;

import com.koda.backend.exception.ImagenInvalidaException;

class ValidadorImagenTest {

    private ValidadorImagen validador;

    private static final byte[] MAGIC_PNG = new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00};
    private static final byte[] MAGIC_JPEG = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0x00, 0x10};

    @BeforeEach
    void setUp() {
        validador = new ValidadorImagen(DataSize.ofMegabytes(10));
    }

    @Test
    @DisplayName("Debe aceptar archivo PNG válido y devolver image/png")
    void validarFormatoYTamano_pngValido_retornaMimePng() {
        MockMultipartFile archivo = new MockMultipartFile("imagen", "rx.png", "image/png", MAGIC_PNG);

        String tipo = validador.validarFormatoYTamano(archivo);

        assertThat(tipo).isEqualTo("image/png");
    }

    @Test
    @DisplayName("Debe aceptar archivo JPEG válido y devolver image/jpeg")
    void validarFormatoYTamano_jpegValido_retornaMimeJpeg() {
        MockMultipartFile archivo = new MockMultipartFile("imagen", "rx.jpg", "image/jpeg", MAGIC_JPEG);

        String tipo = validador.validarFormatoYTamano(archivo);

        assertThat(tipo).isEqualTo("image/jpeg");
    }

    @Test
    @DisplayName("Debe rechazar archivo nulo")
    void validarFormatoYTamano_archivoNulo_lanzaExcepcion() {
        assertThatThrownBy(() -> validador.validarFormatoYTamano(null))
                .isInstanceOf(ImagenInvalidaException.class)
                .hasMessageContaining("Debe seleccionar una radiografía");
    }

    @Test
    @DisplayName("Debe rechazar archivo vacío")
    void validarFormatoYTamano_archivoVacio_lanzaExcepcion() {
        MockMultipartFile archivo = new MockMultipartFile("imagen", "vacio.png", "image/png", new byte[0]);

        assertThatThrownBy(() -> validador.validarFormatoYTamano(archivo))
                .isInstanceOf(ImagenInvalidaException.class)
                .hasMessageContaining("Debe seleccionar una radiografía");
    }

    @Test
    @DisplayName("Debe rechazar archivo que excede el tamaño máximo permitido")
    void validarFormatoYTamano_excedeTamano_lanzaExcepcion() {
        byte[] bytesGrandes = new byte[11 * 1024 * 1024]; // 11 MB
        System.arraycopy(MAGIC_PNG, 0, bytesGrandes, 0, MAGIC_PNG.length);

        MockMultipartFile archivo = new MockMultipartFile("imagen", "pesado.png", "image/png", bytesGrandes);

        assertThatThrownBy(() -> validador.validarFormatoYTamano(archivo))
                .isInstanceOf(ImagenInvalidaException.class)
                .hasMessageContaining("excede el tamaño máximo permitido");
    }

    @Test
    @DisplayName("Debe rechazar formato incompatible (por ejemplo PDF o texto plano con extensión .png)")
    void validarFormatoYTamano_formatoInvalido_lanzaExcepcion() {
        byte[] bytesPdf = "%PDF-1.4 archivo falso".getBytes();
        MockMultipartFile archivo = new MockMultipartFile("imagen", "falso.png", "image/png", bytesPdf);

        assertThatThrownBy(() -> validador.validarFormatoYTamano(archivo))
                .isInstanceOf(ImagenInvalidaException.class)
                .hasMessageContaining("El formato del archivo no es compatible");
    }
}
