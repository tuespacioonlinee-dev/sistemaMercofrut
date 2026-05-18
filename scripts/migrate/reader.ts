// scripts/migrate/reader.ts
import * as XLSX from "xlsx";

export interface FileData {
  headers: string[];
  rows: Record<string, string>[];
}

export function readFile(filePath: string): FileData {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error(`Archivo vacío: ${filePath}`);
  }

  const sheet = workbook.Sheets[sheetName];
  const raw: string[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  if (raw.length < 2) {
    throw new Error(
      `Archivo sin datos: ${filePath} (solo ${raw.length} fila(s))`
    );
  }

  const headers = raw[0].map((h) => String(h).trim()).filter(Boolean);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < raw.length; i++) {
    const row: Record<string, string> = {};
    let hasData = false;
    for (let j = 0; j < headers.length; j++) {
      const val = String(raw[i][j] ?? "").trim();
      row[headers[j]] = val;
      if (val) hasData = true;
    }
    if (hasData) rows.push(row);
  }

  return { headers, rows };
}

export function getSample(data: FileData, count: number = 5): Record<string, string>[] {
  return data.rows.slice(0, count);
}
