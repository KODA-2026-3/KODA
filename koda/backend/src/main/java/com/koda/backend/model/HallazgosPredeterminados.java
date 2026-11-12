package com.koda.backend.model;

import java.util.List;

/** Texto inicial de los hallazgos radiograficos segun el grado KL predicho. */
public final class HallazgosPredeterminados {

    private static final List<String> POR_GRADO = List.of(
            "Ausencia de hallazgos radiográficos de osteoartritis.",
            "Estrechamiento dudoso del espacio articular y posible formación de osteofitos, se debe de confirmar "
                    + "con radiografía lateral.",
            "Osteofitos definidos y posible estrechamiento del espacio articular, se debe de confirmar con "
                    + "radiografía lateral.",
            "Múltiples osteofitos moderados, estrechamiento definitivo del espacio articular, algo de esclerosis y "
                    + "posible deformidad de los extremos óseos.",
            "Osteofitos grandes, marcado estrechamiento del espacio articular, esclerosis severa y deformidad "
                    + "definitiva de los extremos óseos.");

    private HallazgosPredeterminados() {
    }

    public static String para(int gradoKL) {
        return POR_GRADO.get(gradoKL);
    }
}
