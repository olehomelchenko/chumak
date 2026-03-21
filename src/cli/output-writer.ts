/**
 * CLI Output — CSV/JSON writing to file or stdout
 */

import fs from 'fs';
import Papa from 'papaparse';

/**
 * Writes data as CSV to a file or stdout.
 * @param data - Array of row objects
 * @param filePath - Output file path, or null for stdout
 */
export function writeCSV(data: any[], filePath: string | null): void {
  const csv = Papa.unparse(data);
  if (filePath) {
    fs.writeFileSync(filePath, csv, 'utf-8');
  } else {
    process.stdout.write(csv + '\n');
  }
}

/**
 * Writes data as JSON to a file or stdout.
 * @param data - Array of row objects
 * @param filePath - Output file path, or null for stdout
 */
export function writeJSON(data: any[], filePath: string | null): void {
  const json = JSON.stringify(data, null, 2);
  if (filePath) {
    fs.writeFileSync(filePath, json, 'utf-8');
  } else {
    process.stdout.write(json + '\n');
  }
}
