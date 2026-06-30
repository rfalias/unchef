import json

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    DATABASE_URL: str = "sqlite+aiosqlite:///./food_app.db"
    # Accepts a JSON array OR a comma-separated string:
    #   CORS_ORIGINS=https://chef.example.com,https://app.example.com
    #   CORS_ORIGINS=["https://chef.example.com"]
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"
    JWT_SECRET: str = "change-me-in-production-use-a-long-random-string"
    JWT_LIFETIME_SECONDS: int = 60 * 60 * 24 * 30  # 30 days

    @property
    def cors_origins_list(self) -> list[str]:
        v = self.CORS_ORIGINS.strip()
        if v.startswith("["):
            return json.loads(v)
        return [o.strip() for o in v.split(",") if o.strip()]


settings = Settings()
