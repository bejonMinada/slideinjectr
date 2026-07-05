import os
import sys
from pathlib import Path
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def get_app_root() -> Path:
    """Get the application root directory, accounting for different deployment modes"""
    # PyInstaller bundled mode: sys._MEIPASS is the temp folder where files are extracted
    if hasattr(sys, '_MEIPASS'):
        return Path(sys._MEIPASS)
    
    # Development/normal mode: 3 levels up from this file
    # backend/app/core/config.py -> root
    return Path(__file__).parent.parent.parent.parent.resolve()


def resolve_data_path(relative_path: str) -> Path:
    """Convert relative path to absolute based on app root"""
    app_root = get_app_root()
    return (app_root / relative_path).resolve()


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_env: str = Field(default="development", alias="APP_ENV")
    cors_origins: list[str] = Field(default=["http://localhost:3030"], alias="CORS_ORIGINS")

    max_upload_size_mb: int = Field(default=25, alias="MAX_UPLOAD_SIZE_MB")
    temp_dir: str = Field(default="tmp/uploads", alias="TEMP_DIR")
    output_dir: str = Field(default="tmp/output", alias="OUTPUT_DIR")
    return_file_directly: bool = Field(default=True, alias="RETURN_FILE_DIRECTLY")

    allowed_template_extensions: tuple[str, ...] = (".pptx",)
    allowed_data_extensions: tuple[str, ...] = (".csv", ".xlsx", ".xls")
    
    @field_validator("temp_dir", "output_dir", mode="after")
    @classmethod
    def resolve_paths(cls, v: str) -> str:
        """Resolve relative paths to absolute paths"""
        return str(resolve_data_path(v))


settings = Settings()
