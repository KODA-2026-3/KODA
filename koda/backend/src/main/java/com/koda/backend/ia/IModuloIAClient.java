package com.koda.backend.ia;

import com.koda.backend.dto.ImagenPreprocesada;
import com.koda.backend.dto.PrediccionDTO;

/**
 * Contrato unico para invocar el modulo de IA (ADR-01, patron Strategy).
 *
 * El orquestador solo conoce esta interfaz, de modo que cambiar la forma de
 * invocar el modelo (microservicio REST o proceso local) no toca el resto del
 * backend. Toda implementacion debe traducir sus fallos a las mismas
 * excepciones: ImagenInvalidaException, InferenciaTimeoutException,
 * ModuloIANoDisponibleException y ModeloInferenciaException.
 */
public interface IModuloIAClient {

    PrediccionDTO solicitarInferencia(ImagenPreprocesada imagen);
}
