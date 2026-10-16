package com.koda.backend.service;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;

import javax.imageio.ImageIO;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import org.mockito.Mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import com.koda.backend.dto.ImagenPreprocesada;
import com.koda.backend.dto.PrediccionDTO;
import com.koda.backend.dto.ResultadoDTO;
import com.koda.backend.exception.ImagenInvalidaException;
import com.koda.backend.ia.IModuloIAClient;

@ExtendWith(MockitoExtension.class)
class OrquestadorAnalisisServiceTest {

    @Mock
    private ValidadorImagen validador;

    @Mock
    private IModuloIAClient iaClient;

    @Mock
    private HistorialAnalisisService historial;

    private OrquestadorAnalisisService orquestador;

    private byte[] imagenPngBytes;

    @BeforeEach
    void setUp() throws IOException {
        orquestador = new OrquestadorAnalisisService(validador, iaClient, historial);

        BufferedImage img = new BufferedImage(100, 100, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        ImageIO.write(img, "png", baos);
        imagenPngBytes = baos.toByteArray();
    }

    @Test
    @DisplayName("Debe procesar exitosamente la radiografía y sanitizar el nombre del archivo")
    void procesarRadiografia_valida_guardaMetadatosYRetornaResultado() {
        MockMultipartFile archivo = new MockMultipartFile(
                "imagen",
                "../../carpeta/secreta/radiografia_rodilla.png",
                "image/png",
                imagenPngBytes);

        when(validador.validarFormatoYTamano(archivo)).thenReturn("image/png");

        PrediccionDTO prediccionDTO = new PrediccionDTO(
                2,
                0.85,
                List.of(0.05, 0.05, 0.85, 0.03, 0.02),
                "base64HeatmapData",
                "simulado");
        when(iaClient.solicitarInferencia(any())).thenReturn(prediccionDTO);

        LocalDateTime ahora = LocalDateTime.now();
        ResultadoDTO esperado = new ResultadoDTO(
                10L,
                prediccionDTO,
                ahora,
                "radiografia_rodilla.png",
                150L,
                ahora.plusDays(7));
        when(historial.registrar(eq("mgarcia@hospital.org"), any(ImagenPreprocesada.class), eq(prediccionDTO), anyLong()))
                .thenReturn(esperado);

        ResultadoDTO resultado = orquestador.procesarRadiografia(archivo, "mgarcia@hospital.org");

        assertThat(resultado).isNotNull();
        assertThat(resultado.nombreArchivo()).isEqualTo("radiografia_rodilla.png");
        assertThat(resultado.prediccion().gradoKL()).isEqualTo(2);
        assertThat(resultado.prediccion().confianza()).isEqualTo(0.85);
        assertThat(resultado.prediccion().modelo()).isEqualTo("simulado");

        verify(historial).registrar(eq("mgarcia@hospital.org"), any(ImagenPreprocesada.class), eq(prediccionDTO), anyLong());
    }

    @Test
    @DisplayName("Debe fallar si los bytes del archivo no son una imagen decodificable por ImageIO")
    void procesarRadiografia_bytesDanados_lanzaImagenInvalidaException() {
        byte[] bytesBasura = new byte[]{1, 2, 3, 4, 5, 6, 7, 8};
        MockMultipartFile archivo = new MockMultipartFile("imagen", "danado.png", "image/png", bytesBasura);

        when(validador.validarFormatoYTamano(archivo)).thenReturn("image/png");

        assertThatThrownBy(() -> orquestador.procesarRadiografia(archivo, "mgarcia@hospital.org"))
                .isInstanceOf(ImagenInvalidaException.class)
                .hasMessageContaining("no es una imagen válida o está dañado");
    }
}
