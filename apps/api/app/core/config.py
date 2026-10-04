from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"

    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_storage_bucket_receipts: str = "receipts"
    supabase_storage_bucket_memories: str = "memories"

    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.5-flash-lite"

    cors_origins: str = "http://localhost:8081"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
