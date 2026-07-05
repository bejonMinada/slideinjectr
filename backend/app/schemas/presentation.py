from typing import Literal

from pydantic import BaseModel, Field


class TemplateElement(BaseModel):
    slide_index: int
    shape_id: int
    element_name: str
    element_type: str
    has_text_frame: bool = False
    has_chart: bool = False
    has_table: bool = False
    has_smartart: bool = False
    is_placeholder: bool = False
    is_mappable: bool = False
    placeholder_text: str | None = None


class AnalyzeResponse(BaseModel):
    template_name: str
    elements: list[TemplateElement]


class DataSheetInfo(BaseModel):
    sheet_name: str
    columns: list[str]
    row_count: int
    table_names: list[str] = []


class DataFileInfo(BaseModel):
    file_name: str
    file_type: Literal["csv", "xlsx", "xls"]
    sheets: list[DataSheetInfo]


class DataSourcesAnalyzeResponse(BaseModel):
    data_files: list[DataFileInfo]


class MappingRule(BaseModel):
    element_name: str = Field(description="PowerPoint shape name")
    slide_index: int = Field(description="PowerPoint slide index")
    mode: Literal["keep", "text", "manual", "table", "chart"] = Field(default="text")
    source_file: str | None = Field(default=None, description="Original uploaded data filename")
    source_sheet: str | None = Field(default=None, description="Sheet name for xlsx/xls or CSV_DATA")
    data_column: str | None = Field(default=None, description="CSV/Excel column header for text mapping")
    x_column: str | None = Field(default=None, description="Category/X-axis column for chart mapping")
    y_columns: list[str] = Field(default_factory=list, description="One or more value columns for chart series mapping")
    row_index: int = Field(default=1, ge=1, description="Data row number for text mapping (1-based)")
    manual_text: str | None = Field(default=None, description="Literal text for manual input mode")
    transform: str | None = Field(default=None, description="Optional transform expression")


class GenerateResponse(BaseModel):
    output_file: str
    message: str


class PresentationSettings(BaseModel):
    version: int = 1
    template_name: str | None = None
    data_files: list[str] = []
    mappings: list[MappingRule]


class SettingsImportResponse(BaseModel):
    template_name: str
    data_files: list[DataFileInfo]
    mappings: list[MappingRule]
