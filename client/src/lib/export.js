// Column-driven exports. Any table that declares columns can export itself to
// CSV, Excel or PDF with no per-page code — the same `columns` array that
// renders the table describes the export.
//
// Excel and PDF writers are dynamically imported so their (large) bundles only
// download when someone actually clicks export.

import { saveFile } from "./utils";

const stamp = () => new Date().toISOString().slice(0, 10);

// Resolve a cell to plain text. `exportValue` lets a column export the raw
// number/date behind a rendered badge or formatted string.
function cellText(col, row) {
  if (col.exportValue) return String(col.exportValue(row) ?? "");
  const v = row[col.key];
  if (v == null) return "";
  return typeof v === "object" ? JSON.stringify(v) : String(v);
}

// `export: false` opts a column out (action buttons, avatars, etc).
function exportable(columns) {
  return columns.filter((c) => c.export !== false);
}

/** Save a Blob, preferring the native "Save As" picker where available. */
export async function downloadBlob(blob, filename) {
  const mime = blob.type || "application/octet-stream";
  // saveFile already implements the showSaveFilePicker + anchor fallback.
  return saveFile(filename, blob, mime);
}

export function exportToCSV(columns, rows, name = "export") {
  const cols = exportable(columns);
  const esc = (s) => `"${String(s).replace(/"/g, '""')}"`;
  const header = cols.map((c) => esc(c.label)).join(",");
  const body = rows.map((r) => cols.map((c) => esc(cellText(c, r))).join(",")).join("\n");
  // Leading BOM so Excel opens UTF-8 (₹, accented vendor names) correctly.
  const blob = new Blob(["﻿" + header + "\n" + body], {
    type: "text/csv;charset=utf-8;",
  });
  return downloadBlob(blob, `${name}-${stamp()}.csv`);
}

export async function exportToExcel(columns, rows, name = "export") {
  const ExcelJS = (await import("exceljs")).default;
  const cols = exportable(columns);
  const wb = new ExcelJS.Workbook();
  wb.creator = "Wolf ERP";
  wb.created = new Date();
  // Excel caps sheet names at 31 chars.
  const ws = wb.addWorksheet(name.slice(0, 31) || "Sheet1");

  ws.columns = cols.map((c) => ({ header: c.label, key: c.key, width: 22 }));
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE8EEF9" },
  };
  ws.views = [{ state: "frozen", ySplit: 1 }];

  for (const r of rows) {
    ws.addRow(Object.fromEntries(cols.map((c) => [c.key, cellText(c, r)])));
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  return downloadBlob(blob, `${name}-${stamp()}.xlsx`);
}

export async function exportToPDF(columns, rows, name = "export", title) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const cols = exportable(columns);
  // Wide tables get landscape so columns don't crush together.
  const doc = new jsPDF({ orientation: cols.length > 5 ? "landscape" : "portrait" });

  doc.setFontSize(14);
  doc.text(title || name, 14, 16);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Wolf ERP · generated ${new Date().toLocaleString("en-IN")}`, 14, 22);

  autoTable(doc, {
    startY: 28,
    head: [cols.map((c) => c.label)],
    body: rows.map((r) => cols.map((c) => cellText(c, r))),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    alternateRowStyles: { fillColor: [246, 248, 252] },
  });

  return downloadBlob(doc.output("blob"), `${name}-${stamp()}.pdf`);
}

export const printPage = () => window.print();
