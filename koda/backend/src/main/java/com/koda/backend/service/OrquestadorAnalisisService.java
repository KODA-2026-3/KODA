package com.koda.backend.service;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Iterator;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import com.koda.backend.dto.ImagenPreprocesada;
import com.koda.backend.dto.PrediccionDTO;
import com.koda.backend.dto.ResultadoDTO;
import com.koda.backend.exception.ImagenInvalidaException;
import com.koda.backend.ia.IModuloIAClient;
import com.koda.backend.model.MetadatoAnalisis;
import com.koda.backend.repository.RepositorioAnalisis;
import com.koda.backend.repository.UsuarioRepository;

/**
 * Coordina el flujo de un analisis: valida la radiografia, solicita la
 * inferencia, registra el resultado y arma la respuesta (diagrama de secuencia
 * del SDD, pasos 2 a 17).
 *
 * La imagen solo vive en memoria durante la solicitud: no se escribe en disco.
 */
@Service
public class OrquestadorAnalisisService {

    private static final Logger log = LoggerFactory.getLogger(OrquestadorAnalisisService.class);
    private static final int LARGO_MAXIMO_NOMBRE = 255;

    private final ValidadorImagen validador;
    private final IModuloIAClient iaClient;
    private final RepositorioAnalisis repositorio;
    private final UsuarioRepository usuarios;

    public OrquestadorAnalisisService(ValidadorImagen validador, IModuloIAClient iaClient,
                                      RepositorioAnalisis repositorio, UsuarioRepository usuarios) {
        this.validador = validador;
        this.iaClient = iaClient;
        this.repositorio = repositorio;
        this.usuarios = usuarios;
    }

    public ResultadoDTO procesarRadiografia(MultipartFile archivo, String correoUsuario) {
        long inicio = System.nanoTime();

        String tipoContenido = validador.validarFormatoYTamano(archivo);
        byte[] datos = leer(archivo);
        String nombreArchivo = nombreSeguro(archivo.getOriginalFilename());

        ImagenPreprocesada imagen = conDimensiones(datos, nombreArchivo, tipoContenido);
        PrediccionDTO prediccion = iaClient.solicitarInferencia(imagen);

        long tiempoMs = (System.nanoTime() - inicio) / 1_000_000;
        // Si la cuenta dejo de existir durante el analisis, el registro se guarda sin usuario.
        String usuarioId = usuarios.findByCorreoIgnoreCase(correoUsuario).map(u -> u.getId()).orElse(null);

        MetadatoAnalisis registro = repositorio.save(new MetadatoAnalisis(
                usuarioId,
                nombreArchivo,
                prediccion.gradoKL(),
                prediccion.confianza(),
                tiempoMs,
                prediccion.modelo(),
                LocalDateTime.now()));

        log.info("Analisis {} completado: grado KL {}, confianza {}, {} ms, modelo {}",
                registro.getId(), prediccion.gradoKL(), prediccion.confianza(), tiempoMs, prediccion.modelo());

        return new ResultadoDTO(registro.getId(), prediccion, registro.getFechaCreacion(),
                nombreArchivo, tiempoMs);
    }

    private byte[] leer(MultipartFile archivo) {
        try {
            return archivo.getBytes();
        } catch (IOException e) {
            throw new ImagenInvalidaException("No se pudo leer el archivo cargado.");
        }
    }

    /**
     * Lee solo la cabecera para obtener ancho y alto, sin decodificar la imagen
     * completa. Si no hay cabecera legible, el archivo esta danado.
     */
    private ImagenPreprocesada conDimensiones(byte[] datos, String nombre, String tipo) {
        try (ImageInputStream entrada = ImageIO.createImageInputStream(new ByteArrayInputStream(datos))) {
            Iterator<ImageReader> lectores = ImageIO.getImageReaders(entrada);
            if (!lectores.hasNext()) {
                throw new ImagenInvalidaException("El archivo no es una imagen válida o está dañado.");
            }
            ImageReader lector = lectores.next();
            try {
                lector.setInput(entrada);
                return new ImagenPreprocesada(datos, nombre, tipo, lector.getWidth(0), lector.getHeight(0));
            } finally {
                lector.dispose();
            }
        } catch (IOException e) {
            throw new ImagenInvalidaException("El archivo no es una imagen válida o está dañado.");
        }
    }

    /** Se descarta cualquier ruta que envie el navegador y se acota el largo. */
    private String nombreSeguro(String original) {
        String nombre = StringUtils.getFilename(StringUtils.hasText(original) ? original : "radiografia");
        nombre = nombre == null ? "radiografia" : nombre.replace('\\', '_');
        return nombre.length() > LARGO_MAXIMO_NOMBRE ? nombre.substring(0, LARGO_MAXIMO_NOMBRE) : nombre;
    }
}
