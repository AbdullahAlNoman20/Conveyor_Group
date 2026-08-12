// FILE: src/components/utils/exportExcel.js  (NEW)
import * as XLSX from "xlsx";

/** Downloads `rows` (array of flat objects) as an .xlsx file. Reused
 * anywhere a "Download Excel" button appears — Purchase Vouchers, Wallet
 * Recharge history, Daily Reports, Order History, etc. */
export function exportToExcel(rows, filename, sheetName = "Sheet1") {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}

/** Downloads a multi-sheet workbook from `sheetsObj` = { sheetName: rows[] }.
 * Non-array values are wrapped in a single-row sheet. Sheet names are
 * truncated to Excel's 31-char limit. Used by System Backup / Financial
 * Report exports that bundle several collections into one file. */
export function exportMultiSheetExcel(sheetsObj, filename) {
  const workbook = XLSX.utils.book_new();
  Object.entries(sheetsObj).forEach(([sheetName, rows]) => {
    const safeName = String(sheetName).slice(0, 31) || "Sheet";
    const dataRows = Array.isArray(rows) ? rows : [rows || {}];
    const worksheet = XLSX.utils.json_to_sheet(dataRows.length ? dataRows : [{}]);
    XLSX.utils.book_append_sheet(workbook, worksheet, safeName);
  });
  XLSX.writeFile(workbook, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}