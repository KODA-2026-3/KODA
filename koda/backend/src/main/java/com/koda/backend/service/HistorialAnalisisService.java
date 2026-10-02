package com.koda.backend.service;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.koda.backend.dto.AnalisisResumenDTO;
import com.koda.backend.dto.ImagenPreprocesada;
import com.koda.backend.dto.PrediccionDTO;
import com.koda.backend.dto.ResultadoDTO;
import com.koda.backend.exception.ImagenInvalidaException;
import com.koda.backend.exception.RecursoNoEncontradoException;
import com.koda.backend.model.ImagenAnalisis;
import com.koda.backend.model.MetadatoAnalisis;
import com.koda.backend.repository.RepositorioAnalisis;
import com.koda.backend.repository.RepositorioImagenAnalisis;
import com.koda.backend.repository.UsuarioRepository;

/**
 * Registro e historial de los analisis de cada medico.
 *
 * La radiografia y el mapa de calor se conservan koda.analisis.retencion-dias
 * (7 por defecto) para volver a abrir un resultado; despues se borran y queda
 * solo el registro del analisis. Cada medico ve unicamente sus analisis.
 */
@Service
public class HistorialAnalisisService {

    private static final Logger log = LoggerFactory.getLogger(HistorialAnalisisService.class);
    private static final float CALIDAD_JPEG = 0.92f;

    private final RepositorioAnalisis registros;
    private final RepositorioImagenAnalisis imagenes;
    private final UsuarioRepository usuarios;
    private final int diasRetencion;

    public HistorialAnalisisService(RepositorioAnalisis registros, RepositorioImagenAnalisis imagenes,
                                    UsuarioRepository usuarios,
                                    @Value("${koda.analisis.retencion-dias}") int diasRetencion) {
        this.registros = registros;
        this.imagenes = imagenes;
        this.usuarios = usuarios;
        this.diasRetencion = diasRetencion;
    }

    /** Guarda el registro y la imagen juntos: o quedan los dos, o ninguno. */
    @Transactional
    public ResultadoDTO registrar(String correoUsuario, ImagenPreprocesada imagen, PrediccionDTO prediccion,
                                  long tiempoMs) {
        LocalDateTime ahora = LocalDateTime.now();
        // Si la cuenta dejo de existir durante el analisis, el registro se guarda sin usuario.
        String usuarioId = idDe(correoUsuario);

        MetadatoAnalisis registro = registros.save(new MetadatoAnalisis(
                usuarioId,
                imagen.nombreArchivo(),
                prediccion.gradoKL(),
                prediccion.confianza(),
                prediccion.probabilidades(),
                tiempoMs,
                prediccion.modelo(),
                ahora));

        LocalDateTime expiraEn = ahora.plusDays(diasRetencion);
        imagenes.save(new ImagenAnalisis(
                registro.getId(),
                sinMetadatos(imagen.datosImagen(), imagen.tipoContenido()),
                imagen.tipoContenido(),
                Base64.getDecoder().decode(prediccion.heatmapBase64()),
                expiraEn));

        return new ResultadoDTO(registro.getId(), prediccion, ahora, registro.getNombreArchivo(), tiempoMs,
                expiraEn);
    }

    @Transactional(readOnly = true)
    public List<AnalisisResumenDTO> listar(String correoUsuario) {
        String usuarioId = idDe(correoUsuario);
        if (usuarioId == null) {
            return List.of();
        }
        List<MetadatoAnalisis> lista = registros.findByUsuarioIdOrderByFechaCreacionDesc(usuarioId);
        LocalDateTime ahora = LocalDateTime.now();
        // La limpieza corre cada hora: una imagen ya vencida se muestra como no disponible
        // aunque todavia no se haya borrado.
        Map<Long, LocalDateTime> vigentes = imagenes
                .findByAnalisisIdIn(lista.stream().map(MetadatoAnalisis::getId).toList())
                .stream()
                .filter(v -> v.getExpiraEn().isAfter(ahora))
                .collect(Collectors.toMap(RepositorioImagenAnalisis.Vencimiento::getAnalisisId,
                        RepositorioImagenAnalisis.Vencimiento::getExpiraEn));
        return lista.stream().map(r -> AnalisisResumenDTO.desde(r, vigentes.get(r.getId()))).toList();
    }

    @Transactional(readOnly = true)
    public AnalisisResumenDTO obtener(Long id, String correoUsuario) {
        MetadatoAnalisis registro = propio(id, correoUsuario);
        LocalDateTime expiraEn = imagenes.findById(id)
                .map(ImagenAnalisis::getExpiraEn)
                .filter(e -> e.isAfter(LocalDateTime.now()))
                .orElse(null);
        return AnalisisResumenDTO.desde(registro, expiraEn);
    }

    @Transactional(readOnly = true)
    public ImagenAnalisis imagen(Long id, String correoUsuario) {
        propio(id, correoUsuario);
        return imagenes.findById(id)
                .filter(i -> i.getExpiraEn().isAfter(LocalDateTime.now()))
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "La radiografía de este análisis ya no está disponible."));
    }

    /** El medico puede borrar la radiografia antes del plazo; el registro se conserva. */
    @Transactional
    public void eliminarImagen(Long id, String correoUsuario) {
        propio(id, correoUsuario);
        if (imagenes.existsById(id)) {
            imagenes.deleteById(id);
            log.info("Imagen del analisis {} eliminada por el medico", id);
        }
    }

    @Scheduled(cron = "${koda.analisis.limpieza-cron}")
    @Transactional
    public void limpiarVencidas() {
        int eliminadas = eliminarVencidas(LocalDateTime.now());
        if (eliminadas > 0) {
            log.info("Limpieza de retencion: {} radiografias eliminadas (plazo de {} dias)", eliminadas,
                    diasRetencion);
        }
    }

    @Transactional
    public int eliminarVencidas(LocalDateTime ahora) {
        return imagenes.eliminarVencidas(ahora);
    }

    private MetadatoAnalisis propio(Long id, String correoUsuario) {
        // Un analisis de otro medico responde igual que uno inexistente, sin revelar que existe.
        return Optional.ofNullable(idDe(correoUsuario))
                .flatMap(usuarioId -> registros.findByIdAndUsuarioId(id, usuarioId))
                .orElseThrow(() -> new RecursoNoEncontradoException("No se encontró el análisis."));
    }

    private String idDe(String correoUsuario) {
        return usuarios.findByCorreoIgnoreCase(correoUsuario).map(u -> u.getId()).orElse(null);
    }

    /**
     * Recodifica la imagen para no guardar los metadatos que trae embebidos
     * (EXIF de JPEG, bloques de texto de PNG), que pueden incluir fecha, equipo
     * o datos del paciente. Los pixeles no cambian en PNG; en JPEG se recomprime
     * con calidad alta.
     */
    static byte[] sinMetadatos(byte[] datos, String tipoContenido) {
        try {
            BufferedImage pixeles = ImageIO.read(new ByteArrayInputStream(datos));
            if (pixeles == null) {
                throw new ImagenInvalidaException("El archivo no es una imagen válida o está dañado.");
            }
            ByteArrayOutputStream salida = new ByteArrayOutputStream();
            if ("image/png".equals(tipoContenido)) {
                ImageIO.write(pixeles, "png", salida);
                return salida.toByteArray();
            }
            ImageWriter escritor = ImageIO.getImageWritersByFormatName("jpeg").next();
            try (ImageOutputStream flujo = ImageIO.createImageOutputStream(salida)) {
                ImageWriteParam parametros = escritor.getDefaultWriteParam();
                parametros.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
                parametros.setCompressionQuality(CALIDAD_JPEG);
                escritor.setOutput(flujo);
                escritor.write(null, new IIOImage(pixeles, null, null), parametros);
            } finally {
                escritor.dispose();
            }
            return salida.toByteArray();
        } catch (IOException e) {
            throw new ImagenInvalidaException("El archivo no es una imagen válida o está dañado.");
        }
    }
}
