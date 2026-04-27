import * as XLSX from "xlsx";
import type { PitchTypeRow } from "./types";

export interface ImportRow {
  numeric_code: string;
  pitch_type_code: string;
  pitch_type_id?: string;
  label?: string;
  invalid?: string;
}

export function downloadTemplate(pitcherName: string, pitchTypes: PitchTypeRow[]) {
  const wb = XLSX.utils.book_new();
  const header = [["numeric_code", "pitch_type_code", "notes"]];
  const examples = [
    ["1", "FBAWY", "fastball away"],
    ["2", "CHUPA", "change up"],
    ["3", "CURVE", "curveball"],
  ];
  const ws = XLSX.utils.aoa_to_sheet([...header, ...examples]);
  ws["!cols"] = [{ wch: 14 }, { wch: 18 }, { wch: 28 }];
  XLSX.utils.book_append_sheet(wb, ws, "Codes");

  const refRows = [
    ["pitch_type_code", "label"],
    ...pitchTypes.map((p) => [p.code, p.label]),
  ];
  const refWs = XLSX.utils.aoa_to_sheet(refRows);
  XLSX.utils.book_append_sheet(wb, refWs, "Reference");

  XLSX.writeFile(wb, `pitch-codes-${pitcherName.replace(/\s+/g, "-")}.xlsx`);
}

export async function parseImportFile(file: File, pitchTypes: PitchTypeRow[]): Promise<ImportRow[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const json: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
  const byCode = new Map(pitchTypes.map((p) => [p.code.toUpperCase(), p]));
  return json.map((r) => {
    const numeric = String(r.numeric_code ?? r.code ?? "").trim();
    const ptCode = String(r.pitch_type_code ?? r.pitch ?? "").trim().toUpperCase();
    const pt = byCode.get(ptCode);
    return {
      numeric_code: numeric,
      pitch_type_code: ptCode,
      pitch_type_id: pt?.id,
      label: pt?.label,
      invalid: !numeric
        ? "missing numeric_code"
        : !ptCode
        ? "missing pitch_type_code"
        : !pt
        ? `unknown pitch type "${ptCode}"`
        : undefined,
    };
  });
}
