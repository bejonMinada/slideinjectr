import { useMemo, useRef, useState } from "react";
import { getDocument, type PDFDocumentProxy } from "pdfjs-dist/webpack.mjs";

import {
  analyzeDataSources,
  analyzeTemplate,
  exportSettings,
  generatePresentation,
  importSettings,
  previewGeneratedPresentation,
} from "./api";
import type { DataFileInfo, MappingRule, PresentationSettings, TemplateElement } from "./types";

interface MappingChoice {
  mode: "keep" | "text" | "manual" | "table" | "chart";
  source_file?: string;
  source_sheet?: string;
  data_column?: string;
  x_column?: string;
  y_columns: string[];
  row_index: number;
  manual_text?: string;
}

interface ValidationState {
  tone: "idle" | "ready" | "warning" | "error";
  message: string;
}

interface DirectoryHandleLike {
  name: string;
}

interface DirectoryPickerWindow extends Window {
  showDirectoryPicker?: () => Promise<DirectoryHandleLike>;
}

interface FilePickerCardProps {
  accept: string;
  title: string;
  subtitle: string;
  selectedLabel: string;
  multiple?: boolean;
  hasSelection: boolean;
  disabled?: boolean;
  onBrowse: (files: FileList | null) => void;
  onDrop: (files: FileList | null) => void;
  onRemove?: () => void;
}

function elementKey(element: TemplateElement): string {
  return `${element.slide_index}:${element.shape_id}:${element.element_name}`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function FilePickerCard({
  accept,
  title,
  subtitle,
  selectedLabel,
  multiple = false,
  hasSelection,
  disabled = false,
  onBrowse,
  onDrop,
  onRemove,
}: FilePickerCardProps) {
  const darkMode = localStorage.getItem("darkMode") ? JSON.parse(localStorage.getItem("darkMode")!) : false;

  return (
    <div
      className={`mt-2 rounded-2xl border-2 border-dashed p-4 transition-colors ${
        hasSelection
          ? darkMode ? "border-emerald-900 bg-emerald-950/50" : "border-emerald-300 bg-emerald-50/80"
          : darkMode ? "border-slate-600 bg-slate-800/50 hover:border-slate-500 hover:bg-slate-700/50" : "border-slate-300 bg-slate-50 hover:border-brand-mint hover:bg-white"
      } ${disabled ? "pointer-events-none opacity-55" : ""}`}
      onDragOver={(e) => {
        if (disabled) {
          return;
        }
        e.preventDefault();
      }}
      onDrop={(e) => {
        if (disabled) {
          return;
        }
        e.preventDefault();
        onDrop(e.dataTransfer.files);
      }}
    >
      <label className={`block ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}>
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          className="sr-only"
          onChange={(e) => {
            onBrowse(e.target.files);
            e.currentTarget.value = "";
          }}
        />
        <div className="flex items-start gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl font-black ${
            darkMode ? "bg-slate-700 text-amber-400" : "bg-brand-sun text-brand-ink"
          }`}>
            +
          </div>
          <div>
            <p className={`font-semibold ${darkMode ? "text-slate-200" : "text-slate-800"}`}>{title}</p>
            <p className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-600"}`}>{subtitle}</p>
            <p className={`mt-1 text-xs ${darkMode ? "text-slate-500" : "text-slate-500"}`}>{selectedLabel}</p>
          </div>
        </div>
      </label>
      {hasSelection && onRemove ? (
        <button
          type="button"
          disabled={disabled}
          className={`mt-3 rounded-lg border px-3 py-1 text-xs font-semibold transition-colors ${darkMode ? "border-rose-900 bg-rose-950/50 text-rose-400 hover:bg-rose-900/50" : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"}`}
          onClick={onRemove}
        >
          Remove Attached File
        </button>
      ) : null}
    </div>
  );
}

function FolderPickerCard({
  title,
  subtitle,
  selectedLabel,
  hasSelection,
  disabled = false,
  onBrowse,
  onRemove,
}: {
  title: string;
  subtitle: string;
  selectedLabel: string;
  hasSelection: boolean;
  disabled?: boolean;
  onBrowse: () => void;
  onRemove?: () => void;
}) {
  const darkMode = localStorage.getItem("darkMode") ? JSON.parse(localStorage.getItem("darkMode")!) : false;

  return (
    <div
      className={`mt-2 rounded-2xl border-2 border-dashed p-4 transition-colors ${
        hasSelection
          ? darkMode ? "border-emerald-900 bg-emerald-950/50" : "border-emerald-300 bg-emerald-50/80"
          : darkMode ? "border-slate-600 bg-slate-800/50 hover:border-slate-500 hover:bg-slate-700/50" : "border-slate-300 bg-slate-50 hover:border-brand-mint hover:bg-white"
      } ${disabled ? "pointer-events-none opacity-55" : ""}`}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={onBrowse}
        className={`block w-full text-left ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
      >
        <div className="flex items-start gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-semibold ${
            darkMode ? "bg-slate-700 text-amber-400" : "bg-brand-sun text-brand-ink"
          }`}>
            🔍
          </div>
          <div>
            <p className={`font-semibold ${darkMode ? "text-slate-200" : "text-slate-800"}`}>{title}</p>
            <p className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-600"}`}>{subtitle}</p>
            <p className={`mt-1 text-xs ${darkMode ? "text-slate-500" : "text-slate-500"}`}>{selectedLabel}</p>
          </div>
        </div>
      </button>
      {hasSelection && onRemove ? (
        <button
          type="button"
          disabled={disabled}
          className={`mt-3 rounded-lg border px-3 py-1 text-xs font-semibold transition-colors ${darkMode ? "border-rose-900 bg-rose-950/50 text-rose-400 hover:bg-rose-900/50" : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"}`}
          onClick={onRemove}
        >
          Deselect Folder
        </button>
      ) : null}
    </div>
  );
}

function buildImportedMappingState(settings: PresentationSettings, availableElements: TemplateElement[]): Record<string, MappingChoice> {
  const nextMapping: Record<string, MappingChoice> = {};

  for (const rule of settings.mappings) {
    const element = availableElements.find(
      (candidate) => candidate.slide_index === rule.slide_index && candidate.element_name === rule.element_name
    );
    if (!element) {
      continue;
    }

    nextMapping[elementKey(element)] = {
      mode: rule.mode,
      source_file: rule.source_file,
      source_sheet: rule.source_sheet,
      data_column: rule.data_column,
      x_column: rule.x_column,
      y_columns: rule.y_columns ?? [],
      row_index: rule.row_index ?? 1,
      manual_text: rule.manual_text,
    };
  }

  return nextMapping;
}

function compareImportedSettings(
  settings: PresentationSettings | null,
  templateFile: File | null,
  elements: TemplateElement[],
  dataSources: DataFileInfo[]
): ValidationState {
  if (!settings) {
    return { tone: "idle", message: "" };
  }

  if (elements.length === 0 || dataSources.length === 0 || !templateFile) {
    return {
      tone: "warning",
      message: "Imported settings loaded. Upload a template and data files, then run analysis to validate them.",
    };
  }

  if (settings.template_name && settings.template_name !== templateFile.name) {
    return {
      tone: "error",
      message: `Template name mismatch: saved settings expect ${settings.template_name}, but the uploaded file is ${templateFile.name}.`,
    };
  }

  const uploadedDataFiles = dataSources.map((file) => file.file_name).sort();
  const savedDataFiles = [...settings.data_files].sort();
  if (savedDataFiles.length > 0 && JSON.stringify(savedDataFiles) !== JSON.stringify(uploadedDataFiles)) {
    return {
      tone: "error",
      message: `Data file mismatch: saved settings expect ${savedDataFiles.join(", ")}, but the current upload is ${uploadedDataFiles.join(", ")}.`,
    };
  }

  const elementLookup = new Map(elements.map((element) => [`${element.slide_index}:${element.element_name}`, element]));

  for (const rule of settings.mappings) {
    const element = elementLookup.get(`${rule.slide_index}:${rule.element_name}`);
    if (!element) {
      return {
        tone: "error",
        message: `Slide ${rule.slide_index + 1}: ${rule.element_name} was not found in the current PowerPoint.`,
      };
    }

    if (element.has_smartart && rule.mode !== "keep") {
      return {
        tone: "error",
        message: `Slide ${rule.slide_index + 1}: ${rule.element_name} is SmartArt. SmartArt is not supported in this tool and must be edited manually in PowerPoint.`,
      };
    }

    if (rule.mode === "keep" || rule.mode === "manual") {
      continue;
    }

    const sourceFile = dataSources.find((file) => file.file_name === rule.source_file);
    if (!sourceFile) {
      return {
        tone: "error",
        message: `Slide ${rule.slide_index + 1}: data file ${rule.source_file ?? "unknown"} was not found.`,
      };
    }

    const sourceSheet = sourceFile.sheets.find((sheet) => sheet.sheet_name === rule.source_sheet);
    if (!sourceSheet) {
      return {
        tone: "error",
        message: `Slide ${rule.slide_index + 1}: sheet ${rule.source_sheet ?? "unknown"} was not found in ${sourceFile.file_name}.`,
      };
    }

    if (rule.mode === "text" && rule.data_column && !sourceSheet.columns.includes(rule.data_column)) {
      return {
        tone: "error",
        message: `Slide ${rule.slide_index + 1}: column ${rule.data_column} is missing, so the saved text mapping is incompatible.`,
      };
    }

    if (rule.mode === "chart") {
      if (rule.x_column && !sourceSheet.columns.includes(rule.x_column)) {
        return {
          tone: "error",
          message: `Slide ${rule.slide_index + 1}: chart x-column ${rule.x_column} is missing in the selected sheet.`,
        };
      }

      if (rule.y_columns?.some((column) => !sourceSheet.columns.includes(column))) {
        return {
          tone: "error",
          message: `Slide ${rule.slide_index + 1}: one or more chart y-series columns are missing in the selected sheet.`,
        };
      }
    }
  }

  return {
    tone: "ready",
    message: `Imported settings match the current PowerPoint and data files. ${settings.mappings.length} mapping(s) are ready.`,
  };
}

export function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : false;
  });

  const toggleDarkMode = () => {
    setDarkMode((prev: boolean) => {
      const next = !prev;
      localStorage.setItem("darkMode", JSON.stringify(next));
      return next;
    });
  };

  const [projectDirectory, setProjectDirectory] = useState("");
  const folderPickerRef = useRef<HTMLInputElement | null>(null);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [dataFiles, setDataFiles] = useState<File[]>([]);
  const [settingsFile, setSettingsFile] = useState<File | null>(null);

  const [elements, setElements] = useState<TemplateElement[]>([]);
  const [dataSources, setDataSources] = useState<DataFileInfo[]>([]);
  const [mapping, setMapping] = useState<Record<string, MappingChoice>>({});
  const [importedSettings, setImportedSettings] = useState<PresentationSettings | null>(null);

  const [previewDocument, setPreviewDocument] = useState<PDFDocumentProxy | null>(null);
  const [previewImageData, setPreviewImageData] = useState<string | null>(null);
  const [previewPageCount, setPreviewPageCount] = useState(0);
  const [previewError, setPreviewError] = useState("");
  const [previewPage, setPreviewPage] = useState(1);

  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const dataFileOptions = useMemo(() => dataSources.map((source) => source.file_name), [dataSources]);
  const detectedSlideButtons = useMemo(() => {
    const maxSlide = elements.reduce((max, element) => Math.max(max, element.slide_index + 1), 0);
    return maxSlide === 0 ? [] : Array.from({ length: maxSlide }, (_, index) => index + 1);
  }, [elements]);
  const previewSlideButtons = useMemo(() => {
    if (previewPageCount > 0) {
      return Array.from({ length: previewPageCount }, (_, index) => index + 1);
    }
    return detectedSlideButtons;
  }, [previewPageCount, detectedSlideButtons]);
  const settingsValidation = compareImportedSettings(importedSettings, templateFile, elements, dataSources);

  function defaultMapping(element: TemplateElement): MappingChoice {
    if (element.has_smartart) {
      return {
        mode: "keep",
        y_columns: [],
        row_index: 1,
      };
    }

    return {
      mode: element.has_table ? "table" : element.has_chart ? "chart" : "text",
      y_columns: [],
      row_index: 1,
    };
  }

  function selectedOutputSubdir(): string | null {
    const normalized = projectDirectory.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
    if (!normalized) {
      return null;
    }
    return normalized;
  }

  const outputSubdir = selectedOutputSubdir();
  const directoryReady = !!outputSubdir;

  function onBrowseProjectDirectory(files: FileList | null) {
    const first = files?.[0];
    if (!first) {
      return;
    }

    const relativePath = (first as File & { webkitRelativePath?: string }).webkitRelativePath || "";
    const firstFolder = relativePath.split("/")[0]?.trim();
    if (firstFolder) {
      setProjectDirectory(firstFolder);
      return;
    }

    const fallback = first.name.replace(/\.[^.]+$/, "").trim();
    if (fallback) {
      setProjectDirectory(fallback);
    }
  }

  async function onPickProjectDirectory() {
    const pickerWindow = window as DirectoryPickerWindow;
    if (typeof pickerWindow.showDirectoryPicker === "function") {
      try {
        const directoryHandle = await pickerWindow.showDirectoryPicker();
        const folderName = directoryHandle.name?.trim();
        if (folderName) {
          setProjectDirectory(folderName);
        }
      } catch (error) {
        const maybeDomError = error as DOMException;
        if (maybeDomError.name !== "AbortError") {
          setMessage(`Folder selection failed: ${(error as Error).message}`);
        }
      }
      return;
    }

    // Fallback for browsers without showDirectoryPicker.
    folderPickerRef.current?.click();
  }

  function resetSession() {
    setProjectDirectory("");
    setTemplateFile(null);
    setDataFiles([]);
    setSettingsFile(null);
    setElements([]);
    setDataSources([]);
    setMapping({});
    setImportedSettings(null);
    setPreviewDocument(null);
    setPreviewImageData(null);
    setPreviewPageCount(0);
    setPreviewError("");
    setPreviewPage(1);
    setMessage("Session reset. You can start another project without refreshing.");
  }

  async function renderPreviewPageImage(pdfDocument: PDFDocumentProxy, pageNumber: number) {
    const page = await pdfDocument.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.25 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas context is unavailable for preview rendering.");
    }

    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvas, canvasContext: context, viewport }).promise;
    setPreviewImageData(canvas.toDataURL("image/png"));
  }

  async function onSelectPreviewPage(pageNumber: number) {
    if (!previewDocument) {
      return;
    }
    setPreviewPage(pageNumber);
    try {
      await renderPreviewPageImage(previewDocument, pageNumber);
    } catch (error) {
      setPreviewError(`Preview page rendering failed: ${(error as Error).message}`);
    }
  }

  function availableSheets(fileName?: string): string[] {
    if (!fileName) {
      return [];
    }
    const dataFile = dataSources.find((source) => source.file_name === fileName);
    return dataFile?.sheets.map((sheet) => sheet.sheet_name) ?? [];
  }

  function availableColumns(fileName?: string, sheetName?: string): string[] {
    if (!fileName || !sheetName) {
      return [];
    }
    const dataFile = dataSources.find((source) => source.file_name === fileName);
    const sheet = dataFile?.sheets.find((entry) => entry.sheet_name === sheetName);
    return sheet?.columns ?? [];
  }

  function getChoice(element: TemplateElement): MappingChoice {
    return mapping[elementKey(element)] ?? defaultMapping(element);
  }

  function updateChoice(element: TemplateElement, patch: Partial<MappingChoice>) {
    const key = elementKey(element);
    setMapping((prev) => ({
      ...prev,
      [key]: {
        ...getChoice(element),
        ...patch,
      },
    }));
  }

  function setDataFilesFromList(files: FileList | null) {
    if (!files) {
      return;
    }
    setDataFiles(Array.from(files));
  }

  function removeDataFile(fileName: string) {
    setDataFiles((prev) => prev.filter((file) => file.name !== fileName));
  }

  function toMappingRules(includeKeep = true): MappingRule[] {
    const rules: MappingRule[] = [];

    for (const element of elements) {
      const choice = getChoice(element);
      if (!includeKeep && choice.mode === "keep") {
        continue;
      }

      rules.push({
        element_name: element.element_name,
        slide_index: element.slide_index,
        mode: choice.mode,
        source_file: choice.source_file,
        source_sheet: choice.source_sheet,
        data_column: choice.data_column,
        x_column: choice.x_column,
        y_columns: choice.y_columns,
        row_index: choice.row_index,
        manual_text: choice.manual_text,
      });
    }

    return rules;
  }

  function buildRules(): MappingRule[] {
    const rules: MappingRule[] = [];

    for (const element of elements) {
      const choice = getChoice(element);

      if (choice.mode === "keep") {
        continue;
      }
      if (choice.mode === "manual") {
        if ((choice.manual_text ?? "").trim().length === 0) {
          continue;
        }
      } else if (!choice.source_file || !choice.source_sheet) {
        continue;
      }

      if (choice.mode === "text" && !choice.data_column) {
        continue;
      }

      if (choice.mode === "chart") {
        if (!choice.x_column || choice.y_columns.length === 0) {
          continue;
        }
      }

      rules.push({
        element_name: element.element_name,
        slide_index: element.slide_index,
        mode: choice.mode,
        source_file: choice.source_file,
        source_sheet: choice.source_sheet,
        data_column: choice.data_column,
        x_column: choice.x_column,
        y_columns: choice.y_columns,
        row_index: choice.row_index,
        manual_text: choice.manual_text,
      });
    }

    return rules;
  }

  async function onAnalyze() {
    if (!outputSubdir) {
      setMessage("Set a project directory first. All generated PPT/PDF files will be saved there automatically.");
      return;
    }

    if (!templateFile) {
      setMessage("Upload a .pptx template first.");
      return;
    }
    if (dataFiles.length === 0) {
      setMessage("Upload at least one CSV or Excel file.");
      return;
    }

    try {
      setBusy(true);
      const [templateElements, analyzedSources] = await Promise.all([analyzeTemplate(templateFile), analyzeDataSources(dataFiles)]);
      const mappable = templateElements.filter((element) => element.is_mappable);
      const nextMapping: Record<string, MappingChoice> = {};

      for (const element of mappable) {
        const key = elementKey(element);
        const firstFile = analyzedSources[0];
        const firstSheet = firstFile?.sheets[0];
        const firstColumns = firstSheet?.columns ?? [];
        const xColumn = firstColumns[0];
        const ySeries = firstColumns.filter((column) => column !== xColumn).slice(0, 2);

        nextMapping[key] = {
          mode: element.has_smartart ? "keep" : element.has_table ? "table" : element.has_chart ? "chart" : "text",
          source_file: element.has_smartart ? undefined : firstFile?.file_name,
          source_sheet: element.has_smartart ? undefined : firstSheet?.sheet_name,
          data_column: element.has_text_frame ? firstColumns[0] : undefined,
          x_column: element.has_chart ? xColumn : undefined,
          y_columns: element.has_chart ? ySeries : [],
          row_index: 1,
        };
      }

      setElements(mappable);
      setDataSources(analyzedSources);
      setMapping(importedSettings ? buildImportedMappingState(importedSettings, mappable) : nextMapping);
      setPreviewPage(1);
      setMessage(`Analyzed ${mappable.length} placeholders across ${analyzedSources.length} data source file(s).`);
    } catch (error) {
      setMessage(`Analyze failed: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function onGenerate() {
    if (!outputSubdir) {
      setMessage("Set a project directory first. All generated PPT/PDF files will be saved there automatically.");
      return;
    }

    if (!templateFile || dataFiles.length === 0) {
      setMessage("Upload template and one or more data files first.");
      return;
    }

    const rules = buildRules();
    if (rules.length === 0) {
      setMessage("No active mappings found. Configure at least one non-keep mapping first.");
      return;
    }

    try {
      setBusy(true);
      const result = await generatePresentation(templateFile, dataFiles, rules, {
        outputSubdir,
        returnFile: true,
      });

      if (result instanceof Blob) {
        downloadBlob(result, "generated.pptx");
        setMessage("Presentation generated and downloaded.");
      } else {
        setMessage(`${result.message} Saved to: ${result.output_file}`);
      }
    } catch (error) {
      setMessage(`Generation failed: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function onShowPreviewOfFile() {
    if (!outputSubdir) {
      setMessage("Set a project directory first. All generated PPT/PDF files will be saved there automatically.");
      return;
    }

    if (!templateFile || dataFiles.length === 0) {
      setMessage("Upload template and data files first.");
      return;
    }

    const rules = buildRules();
    if (rules.length === 0) {
      setMessage("No active mappings found. Configure at least one non-keep mapping first.");
      return;
    }

    setPreviewDocument(null);
    setPreviewImageData(null);
    setPreviewPageCount(0);
    setPreviewError("");

    try {
      setBusy(true);
      const previewBlob = await previewGeneratedPresentation(templateFile, dataFiles, rules, outputSubdir);
      const pdfBytes = await previewBlob.arrayBuffer();
      const loadingTask = getDocument({ data: pdfBytes });
      const pdf = await loadingTask.promise;

      setPreviewDocument(pdf);
      setPreviewPageCount(pdf.numPages);
      setPreviewPage(1);
      await renderPreviewPageImage(pdf, 1);
      setMessage(`Generated preview is ready and saved in ${outputSubdir}. Use slide buttons to jump by page.`);
    } catch (error) {
      const text = `Preview unavailable: ${(error as Error).message}`;
      setPreviewError(text);
      setMessage(text);
    } finally {
      setBusy(false);
    }
  }

  async function onImportSettings() {
    if (!settingsFile) {
      setMessage("Choose a YAML settings file before importing.");
      return;
    }

    try {
      setBusy(true);
      const imported = await importSettings(settingsFile);
      setImportedSettings(imported);
      setMessage("Settings imported. Analyze with current files to apply and validate mappings.");
    } catch (error) {
      setMessage(`Import failed: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function onExportSettings() {
    if (!outputSubdir) {
      setMessage("Set a project directory first. All generated PPT/PDF files will be saved there automatically.");
      return;
    }

    if (!templateFile || dataFiles.length === 0) {
      setMessage("Upload template and data files before exporting settings.");
      return;
    }

    try {
      setBusy(true);
      const blob = await exportSettings(templateFile, dataFiles, toMappingRules(true));
      downloadBlob(blob, "presentation-settings.yaml");
      setMessage("Settings exported as YAML.");
    } catch (error) {
      setMessage(`Export failed: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={`min-h-screen transition-colors ${darkMode ? "bg-slate-950 text-slate-100" : "bg-[radial-gradient(circle_at_top_left,_#fef3c7,_#ecfeff_45%,_#f8fafc_70%)] text-brand-ink"}`}>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <header className={`rounded-3xl border p-6 shadow-panel backdrop-blur transition-colors ${darkMode ? "border-slate-700/50 bg-slate-900/85" : "border-white/70 bg-white/85"}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-5xl font-black sm:text-6xl text-brand-mint">SlideInjectr</h1>
              <p className={`mt-3 ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
                Load your data into PowerPoint templates. Map columns to template objects, configure chart series, preview your output, and generate presentations seamlessly.
              </p>
            </div>
            <button
              type="button"
              onClick={toggleDarkMode}
              className={`rounded-lg p-2 transition-colors ${darkMode ? "bg-slate-800 text-yellow-400 hover:bg-slate-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
              aria-label={darkMode ? "Toggle Light Mode" : "Toggle Dark Mode"}
              title={darkMode ? "Toggle Light Mode" : "Toggle Dark Mode"}
            >
              {darkMode ? (
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
                </svg>
              )}
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy || !directoryReady}
              className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${darkMode ? "border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700" : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"}`}
              onClick={resetSession}
            >
              Clear All
            </button>
          </div>
          <FolderPickerCard
            title="Browse & Select Project Folder"
            subtitle="Click to browse and select a folder"
            selectedLabel={projectDirectory ? `Selected: ${projectDirectory}` : "No folder selected"}
            hasSelection={directoryReady}
            disabled={busy}
            onBrowse={() => {
              void onPickProjectDirectory();
            }}
            onRemove={() => setProjectDirectory("")}
          />
          <input
            ref={folderPickerRef}
            type="file"
            hidden
            className="hidden"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(event) => onBrowseProjectDirectory(event.target.files)}
            {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
          />
        </header>

        <section className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className={`rounded-3xl border p-5 shadow-panel transition-colors ${darkMode ? "border-slate-700 bg-slate-900/50" : "border-slate-200 bg-white/90"}`}>
            <h2 className={`text-lg font-bold ${darkMode ? "text-slate-100" : "text-slate-900"}`}>Template</h2>
            <FilePickerCard
              accept=".pptx"
              title="PowerPoint Template"
              subtitle="Drag/drop or click to attach .pptx"
              selectedLabel={templateFile ? templateFile.name : "No template selected"}
              hasSelection={!!templateFile}
              disabled={!directoryReady}
              onBrowse={(files) => setTemplateFile(files?.[0] ?? null)}
              onDrop={(files) => setTemplateFile(files?.[0] ?? null)}
              onRemove={() => setTemplateFile(null)}
            />
          </div>

          <div className={`rounded-3xl border p-5 shadow-panel transition-colors ${darkMode ? "border-slate-700 bg-slate-900/50" : "border-slate-200 bg-white/90"}`}>
            <h2 className={`text-lg font-bold ${darkMode ? "text-slate-100" : "text-slate-900"}`}>Data Sources</h2>
            <FilePickerCard
              accept=".csv,.xlsx,.xls"
              title="CSV / Excel Files"
              subtitle="Attach one or many files"
              selectedLabel={dataFiles.length > 0 ? `${dataFiles.length} file(s) attached` : "No data files selected"}
              hasSelection={dataFiles.length > 0}
              disabled={!directoryReady}
              multiple
              onBrowse={setDataFilesFromList}
              onDrop={(files) => setDataFiles(files ? Array.from(files) : [])}
              onRemove={() => setDataFiles([])}
            />
            {dataFiles.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {dataFiles.map((file) => (
                  <button
                    type="button"
                    key={file.name}
                    disabled={!directoryReady}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${darkMode ? "border-slate-600 bg-slate-800 text-slate-300 hover:border-rose-600 hover:text-rose-400" : "border-slate-300 bg-white text-slate-700 hover:border-rose-300 hover:text-rose-700"}`}
                    onClick={() => removeDataFile(file.name)}
                  >
                    Remove {file.name}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className={`rounded-3xl border p-5 shadow-panel transition-colors ${darkMode ? "border-slate-700 bg-slate-900/50" : "border-slate-200 bg-white/90"}`}>
            <h2 className={`text-lg font-bold ${darkMode ? "text-slate-100" : "text-slate-900"}`}>Settings (Optional)</h2>
            <FilePickerCard
              accept=".yaml,.yml"
              title="YAML Settings"
              subtitle="Attach saved mapping settings"
              selectedLabel={settingsFile ? settingsFile.name : "No settings file selected"}
              hasSelection={!!settingsFile}
              disabled={!directoryReady}
              onBrowse={(files) => setSettingsFile(files?.[0] ?? null)}
              onDrop={(files) => setSettingsFile(files?.[0] ?? null)}
              onRemove={() => setSettingsFile(null)}
            />
            <button
              type="button"
              disabled={busy || !settingsFile || !directoryReady}
              className="mt-3 w-full rounded-xl bg-brand-sun px-4 py-2 text-sm font-semibold text-brand-ink hover:brightness-95 disabled:opacity-60 transition-colors"
              onClick={onImportSettings}
            >
              Import YAML Settings
            </button>
          </div>
        </section>

        <section
          className={`mt-6 rounded-3xl border p-5 shadow-panel transition-colors ${
            settingsValidation.tone === "error"
              ? darkMode ? "border-red-900 bg-red-950/50" : "border-red-300 bg-red-50/90"
              : settingsValidation.tone === "warning"
              ? darkMode ? "border-amber-900 bg-amber-950/50" : "border-amber-300 bg-amber-50/90"
              : darkMode ? "border-slate-700 bg-slate-900/50" : "border-slate-200 bg-white/90"
          }`}
        >
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy || !directoryReady}
              className={`rounded-xl px-5 py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${darkMode ? "bg-slate-700 text-white hover:bg-slate-600" : "bg-brand-ink text-white hover:opacity-90"}`}
              onClick={onAnalyze}
            >
              Analyze Template and Data
            </button>
            <button
              type="button"
              disabled={busy || elements.length === 0 || settingsValidation.tone === "error" || !directoryReady}
              className={`rounded-xl border px-5 py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${darkMode ? "border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700" : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"}`}
              onClick={onShowPreviewOfFile}
            >
              Show Preview of File
            </button>
            <button
              type="button"
              disabled={busy || elements.length === 0 || settingsValidation.tone === "error" || !directoryReady}
              className="rounded-xl bg-brand-sun px-5 py-2 text-sm font-semibold text-brand-ink hover:brightness-95 disabled:opacity-60 transition-colors"
              onClick={onGenerate}
            >
              Generate Presentation
            </button>
          </div>

          {settingsValidation.message ? (
            <p
              className={`mt-4 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                settingsValidation.tone === "error"
                  ? darkMode ? "bg-red-950 text-red-300" : "bg-red-100 text-red-900"
                  : settingsValidation.tone === "warning"
                  ? darkMode ? "bg-amber-950 text-amber-300" : "bg-amber-100 text-amber-900"
                  : darkMode ? "bg-emerald-950 text-emerald-300" : "bg-emerald-100 text-emerald-900"
              }`}
            >
              {settingsValidation.message}
            </p>
          ) : null}

          {previewImageData ? (
            <div className={`mt-4 rounded-2xl border p-3 transition-colors ${darkMode ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"}`}>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {previewSlideButtons.map((slide) => (
                  <button
                    type="button"
                    key={slide}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                      previewPage === slide 
                        ? "bg-brand-ink text-white" 
                        : darkMode ? "border border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700" : "border border-slate-300 bg-white text-slate-700"
                    }`}
                    onClick={() => {
                      void onSelectPreviewPage(slide);
                    }}
                  >
                    Slide {slide}
                  </button>
                ))}
              </div>
              <img src={previewImageData} alt={`Generated preview page ${previewPage}`} className={`max-h-[680px] w-full rounded-xl border object-contain transition-colors ${darkMode ? "border-slate-700" : "border-slate-200"}`} />
            </div>
          ) : null}

          {previewError ? <p className={`mt-3 text-sm ${darkMode ? "text-amber-400" : "text-amber-700"}`}>{previewError}</p> : null}
          {message ? <p className={`mt-3 text-sm ${darkMode ? "text-slate-300" : "text-slate-700"}`}>{message}</p> : null}
        </section>

        <section className={`mt-8 rounded-3xl border p-5 shadow-panel transition-colors ${darkMode ? "border-slate-700 bg-slate-900/50" : "border-slate-200 bg-white/90"}`}>
          <h2 className={`text-xl font-bold ${darkMode ? "text-slate-100" : "text-slate-900"}`}>Visual Mapping</h2>
          {elements.length === 0 ? (
            <p className={`mt-3 ${darkMode ? "text-slate-400" : "text-slate-600"}`}>Run analysis to populate placeholders and mapping controls.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {elements.map((element) => {
                const choice = getChoice(element);
                const sheets = availableSheets(choice.source_file);
                const columns = availableColumns(choice.source_file, choice.source_sheet);
                const isManual = choice.mode === "manual";
                const isText = choice.mode === "text";
                const isChart = choice.mode === "chart";
                const usesData = isText || isChart || choice.mode === "table";
                const modeOptions: Array<"keep" | "text" | "manual" | "table" | "chart"> = element.has_smartart
                  ? ["keep"]
                  : [
                      "keep",
                      ...(element.has_table ? (["table"] as const) : []),
                      ...(element.has_chart ? (["chart"] as const) : []),
                      ...(element.has_text_frame ? (["manual", "text"] as const) : []),
                    ];

                return (
                  <article key={elementKey(element)} className={`rounded-2xl border p-4 transition-colors ${darkMode ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-white"}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Slide {element.slide_index + 1}</p>
                        <p className={`text-base font-bold ${darkMode ? "text-slate-100" : "text-slate-900"}`}>{element.element_name}</p>
                        <p className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Type: {element.element_type}</p>
                        {element.placeholder_text ? <p className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-500"}`}>Preview text: {element.placeholder_text}</p> : null}
                        {element.has_smartart ? (
                          <p className={`mt-1 text-xs font-semibold ${darkMode ? "text-amber-400" : "text-amber-700"}`}>
                            SmartArt detected. SmartArt is not supported in this tool, so edit it manually in PowerPoint.
                          </p>
                        ) : null}
                      </div>
                      <select
                        className={`rounded-lg border px-3 py-2 text-sm transition-colors ${darkMode ? "border-slate-600 bg-slate-700 text-slate-100" : "border-slate-300 bg-white text-slate-900"}`}
                        value={choice.mode}
                        onChange={(event) => {
                          const nextMode = event.target.value as MappingChoice["mode"];
                          updateChoice(element, {
                            mode: nextMode,
                            data_column: nextMode === "text" ? choice.data_column : undefined,
                            x_column: nextMode === "chart" ? choice.x_column : undefined,
                            y_columns: nextMode === "chart" ? choice.y_columns : [],
                            manual_text: nextMode === "manual" ? choice.manual_text : undefined,
                          });
                        }}
                      >
                        {modeOptions.map((mode) => (
                          <option key={`${elementKey(element)}-${mode}`} value={mode}>
                            {mode === "keep"
                              ? "Keep Existing"
                              : mode === "text"
                              ? "Text Mapping"
                              : mode === "manual"
                              ? "Manual Input"
                              : mode === "table"
                              ? "Table Mapping"
                              : "Chart Mapping"}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <label className={`text-xs font-semibold ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                        Source File
                        <select
                          className={`mt-1 w-full rounded-lg border px-2 py-2 text-sm transition-colors ${darkMode ? "border-slate-600 bg-slate-700 text-slate-100" : "border-slate-300 bg-white text-slate-900"} disabled:opacity-50`}
                          disabled={!usesData}
                          value={choice.source_file ?? ""}
                          onChange={(event) => {
                            const fileName = event.target.value || undefined;
                            const nextSheets = availableSheets(fileName);
                            const nextSheet = nextSheets[0];
                            const nextColumns = availableColumns(fileName, nextSheet);
                            updateChoice(element, {
                              source_file: fileName,
                              source_sheet: nextSheet,
                              data_column: isText ? nextColumns[0] : undefined,
                              x_column: isChart ? nextColumns[0] : undefined,
                              y_columns: isChart ? nextColumns.slice(1, 3) : [],
                            });
                          }}
                        >
                          <option value="">Not Applicable</option>
                          {dataFileOptions.map((fileName) => (
                            <option key={`${elementKey(element)}-${fileName}`} value={fileName}>
                              {fileName}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className={`text-xs font-semibold ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                        Sheet
                        <select
                          className={`mt-1 w-full rounded-lg border px-2 py-2 text-sm transition-colors ${darkMode ? "border-slate-600 bg-slate-700 text-slate-100" : "border-slate-300 bg-white text-slate-900"} disabled:opacity-50`}
                          disabled={!usesData}
                          value={choice.source_sheet ?? ""}
                          onChange={(event) => {
                            const sheet = event.target.value || undefined;
                            const nextColumns = availableColumns(choice.source_file, sheet);
                            updateChoice(element, {
                              source_sheet: sheet,
                              data_column: isText ? nextColumns[0] : undefined,
                              x_column: isChart ? nextColumns[0] : undefined,
                              y_columns: isChart ? nextColumns.slice(1, 3) : [],
                            });
                          }}
                        >
                          <option value="">Not Applicable</option>
                          {sheets.map((sheet) => (
                            <option key={`${elementKey(element)}-${sheet}`} value={sheet}>
                              {sheet}
                            </option>
                          ))}
                        </select>
                      </label>

                      {isText ? (
                        <label className={`text-xs font-semibold ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                          Text Column
                          <select
                            className={`mt-1 w-full rounded-lg border px-2 py-2 text-sm transition-colors ${darkMode ? "border-slate-600 bg-slate-700 text-slate-100" : "border-slate-300 bg-white text-slate-900"}`}
                            value={choice.data_column ?? ""}
                            onChange={(event) => updateChoice(element, { data_column: event.target.value || undefined })}
                          >
                            <option value="">Select column</option>
                            {columns.map((column) => (
                              <option key={`${elementKey(element)}-${column}`} value={column}>
                                {column}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : null}

                      {isText ? (
                        <label className={`text-xs font-semibold ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                          Row Number
                          <input
                            type="number"
                            min={1}
                            value={choice.row_index}
                            className={`mt-1 w-full rounded-lg border px-2 py-2 text-sm transition-colors ${darkMode ? "border-slate-600 bg-slate-700 text-slate-100" : "border-slate-300 bg-white text-slate-900"}`}
                            onChange={(event) => updateChoice(element, { row_index: Math.max(1, Number(event.target.value) || 1) })}
                          />
                        </label>
                      ) : null}
                    </div>

                    {isChart ? (
                      <div className="mt-4 grid gap-3 lg:grid-cols-2">
                        <label className={`text-xs font-semibold ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                          X-Axis Column
                          <select
                            className={`mt-1 w-full rounded-lg border px-2 py-2 text-sm transition-colors ${darkMode ? "border-slate-600 bg-slate-700 text-slate-100" : "border-slate-300 bg-white text-slate-900"}`}
                            value={choice.x_column ?? ""}
                            onChange={(event) => {
                              const xColumn = event.target.value || undefined;
                              const yColumns = choice.y_columns.filter((column) => column !== xColumn);
                              updateChoice(element, { x_column: xColumn, y_columns: yColumns });
                            }}
                          >
                            <option value="">Select X-axis</option>
                            {columns.map((column) => (
                              <option key={`${elementKey(element)}-x-${column}`} value={column}>
                                {column}
                              </option>
                            ))}
                          </select>
                        </label>

                        <fieldset className={`rounded-xl border p-3 transition-colors ${darkMode ? "border-slate-700 bg-slate-700/30" : "border-slate-200"}`}>
                          <legend className={`px-1 text-xs font-semibold ${darkMode ? "text-slate-300" : "text-slate-600"}`}>Y-Series Columns (multiple allowed)</legend>
                          <div className="mt-1 grid max-h-36 gap-1 overflow-y-auto pr-1">
                            {columns
                              .filter((column) => column !== choice.x_column)
                              .map((column) => {
                                const checked = choice.y_columns.includes(column);
                                return (
                                  <label key={`${elementKey(element)}-y-${column}`} className={`flex items-center gap-2 text-xs ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={(event) => {
                                        const next = event.target.checked
                                          ? [...choice.y_columns, column]
                                          : choice.y_columns.filter((value) => value !== column);
                                        updateChoice(element, { y_columns: next });
                                      }}
                                    />
                                    {column}
                                  </label>
                                );
                              })}
                          </div>
                        </fieldset>
                      </div>
                    ) : null}

                    {isManual ? (
                      <label className={`mt-4 block text-xs font-semibold ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                        Manual Text
                        <textarea
                          className={`mt-1 w-full rounded-lg border px-2 py-2 text-sm transition-colors ${darkMode ? "border-slate-600 bg-slate-700 text-slate-100" : "border-slate-300 bg-white text-slate-900"}`}
                          rows={3}
                          placeholder="Enter literal text"
                          value={choice.manual_text ?? ""}
                          onChange={(event) => updateChoice(element, { manual_text: event.target.value })}
                        />
                      </label>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy || elements.length === 0 || !directoryReady}
              className={`rounded-xl px-5 py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${darkMode ? "bg-slate-700 text-white hover:bg-slate-600" : "bg-brand-ink text-white hover:opacity-90"}`}
              onClick={onExportSettings}
            >
              Export YAML Settings
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
