export const MAX_REPORT_BYTES = 15 * 1024 * 1024; // 15 MB
export const ACCEPTED_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];
export const ACCEPT_ATTR = ".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*";

export type ResultRow = {
  test: string;
  result: string;
  unit: string | null;
  reference_range: string;
  status: string;
  explanation: string;
};

export type ImportantFinding = { title: string; detail: string; severity: string };

export type ReportAnalysis = {
  processing_ok?: boolean;
  failure_reason?: string | null;
  report_type?: string;
  is_medical_image?: boolean;
  image_notice?: string | null;
  patient_info?: Record<string, string | null>;
  extracted_text?: string;
  ocr_confidence?: number;
  low_confidence_notice?: string | null;
  structured_results?: ResultRow[];
  findings?: string[];
  ai_summary?: string;
  important_findings?: ImportantFinding[];
  simple_explanation?: string;
  doctor_questions?: string[];
  warning_signs?: string[];
  urgent?: boolean;
};

export const REPORT_DISCLAIMER =
  "Sahara provides AI-generated health information to help you understand medical reports. It does not replace professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare professional for medical decisions.";

export function validateReportFile(file: File): string | null {
  const okType =
    ACCEPTED_MIME.includes(file.type) ||
    /\.(pdf|jpe?g|png|webp)$/i.test(file.name);
  if (!okType) return "This file type isn't supported. Please use a PDF, JPG, PNG or WEBP file.";
  if (file.size > MAX_REPORT_BYTES) return "This file is too large. Please upload a file smaller than 15 MB.";
  if (file.size === 0) return "This file appears to be empty. Please choose another file.";
  return null;
}

export function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read-failed"));
    reader.readAsDataURL(file);
  });
}

export function statusMeta(status: string) {
  const s = (status || "").toLowerCase();
  if (s === "normal") return { className: "border-emerald/40 text-emerald bg-emerald/10", label: "Normal" };
  if (s === "high") return { className: "border-destructive/40 text-destructive bg-destructive/10", label: "High" };
  if (s === "low") return { className: "border-warning/40 text-warning bg-warning/10", label: "Low" };
  if (s === "abnormal") return { className: "border-destructive/40 text-destructive bg-destructive/10", label: "Abnormal" };
  if (s === "needs attention") return { className: "border-warning/40 text-warning bg-warning/10", label: "Needs Attention" };
  return { className: "border-muted-foreground/30 text-muted-foreground bg-muted/40", label: status || "Unclear" };
}

export const PROCESSING_STEPS = [
  "Uploading…",
  "Reading report…",
  "Extracting information…",
  "Analyzing report…",
  "Preparing simple explanation…",
  "Analysis complete",
];

/** Build the plain-text context sent to the report Q&A endpoint. */
export function buildReportContext(a: ReportAnalysis, meta: { report_type: string; patient_label: string; file_name: string }) {
  const rows = (a.structured_results ?? [])
    .map((r) => `- ${r.test}: ${r.result}${r.unit ? " " + r.unit : ""} | reference range on report: ${r.reference_range} | status: ${r.status}`)
    .join("\n");
  return [
    `Report file: ${meta.file_name}`,
    `Report type: ${meta.report_type}`,
    `This report belongs to: ${meta.patient_label}`,
    a.patient_info ? `Patient details printed on report: ${JSON.stringify(a.patient_info)}` : "",
    rows ? `Test results printed on report:\n${rows}` : "",
    a.findings?.length ? `Findings / impression printed on report:\n${a.findings.join("\n")}` : "",
    a.ai_summary ? `Existing summary: ${a.ai_summary}` : "",
    a.extracted_text ? `Full OCR text of the report:\n${a.extracted_text}` : "",
  ].filter(Boolean).join("\n\n");
}

export function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
  } catch { return iso; }
}
