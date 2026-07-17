from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "KODA Inference Service"
    model_path: str = "saved_models/koda_kl_classifier.h5"
    image_size: int = 224
    kl_classes: int = 5  # grados 0-4 de la escala Kellgren-Lawrence

    class Config:
        env_file = ".env"


settings = Settings()
