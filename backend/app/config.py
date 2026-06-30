from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    DATABASE_URL: str = "sqlite+aiosqlite:///./food_app.db"
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    JWT_SECRET: str = "change-me-in-production-use-a-long-random-string"
    JWT_LIFETIME_SECONDS: int = 60 * 60 * 24 * 30  # 30 days


settings = Settings()
