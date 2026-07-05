export interface TemplateElement {
  slide_index: number;
  shape_id: number;
  element_name: string;
  element_type: string;
  has_text_frame: boolean;
  has_chart: boolean;
  has_table: boolean;
  has_smartart: boolean;
  is_placeholder: boolean;
  is_mappable: boolean;
  placeholder_text?: string | null;
}

export interface MappingRule {
  element_name: string;
  slide_index: number;
  mode: "keep" | "text" | "manual" | "table" | "chart";
  source_file?: string;
  source_sheet?: string;
  data_column?: string;
  x_column?: string;
  y_columns?: string[];
  row_index?: number;
  manual_text?: string;
}

export interface DataSheetInfo {
  sheet_name: string;
  columns: string[];
  row_count: number;
  table_names: string[];
}

export interface DataFileInfo {
  file_name: string;
  file_type: "csv" | "xlsx" | "xls";
  sheets: DataSheetInfo[];
}

export interface PresentationSettings {
  version: number;
  template_name?: string;
  data_files: string[];
  mappings: MappingRule[];
}

export interface SettingsImportResponse {
  template_name: string;
  data_files: DataFileInfo[];
  mappings: MappingRule[];
}
