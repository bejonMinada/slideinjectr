from __future__ import annotations

from pathlib import Path

import yaml
from fastapi import HTTPException

from app.schemas.presentation import DataFileInfo, MappingRule, PresentationSettings


def export_settings_yaml(template_name: str, data_files: list[str], mappings: list[MappingRule]) -> str:
    settings = PresentationSettings(template_name=template_name, data_files=data_files, mappings=mappings)
    return yaml.safe_dump(settings.model_dump(mode="json", exclude_none=True), sort_keys=False)


def _find_template_element(template_elements, mapping: MappingRule):
    for element in template_elements:
        if element.slide_index == mapping.slide_index and element.element_name == mapping.element_name:
            return element
    return None


def _data_file_lookup(data_files: list[DataFileInfo]) -> dict[str, DataFileInfo]:
    return {data_file.file_name: data_file for data_file in data_files}


def parse_settings_yaml(raw_yaml: str) -> PresentationSettings:
    try:
        payload = yaml.safe_load(raw_yaml) or {}
    except yaml.YAMLError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid YAML: {exc}") from exc

    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Settings file must contain a YAML object at the top level.")

    return PresentationSettings.model_validate(payload)


def validate_and_parse_settings_yaml(
    raw_yaml: str,
    template_name: str,
    template_elements,
    data_files: list[DataFileInfo],
) -> list[MappingRule]:
    try:
        payload = yaml.safe_load(raw_yaml) or {}
    except yaml.YAMLError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid YAML: {exc}") from exc

    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Settings file must contain a YAML object at the top level.")

    imported_settings = PresentationSettings.model_validate(payload)

    if imported_settings.template_name and imported_settings.template_name != template_name:
        raise HTTPException(
            status_code=400,
            detail=f"Template name mismatch: expected '{template_name}', got '{imported_settings.template_name}'.",
        )

    uploaded_file_names = {data_file.file_name for data_file in data_files}
    imported_file_names = set(imported_settings.data_files)
    if imported_file_names and imported_file_names != uploaded_file_names:
        raise HTTPException(
            status_code=400,
            detail=(
                "Imported settings data_files do not match the uploaded files. "
                f"Uploaded={sorted(uploaded_file_names)}, Imported={sorted(imported_file_names)}"
            ),
        )

    data_file_map = _data_file_lookup(data_files)
    max_slide_index = max((element.slide_index for element in template_elements), default=-1)
    validated_rules: list[MappingRule] = []

    for mapping in imported_settings.mappings:
        rule = MappingRule.model_validate(mapping)

        if rule.slide_index < 0 or rule.slide_index > max_slide_index:
            raise HTTPException(
                status_code=400,
                detail=f"Mapping '{rule.element_name}' references invalid slide index {rule.slide_index}.",
            )

        element = _find_template_element(template_elements, rule)
        if element is None:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Mapping '{rule.element_name}' on slide {rule.slide_index + 1} does not match any element in the template."
                ),
            )

        if element.has_smartart and rule.mode != "keep":
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Mapping '{rule.element_name}' targets SmartArt. SmartArt is detected but not supported for mapping in this tool."
                ),
            )

        if rule.mode == "keep":
            validated_rules.append(rule)
            continue

        if rule.mode == "manual":
            if not rule.manual_text:
                raise HTTPException(
                    status_code=400,
                    detail=f"Manual input for '{rule.element_name}' must include manual_text.",
                )
            if not element.has_text_frame:
                raise HTTPException(
                    status_code=400,
                    detail=f"Manual input is only allowed for text-capable elements: '{rule.element_name}'.",
                )
            validated_rules.append(rule)
            continue

        if not rule.source_file or rule.source_file not in data_file_map:
            raise HTTPException(
                status_code=400,
                detail=f"Mapping '{rule.element_name}' must reference one of the uploaded data files.",
            )

        if not rule.source_sheet:
            raise HTTPException(
                status_code=400,
                detail=f"Mapping '{rule.element_name}' must include a source_sheet.",
            )

        selected_file = data_file_map[rule.source_file]
        selected_sheet = next((sheet for sheet in selected_file.sheets if sheet.sheet_name == rule.source_sheet), None)
        if selected_sheet is None:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Mapping '{rule.element_name}' references missing sheet '{rule.source_sheet}' "
                    f"in file '{rule.source_file}'."
                ),
            )

        if rule.mode == "text":
            if not element.has_text_frame:
                raise HTTPException(
                    status_code=400,
                    detail=f"Text mapping is only allowed for text-capable elements: '{rule.element_name}'.",
                )
            if not rule.data_column or rule.data_column not in selected_sheet.columns:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Mapping '{rule.element_name}' must reference a valid data_column from the selected sheet."
                    ),
                )
        elif rule.mode == "table":
            if not element.has_table:
                raise HTTPException(
                    status_code=400,
                    detail=f"Table mapping is only allowed for table elements: '{rule.element_name}'.",
                )
        elif rule.mode == "chart":
            if not element.has_chart:
                raise HTTPException(
                    status_code=400,
                    detail=f"Chart mapping is only allowed for chart elements: '{rule.element_name}'.",
                )
            if rule.x_column and rule.x_column not in selected_sheet.columns:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Mapping '{rule.element_name}' references missing x_column '{rule.x_column}' "
                        f"in sheet '{rule.source_sheet}'."
                    ),
                )
            if rule.y_columns:
                missing = [column for column in rule.y_columns if column not in selected_sheet.columns]
                if missing:
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            f"Mapping '{rule.element_name}' references missing y_columns {missing} "
                            f"in sheet '{rule.source_sheet}'."
                        ),
                    )
                x_column = rule.x_column or selected_sheet.columns[0]
                valid_series = [column for column in rule.y_columns if column != x_column]
                if not valid_series:
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            f"Mapping '{rule.element_name}' must include at least one y_columns value "
                            "different from the x_column."
                        ),
                    )

        validated_rules.append(rule)

    return validated_rules
