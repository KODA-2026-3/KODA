package com.koda.backend.modulo;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.Base64;
import java.util.List;

import javax.imageio.ImageIO;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.ResultActions;

import com.koda.backend.autenticacion.AutenticacionTestBase;
import com.koda.backend.dto.PrediccionDTO;
import com.koda.backend.model.Rol;
import com.koda.backend.model.Usuario;
import com.koda.backend.repository.UsuarioRepository;

/**
 * Base de las pruebas de modulo de la v1.1 (lateralidad, hallazgos y correo de
 * bienvenida). Levanta el backend completo sobre H2 con las migraciones Flyway
 * V1 a V8 y las cuentas de DatosIniciales; solo el servicio de inferencia se
 * reemplaza por un doble en las clases que lo necesitan.
 */
public abstract class ModuloTestBase extends AutenticacionTestBase {

    @Autowired
    protected UsuarioRepository usuarios;

    @Autowired
    protected PasswordEncoder encoder;

    /** Prediccion fija de grado 3, como la que devolveria DIKO_Stage2. */
    protected static PrediccionDTO prediccionGrado3() throws Exception {
        return new PrediccionDTO(3, 0.8, List.of(0.0, 0.05, 0.1, 0.8, 0.05),
                Base64.getEncoder().encodeToString(png()), "diko_stage2");
    }

    /** Radiografia PNG valida de 64 x 64 en escala de grises. */
    protected static byte[] png() throws Exception {
        BufferedImage imagen = new BufferedImage(64, 64, BufferedImage.TYPE_BYTE_GRAY);
        for (int x = 0; x < 64; x++) {
            for (int y = 0; y < 64; y++) {
                imagen.getRaster().setSample(x, y, 0, (x * 3 + y * 2) % 256);
            }
        }
        ByteArrayOutputStream salida = new ByteArrayOutputStream();
        ImageIO.write(imagen, "png", salida);
        return salida.toByteArray();
    }

    /** POST /predict como lo envia el frontend; lateralidad null omite el parametro. */
    protected ResultActions analizar(String token, String lateralidad) throws Exception {
        var solicitud = multipart("/predict")
                .file(new MockMultipartFile("imagen", "rodilla.png", "image/png", png()))
                .header(HttpHeaders.AUTHORIZATION, bearer(token));
        if (lateralidad != null) {
            solicitud.param("lateralidad", lateralidad);
        }
        return mockMvc.perform(solicitud);
    }

    /** Crea un segundo medico directamente en la base y devuelve su token. */
    protected String tokenDeOtroMedico() throws Exception {
        String sufijo = sufijoUnico();
        String correo = "otro." + sufijo + "@hospital.org";
        usuarios.save(new Usuario("Dr. Otro " + sufijo, correo, "otro" + sufijo,
                encoder.encode(CONTRASENA_DEMO), Rol.MEDICO, "Hospital de Pruebas"));
        return obtenerToken(correo, CONTRASENA_DEMO);
    }
}
