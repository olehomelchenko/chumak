import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';

// Helper: create an xlsx ArrayBuffer from a 2D array
function createXlsxBuffer(data: unknown[][], sheetName = 'Sheet1'): ArrayBuffer {
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return buf;
}

function createMultiSheetBuffer(sheets: { name: string; data: unknown[][] }[]): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const ws = XLSX.utils.aoa_to_sheet(sheet.data);
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  }
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
}

describe('excel-parser', () => {
  it('parses a simple xlsx to 2D array', async () => {
    const { parseExcelFile } = await import('./excel-parser');
    const buffer = createXlsxBuffer([
      ['Name', 'Age', 'City'],
      ['Alice', 30, 'Kyiv'],
      ['Bob', 25, 'Lviv'],
    ]);

    const result = await parseExcelFile(buffer);

    expect(result.data).toEqual([
      ['Name', 'Age', 'City'],
      ['Alice', 30, 'Kyiv'],
      ['Bob', 25, 'Lviv'],
    ]);
    expect(result.sheetNames).toEqual(['Sheet1']);
  });

  it('handles empty sheets', async () => {
    const { parseExcelFile } = await import('./excel-parser');
    const buffer = createXlsxBuffer([]);

    const result = await parseExcelFile(buffer);
    expect(result.data).toEqual([]);
  });

  it('preserves number types', async () => {
    const { parseExcelFile } = await import('./excel-parser');
    const buffer = createXlsxBuffer([
      ['Value', 'Float'],
      [42, 3.14],
    ]);

    const result = await parseExcelFile(buffer);
    expect(result.data[1]).toEqual([42, 3.14]);
  });

  it('handles null cells with defval', async () => {
    const { parseExcelFile } = await import('./excel-parser');
    // Create sheet with a gap — column B row 2 is empty
    const ws = XLSX.utils.aoa_to_sheet([
      ['A', 'B'],
      ['val', null],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer: ArrayBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

    const result = await parseExcelFile(buffer);
    expect(result.data[1][1]).toBeNull();
  });

  it('converts Date cells to ISO date strings', async () => {
    const { parseExcelFile } = await import('./excel-parser');
    // Create a sheet with a proper date-formatted cell
    const ws = XLSX.utils.aoa_to_sheet([
      ['Date'],
      [new Date(2024, 0, 15)], // Jan 15, 2024
    ]);
    // Set the cell format to a date format so SheetJS recognizes it as a date
    ws['A2'].z = 'yyyy-mm-dd';
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer: ArrayBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

    const result = await parseExcelFile(buffer);
    // Should be an ISO date string, not a Date object
    expect(typeof result.data[1][0]).toBe('string');
    expect(result.data[1][0]).toBe('2024-01-15');
  });

  it('converts DateTime cells to local-time ISO strings (no UTC shift)', async () => {
    const { parseExcelFile } = await import('./excel-parser');
    const ws = XLSX.utils.aoa_to_sheet([
      ['DateTime'],
      [new Date(2024, 0, 15, 14, 30, 45)], // Jan 15, 2024 14:30:45 local
    ]);
    ws['A2'].z = 'yyyy-mm-dd hh:mm:ss';
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer: ArrayBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

    const result = await parseExcelFile(buffer);
    expect(typeof result.data[1][0]).toBe('string');
    // Must use local time, not UTC — so the value should match what was passed in
    expect(result.data[1][0]).toBe('2024-01-15T14:30:45');
  });

  it('returns all sheet names', async () => {
    const { parseExcelFile } = await import('./excel-parser');
    const buffer = createMultiSheetBuffer([
      { name: 'Data', data: [['A'], [1]] },
      { name: 'Metadata', data: [['Key'], ['val']] },
    ]);

    const result = await parseExcelFile(buffer);
    expect(result.sheetNames).toEqual(['Data', 'Metadata']);
    // Parses first sheet by default
    expect(result.data).toEqual([['A'], [1]]);
  });

  it('preview limits rows', async () => {
    const { parseExcelPreview } = await import('./excel-parser');
    const rows: unknown[][] = [['Header']];
    for (let i = 1; i <= 100; i++) {
      rows.push([i]);
    }
    const buffer = createXlsxBuffer(rows);

    const result = await parseExcelPreview(buffer, 5);
    expect(result.data.length).toBeLessThanOrEqual(5);
  });

  it('handles boolean values', async () => {
    const { parseExcelFile } = await import('./excel-parser');
    const buffer = createXlsxBuffer([['Flag'], [true], [false]]);

    const result = await parseExcelFile(buffer);
    expect(result.data[1][0]).toBe(true);
    expect(result.data[2][0]).toBe(false);
  });

  it('parses ODS format (LibreOffice)', async () => {
    const { parseExcelFile } = await import('./excel-parser');
    // Create an ODS buffer using SheetJS
    const ws = XLSX.utils.aoa_to_sheet([
      ['Name', 'Score'],
      ['Alice', 95],
      ['Bob', 87],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const buffer: ArrayBuffer = XLSX.write(wb, { type: 'array', bookType: 'ods' });

    const result = await parseExcelFile(buffer);
    expect(result.data).toEqual([
      ['Name', 'Score'],
      ['Alice', 95],
      ['Bob', 87],
    ]);
  });
});
