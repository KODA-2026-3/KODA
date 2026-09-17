from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuracion del servicio, sobreescribible con variables KODA_*."""

    model_config = SettingsConfigDict(env_prefix="KODA_", env_file=".env", extra="ignore")

    app_name: str = "KODA Inference Service"

    # Clasificador activo: "simulado" (no ejecuta ningun modelo real) o "diko".
    modelo: str = "simulado"
    # Archivo de solo pesos generado con scripts/convertir_diko.py.
    ruta_modelo: str = "saved_models/diko_stage2_pesos.pt"

    # Validaciones de entrada (RF-02 / RF-17 del SRS)
    tamano_maximo_mb: int = 10
    lado_minimo_px: int = 64
    # Desviacion estandar minima en escala de grises: por debajo la imagen se
    # considera uniforme (en negro, en blanco o vacia) y no se analiza.
    desviacion_minima: float = 2.0

    # El mapa de calor se reduce a este lado maximo para no enviar varios MB de
    # Base64 por cada analisis (RD-03: respuesta en menos de 30 segundos).
    lado_maximo_heatmap_px: int = 1024


settings = Settings()
