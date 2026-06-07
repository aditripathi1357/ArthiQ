"""
Application configuration using pydantic-settings.
All sensitive values are loaded from environment variables.
"""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central application settings — loaded from .env file or environment."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # ── App ──────────────────────────────────────────────────────────────
    APP_NAME: str = "Arthiq Intelligence Platform"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"  # development | staging | production

    # ── Server ───────────────────────────────────────────────────────────
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173"]
    FRONTEND_URL: str = "http://localhost:5173"  # Override with prod URL e.g. https://arthiq.com

    # ── Database (PostgreSQL + TimescaleDB) ──────────────────────────────
    POSTGRES_USER: str = "smartfin"
    POSTGRES_PASSWORD: str = "changeme"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "smartfin_db"

    @property
    def DATABASE_URL(self) -> str:
        """Async database URL for asyncpg driver."""
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def DATABASE_URL_SYNC(self) -> str:
        """Sync database URL for Alembic migrations."""
        return (
            f"postgresql+psycopg2://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    # ── External APIs ────────────────────────────────────────────────────
    OPENAI_API_KEY: str = ""
    ALPHA_VANTAGE_API_KEY: str = ""
    NEWS_API_KEY: str = ""
    EXCHANGE_RATE_API_KEY: str = ""
    GROQ_API_KEY: str = ""  # Free AI — get at console.groq.com

    # ── Scheduler ────────────────────────────────────────────────────────
    STOCK_FETCH_INTERVAL_MINUTES: int = 5
    NEWS_FETCH_INTERVAL_MINUTES: int = 15
    FOREX_FETCH_INTERVAL_MINUTES: int = 30

    # ── Redis (optional – for caching / task queue) ──────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ── Email Settings (SMTP) ────────────────────────────────────────────
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = "alerts@arthiq.com"

    # ── WhatsApp (Twilio Sandbox) ─────────────────────────────────────────
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_WHATSAPP_FROM: str = "whatsapp:+14155238886"  # Twilio sandbox number

    # ── Notification Scheduler ────────────────────────────────────────────
    RESEARCH_REPORT_INTERVAL_HOURS: int = 6   # How often to refresh AI reports
    DAILY_DIGEST_HOUR_IST: int = 8            # IST hour to send daily digests


@lru_cache()
def get_settings() -> Settings:
    """Cached settings instance — call this everywhere."""
    return Settings()
