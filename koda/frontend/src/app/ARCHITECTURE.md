# Estructura de la aplicacion

- `core/` contiene servicios, guards e interceptores compartidos por toda la aplicacion.
- `shared/` contiene componentes, pipes y directivas reutilizables sin logica de una feature concreta.
- `features/` agrupa las pantallas y flujos funcionales para mantener sus dependencias acotadas.

Esta separacion reduce dependencias circulares, favorece la reutilizacion y facilita el crecimiento de la aplicacion.