from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


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


settings = Settings()
