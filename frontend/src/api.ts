import type { DataFileInfo, MappingRule, PresentationSettings, SettingsImportResponse, TemplateElement } from "./types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export async function analyzeTemplate(templateFile: File): Promise<TemplateElement[]> {
  const form = new FormData();
  form.append("template", templateFile);

  const res = await fetch(`${API_BASE}/api/v1/templates/analyze`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const data = await res.json();
  return data.elements as TemplateElement[];
}

export async function previewTemplate(templateFile: File, timeoutMs = 20000): Promise<Blob> {
  const form = new FormData();
  form.append("template", templateFile);

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${API_BASE}/api/v1/templates/preview`, {
      method: "POST",
      body: form,
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(await res.text());
    }

    return await res.blob();
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Preview timed out. The PowerPoint can still be mapped and generated normally.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function previewGeneratedPresentation(
  templateFile: File,
  dataFiles: File[],
  mappingRules: MappingRule[],
  outputSubdir?: string,
  timeoutMs = 30000
): Promise<Blob> {
  const form = new FormData();
  form.append("template", templateFile);
  for (const file of dataFiles) {
    form.append("data_files", file);
  }
  form.append("mapping_json", JSON.stringify(mappingRules));
  if (outputSubdir) {
    form.append("output_subdir", outputSubdir);
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${API_BASE}/api/v1/presentations/preview`, {
      method: "POST",
      body: form,
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(await res.text());
    }

    return await res.blob();
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Preview timed out. You can still generate and download the presentation.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function analyzeDataSources(dataFiles: File[]): Promise<DataFileInfo[]> {
  const form = new FormData();
  for (const file of dataFiles) {
    form.append("data_files", file);
  }

  const res = await fetch(`${API_BASE}/api/v1/data-sources/analyze`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const data = await res.json();
  return data.data_files as DataFileInfo[];
}

export async function generatePresentation(
  templateFile: File,
  dataFiles: File[],
  mappingRules: MappingRule[],
  options?: { outputSubdir?: string; returnFile?: boolean }
): Promise<Blob | { output_file: string; message: string }> {
  const form = new FormData();
  form.append("template", templateFile);
  for (const file of dataFiles) {
    form.append("data_files", file);
  }
  form.append("mapping_json", JSON.stringify(mappingRules));
  if (options?.outputSubdir) {
    form.append("output_subdir", options.outputSubdir);
  }
  if (typeof options?.returnFile === "boolean") {
    form.append("return_file", String(options.returnFile));
  }

  const res = await fetch(`${API_BASE}/api/v1/presentations/generate`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return (await res.json()) as { output_file: string; message: string };
  }

  return await res.blob();
}

export async function exportSettings(
  templateFile: File,
  dataFiles: File[],
  mappingRules: MappingRule[]
): Promise<Blob> {
  const form = new FormData();
  form.append("template", templateFile);
  for (const file of dataFiles) {
    form.append("data_files", file);
  }
  form.append("mapping_json", JSON.stringify(mappingRules));

  const res = await fetch(`${API_BASE}/api/v1/settings/export`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return await res.blob();
}

export async function importSettings(
  settingsFile: File
): Promise<PresentationSettings> {
  const form = new FormData();
  form.append("settings_file", settingsFile);

  const res = await fetch(`${API_BASE}/api/v1/settings/parse`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return (await res.json()) as PresentationSettings;
}

export async function importSettingsStrict(
  templateFile: File,
  dataFiles: File[],
  settingsFile: File
): Promise<SettingsImportResponse> {
  const form = new FormData();
  form.append("template", templateFile);
  form.append("settings_file", settingsFile);
  for (const file of dataFiles) {
    form.append("data_files", file);
  }

  const res = await fetch(`${API_BASE}/api/v1/settings/import`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return (await res.json()) as SettingsImportResponse;
}
