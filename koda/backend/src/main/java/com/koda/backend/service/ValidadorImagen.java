package com.koda.backend.service;

import java.io.IOException;
import java.io.InputStream;
import java.util.Arrays;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.unit.DataSize;
import org.springframework.web.multipart.MultipartFile;

import com.koda.backend.exception.ImagenInvalidaException;

/** Valida formato y tamano de la radiografia antes de invocar el modelo. */
@Service
public class ValidadorImagen {

    private static final byte[] FIRMA_PNG = {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
    private static final byte[] FIRMA_JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};

    private final DataSize tamanoMaximo;

    public ValidadorImagen(@Value("${koda.analisis.tamano-maximo}") DataSize tamanoMaximo) {
        this.tamanoMaximo = tamanoMaximo;
    }

    /**
     * @return el tipo MIME detectado a partir del contenido del archivo
     * @throws ImagenInvalidaException si no es un PNG o JPEG dentro del limite de tamano
     */
    public String validarFormatoYTamano(MultipartFile archivo) {
        if (archivo == null || archivo.isEmpty()) {
            throw new ImagenInvalidaException("Debe seleccionar una radiografía para analizar.");
        }
        if (archivo.getSize() > tamanoMaximo.toBytes()) {
            throw new ImagenInvalidaException("El archivo excede el tamaño máximo permitido ("
                    + tamanoMaximo.toMegabytes() + " MB). Por favor, seleccione un archivo más pequeño.");
        }

        // Se inspeccionan los primeros bytes: la extension y el tipo que declara
        // el navegador los controla el cliente y no son confiables.
        byte[] cabecera = leerCabecera(archivo);
        if (empiezaCon(cabecera, FIRMA_PNG)) {
            return "image/png";
        }
        if (empiezaCon(cabecera, FIRMA_JPEG)) {
            return "image/jpeg";
        }
        throw new ImagenInvalidaException(
                "El formato del archivo no es compatible. Solo se aceptan imágenes JPEG o PNG.");
    }

    private byte[] leerCabecera(MultipartFile archivo) {
        try (InputStream entrada = archivo.getInputStream()) {
            return entrada.readNBytes(FIRMA_PNG.length);
        } catch (IOException e) {
            throw new ImagenInvalidaException("No se pudo leer el archivo cargado.");
        }
    }

    private boolean empiezaCon(byte[] datos, byte[] firma) {
        return datos.length >= firma.length
                && Arrays.equals(Arrays.copyOf(datos, firma.length), firma);
    }
}
