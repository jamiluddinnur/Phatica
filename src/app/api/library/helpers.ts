// Pembantu bersama untuk rute /api/library — bukan rute (tanpa GET/POST).
import type { RubricSelection } from "@/lib/custom-library";

export function parseRubricJson(raw: string): Array<{ key: string; label: string; rubric: string; weight: number }> {
  try {
    const v = JSON.parse(raw || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function serializeScenario(s: any) {
  return { ...s, rubric: parseRubricJson(s.rubric) };
}

/** Normalisasi body → RubricSelection[]: terima `rubric` (array objek
 *  {key} / {customLabel}) atau `rubricKeys` (string[]) + `customDimension`. */
export function selectionsFromBody(body: any): RubricSelection[] {
  if (Array.isArray(body.rubric)) {
    return body.rubric
      .map((r: any) =>
        typeof r === "string"
          ? { key: r }
          : r && typeof r === "object"
            ? r.customLabel
              ? { customLabel: String(r.customLabel) }
              : { key: String(r.key || "") }
            : null
      )
      .filter(Boolean);
  }
  const keys = Array.isArray(body.rubricKeys) ? body.rubricKeys.map((k: any) => ({ key: String(k) })) : [];
  if (body.customDimension && String(body.customDimension).trim()) {
    keys.push({ customLabel: String(body.customDimension).trim() });
  }
  return keys;
}
