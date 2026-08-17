// FILE: src/components/utils/exportExcel.js
import * as XLSX from "xlsx";

export function exportToExcel(rows, filename, sheetName = "Sheet1") {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(
    workbook,
    filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`,
  );
}

export function exportMultiSheetExcel(sheetsObj, filename) {
  const workbook = XLSX.utils.book_new();
  Object.entries(sheetsObj).forEach(([sheetName, rows]) => {
    const safeName = String(sheetName).slice(0, 31) || "Sheet";
    const dataRows = Array.isArray(rows) ? rows : [rows || {}];
    const worksheet = XLSX.utils.json_to_sheet(
      dataRows.length ? dataRows : [{}],
    );
    XLSX.utils.book_append_sheet(workbook, worksheet, safeName);
  });
  XLSX.writeFile(
    workbook,
    filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`,
  );
}
