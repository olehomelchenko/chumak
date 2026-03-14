import type { WorkBook } from 'xlsx';

export interface ExcelParseResult {
  data: unknown[][];
  sheetNames: string[];
}

async function loadXlsx() {
  return import('xlsx');
}

function formatDate(cell: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = cell.getFullYear();
  const mo = pad(cell.getMonth() + 1);
  const d = pad(cell.getDate());
  const h = cell.getHours();
  const m = cell.getMinutes();
  const s = cell.getSeconds();
  if (h === 0 && m === 0 && s === 0) {
    return `${y}-${mo}-${d}`;
  }
  // Local-time ISO string — no toISOString() to avoid UTC shift (DATE-STORAGE-ARCHITECTURE.md Rule 3)
  return `${y}-${mo}-${d}T${pad(h)}:${pad(m)}:${pad(s)}`;
}

function convertDates(data: unknown[][]): unknown[][] {
  return data.map((row) => row.map((cell) => (cell instanceof Date ? formatDate(cell) : cell)));
}

function parseWorkbook(wb: WorkBook, XLSX: any, rowLimit?: number): ExcelParseResult {
  const sheetNames = wb.SheetNames;
  const sheet = wb.Sheets[sheetNames[0]];
  if (!sheet) {
    return { data: [], sheetNames };
  }

  const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: true,
    defval: null,
  });

  const data = rowLimit ? raw.slice(0, rowLimit) : raw;

  return {
    data: convertDates(data),
    sheetNames,
  };
}

export async function parseExcelFile(buffer: ArrayBuffer): Promise<ExcelParseResult> {
  const XLSX = await loadXlsx();
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
  return parseWorkbook(wb, XLSX);
}

export async function parseExcelPreview(
  buffer: ArrayBuffer,
  rowLimit: number
): Promise<ExcelParseResult> {
  const XLSX = await loadXlsx();
  // sheetRows limits parsing to first N rows for efficiency
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true, sheetRows: rowLimit });
  return parseWorkbook(wb, XLSX, rowLimit);
}
