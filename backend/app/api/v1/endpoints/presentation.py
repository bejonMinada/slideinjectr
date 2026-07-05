import json
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, Response

from app.core.config import settings
from app.schemas.presentation import (
    AnalyzeResponse,
    DataSourcesAnalyzeResponse,
    GenerateResponse,
    MappingRule,
    PresentationSettings,
    SettingsImportResponse,
)
from app.services.data_source_analyzer import analyze_data_file
from app.services.file_guard import ensure_allowed_file, persist_upload
from app.services.generation_engine import apply_mapping_to_template
from app.services.settings_service import export_settings_yaml, parse_settings_yaml, validate_and_parse_settings_yaml
from app.services.template_analyzer import analyze_template
from app.services.template_preview import render_template_preview

router = APIRouter()


def _resolve_output_dir(output_subdir: str | None) -> Path:
    base_dir = Path(settings.output_dir)
    if not output_subdir:
        base_dir.mkdir(parents=True, exist_ok=True)
        return base_dir

    cleaned = output_subdir.strip().replace("\\", "/")
    if not cleaned:
        raise HTTPException(status_code=400, detail="Output directory cannot be empty.")

    target = (base_dir / cleaned).resolve()
    base_resolved = base_dir.resolve()
    if base_resolved != target and base_resolved not in target.parents:
        raise HTTPException(status_code=400, detail="Output directory must be inside the configured output root.")

    target.mkdir(parents=True, exist_ok=True)
    return target


@router.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/templates/analyze", response_model=AnalyzeResponse)
async def analyze_template_file(template: UploadFile = File(...)) -> AnalyzeResponse:
    ensure_allowed_file(template.filename or "", settings.allowed_template_extensions)

    template_path = await persist_upload(template, settings.temp_dir, settings.max_upload_size_mb)
    elements = analyze_template(template_path)
    return AnalyzeResponse(template_name=template.filename or template_path.name, elements=elements)


@router.post("/templates/preview")
async def preview_template_file(template: UploadFile = File(...)) -> FileResponse:
    ensure_allowed_file(template.filename or "", settings.allowed_template_extensions)

    preview_temp_dir = Path(tempfile.gettempdir()) / "slideinjectr-preview-input"
    preview_output_dir = Path(tempfile.gettempdir()) / "slideinjectr-preview-output"
    template_path = await persist_upload(template, str(preview_temp_dir), settings.max_upload_size_mb)
    preview_path = render_template_preview(template_path, preview_output_dir)
    return FileResponse(path=preview_path, filename=preview_path.name, media_type="application/pdf")


@router.post("/data-sources/analyze", response_model=DataSourcesAnalyzeResponse)
async def analyze_data_sources(data_files: list[UploadFile] = File(...)) -> DataSourcesAnalyzeResponse:
    file_infos = []
    for data_file in data_files:
        original_name = data_file.filename or "uploaded-data"
        ensure_allowed_file(original_name, settings.allowed_data_extensions)
        data_path = await persist_upload(data_file, settings.temp_dir, settings.max_upload_size_mb)
        file_infos.append(analyze_data_file(file_name=original_name, path=data_path))

    return DataSourcesAnalyzeResponse(data_files=file_infos)


@router.post("/presentations/generate", response_model=GenerateResponse)
async def generate_presentation(
    template: UploadFile = File(...),
    data_files: list[UploadFile] = File(...),
    mapping_json: str = Form(...),
    output_subdir: str | None = Form(default=None),
    return_file: bool = Form(default=True),
) -> GenerateResponse | FileResponse:
    ensure_allowed_file(template.filename or "", settings.allowed_template_extensions)
    if not data_files:
        raise HTTPException(status_code=400, detail="At least one data file is required.")

    try:
        mapping_payload = json.loads(mapping_json)
        mapping_rules = [MappingRule.model_validate(rule) for rule in mapping_payload]
    except (json.JSONDecodeError, TypeError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=f"Invalid mapping_json payload: {exc}") from exc

    template_path = await persist_upload(template, settings.temp_dir, settings.max_upload_size_mb)

    data_sources: dict[str, Path] = {}
    for data_file in data_files:
        original_name = data_file.filename or "uploaded-data"
        ensure_allowed_file(original_name, settings.allowed_data_extensions)
        persisted_path = await persist_upload(data_file, settings.temp_dir, settings.max_upload_size_mb)
        data_sources[original_name] = persisted_path

    output_path = apply_mapping_to_template(
        template_path=template_path,
        data_sources=data_sources,
        mapping_rules=mapping_rules,
        output_dir=_resolve_output_dir(output_subdir),
    )

    if settings.return_file_directly and return_file:
        return FileResponse(
            path=output_path,
            filename=output_path.name,
            media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        )

    if output_subdir:
        normalized = output_subdir.strip().replace("\\", "/").strip("/")
        output_file = f"generated/{normalized}/{output_path.name}"
    else:
        output_file = output_path.name

    return GenerateResponse(
        output_file=output_file,
        message="Presentation generated successfully.",
    )


@router.post("/presentations/preview")
async def preview_generated_presentation(
    template: UploadFile = File(...),
    data_files: list[UploadFile] = File(...),
    mapping_json: str = Form(...),
    output_subdir: str | None = Form(default=None),
) -> FileResponse:
    ensure_allowed_file(template.filename or "", settings.allowed_template_extensions)
    if not data_files:
        raise HTTPException(status_code=400, detail="At least one data file is required.")

    try:
        mapping_payload = json.loads(mapping_json)
        mapping_rules = [MappingRule.model_validate(rule) for rule in mapping_payload]
    except (json.JSONDecodeError, TypeError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=f"Invalid mapping_json payload: {exc}") from exc

    preview_temp_dir = Path(tempfile.gettempdir()) / "slideinjectr-preview-generated"
    preview_output_dir = _resolve_output_dir(output_subdir)

    template_path = await persist_upload(template, str(preview_temp_dir), settings.max_upload_size_mb)

    data_sources: dict[str, Path] = {}
    for data_file in data_files:
        original_name = data_file.filename or "uploaded-data"
        ensure_allowed_file(original_name, settings.allowed_data_extensions)
        persisted_path = await persist_upload(data_file, str(preview_temp_dir), settings.max_upload_size_mb)
        data_sources[original_name] = persisted_path

    generated_path = apply_mapping_to_template(
        template_path=template_path,
        data_sources=data_sources,
        mapping_rules=mapping_rules,
        output_dir=preview_temp_dir,
    )
    preview_path = render_template_preview(generated_path, preview_output_dir)
    return FileResponse(path=preview_path, filename=preview_path.name, media_type="application/pdf")


@router.post("/settings/export")
async def export_settings(
    template: UploadFile = File(...),
    data_files: list[UploadFile] = File(...),
    mapping_json: str = Form(...),
):
    ensure_allowed_file(template.filename or "", settings.allowed_template_extensions)
    if not data_files:
        raise HTTPException(status_code=400, detail="At least one data file is required.")

    try:
        mapping_payload = json.loads(mapping_json)
        mapping_rules = [MappingRule.model_validate(rule) for rule in mapping_payload]
    except (json.JSONDecodeError, TypeError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=f"Invalid mapping_json payload: {exc}") from exc

    yaml_text = export_settings_yaml(
        template_name=template.filename or "template.pptx",
        data_files=[data_file.filename or "uploaded-data" for data_file in data_files],
        mappings=mapping_rules,
    )
    return Response(
        content=yaml_text,
        media_type="application/x-yaml",
        headers={"Content-Disposition": 'attachment; filename="presentation-settings.yaml"'},
    )


@router.post("/settings/parse", response_model=PresentationSettings)
async def parse_settings(settings_file: UploadFile = File(...)) -> PresentationSettings:
    original_name = settings_file.filename or "presentation-settings.yaml"
    ensure_allowed_file(original_name, (".yaml", ".yml"))
    raw_yaml = (await settings_file.read()).decode("utf-8")
    return parse_settings_yaml(raw_yaml)


@router.post("/settings/import", response_model=SettingsImportResponse)
async def import_settings(
    template: UploadFile = File(...),
    data_files: list[UploadFile] = File(...),
    settings_file: UploadFile = File(...),
) -> SettingsImportResponse:
    ensure_allowed_file(template.filename or "", settings.allowed_template_extensions)
    if not data_files:
        raise HTTPException(status_code=400, detail="At least one data file is required.")

    template_path = await persist_upload(template, settings.temp_dir, settings.max_upload_size_mb)
    template_elements = analyze_template(template_path)

    analyzed_data_files = []
    for data_file in data_files:
        original_name = data_file.filename or "uploaded-data"
        ensure_allowed_file(original_name, settings.allowed_data_extensions)
        data_path = await persist_upload(data_file, settings.temp_dir, settings.max_upload_size_mb)
        analyzed_data_files.append(analyze_data_file(file_name=original_name, path=data_path))

    yaml_text = (await settings_file.read()).decode("utf-8")
    validated_mappings = validate_and_parse_settings_yaml(
        raw_yaml=yaml_text,
        template_name=template.filename or template_path.name,
        template_elements=template_elements,
        data_files=analyzed_data_files,
    )

    return SettingsImportResponse(
        template_name=template.filename or template_path.name,
        data_files=analyzed_data_files,
        mappings=validated_mappings,
    )
