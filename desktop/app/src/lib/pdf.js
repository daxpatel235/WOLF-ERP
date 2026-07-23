// Client-side PDF generation: snapshot a DOM node into a PDF and hand it to the
// native "Save As" picker (so the user chooses where to store the file).
// jsPDF + html2canvas are imported lazily so they stay out of the main bundle.

import { saveFile } from "./utils";

export async function downloadNodeAsPdf(node, filename = "document.pdf") {
  if (!node) return false;

  const [jspdfMod, html2canvasMod] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ]);
  const JsPDF = jspdfMod.jsPDF || jspdfMod.default;
  const html2canvas = html2canvasMod.default || html2canvasMod;

  // Render the node to a high-resolution canvas.
  const canvas = await html2canvas(node, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
  });

  const pdf = new JsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const imgData = canvas.toDataURL("image/png");
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  // Add the image, splitting across pages if it's taller than one A4 page.
  let heightLeft = imgHeight;
  let position = 0;
  pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;
  while (heightLeft > 0) {
    position -= pageHeight;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  const blob = pdf.output("blob");
  return saveFile(filename, blob, "application/pdf");
}

// Build a clean invoice PDF directly with jsPDF (no html2canvas) — fast and
// reliable, with selectable text. Returns false if the user cancels the picker.
export async function downloadInvoicePdf(inv, company = {}, filename) {
  const jspdfMod = await import("jspdf");
  const JsPDF = jspdfMod.jsPDF || jspdfMod.default;
  const doc = new JsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

  const W = doc.internal.pageSize.getWidth();
  const M = 42;
  const right = W - M;
  // Standard PDF fonts don't include the ₹ glyph, so use "INR".
  const money = (n) => "INR " + Number(n || 0).toLocaleString("en-IN");
  const dateStr = (d) =>
    d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  const items = inv.items || [];
  const subtotal = items.reduce((s, it) => s + it.qty * it.unitPrice, 0);
  const gst = Math.round(subtotal * 0.18);
  const total = subtotal + gst;

  let y = 60;

  // ---- Header ----
  doc.setFont("helvetica", "bold").setFontSize(22).setTextColor(15, 23, 42);
  doc.text("Wolf", M, y);
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(100, 116, 139);
  doc.text(company.name || "", M, y + 15);

  doc.setFont("helvetica", "bold").setFontSize(18).setTextColor(30, 64, 175);
  doc.text("TAX INVOICE", right, y, { align: "right" });
  doc.setFontSize(10).setTextColor(51, 65, 85);
  doc.text(inv.id, right, y + 16, { align: "right" });

  y += 46;
  doc.setDrawColor(226, 232, 240).line(M, y, right, y);
  y += 24;

  // ---- From / Bill to ----
  doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(148, 163, 184);
  doc.text("FROM", M, y);
  doc.text("BILL TO", right, y, { align: "right" });
  y += 15;
  doc.setFontSize(10).setTextColor(15, 23, 42);
  doc.text(company.name || "", M, y);
  doc.text(inv.vendor || "", right, y, { align: "right" });
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(100, 116, 139);
  doc.text(company.address || "", M, y + 14, { maxWidth: 240 });
  doc.text("GSTIN: " + (company.gstin || "—"), M, y + 38);
  let billY = y + 14;
  if (inv.poId) { doc.text("Ref PO: " + inv.poId, right, billY, { align: "right" }); billY += 13; }
  doc.text("Issued: " + dateStr(inv.issued), right, billY, { align: "right" });
  doc.text("Due: " + dateStr(inv.due), right, billY + 13, { align: "right" });

  y += 64;

  // ---- Items table ----
  const colQty = right - 210;
  const colRate = right - 120;
  doc.setFillColor(248, 250, 252).rect(M, y - 12, right - M, 22, "F");
  doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(100, 116, 139);
  doc.text("DESCRIPTION", M + 8, y + 2);
  doc.text("QTY", colQty, y + 2, { align: "right" });
  doc.text("RATE", colRate, y + 2, { align: "right" });
  doc.text("AMOUNT", right - 8, y + 2, { align: "right" });
  y += 24;

  doc.setFont("helvetica", "normal").setFontSize(9.5);
  items.forEach((it) => {
    doc.setTextColor(30, 41, 59);
    doc.text(String(it.name), M + 8, y, { maxWidth: colQty - M - 20 });
    doc.setTextColor(71, 85, 105);
    doc.text(String(it.qty), colQty, y, { align: "right" });
    doc.text(money(it.unitPrice), colRate, y, { align: "right" });
    doc.setTextColor(15, 23, 42);
    doc.text(money(it.qty * it.unitPrice), right - 8, y, { align: "right" });
    y += 10;
    doc.setDrawColor(241, 245, 249).line(M, y, right, y);
    y += 16;
  });

  // ---- Totals ----
  y += 6;
  const labelX = right - 150;
  const totalRow = (label, val, isTotal) => {
    doc.setFont("helvetica", isTotal ? "bold" : "normal").setFontSize(isTotal ? 11 : 9.5);
    doc.setTextColor(isTotal ? 30 : 100, isTotal ? 64 : 116, isTotal ? 175 : 139);
    doc.text(label, labelX, y, { align: "right" });
    doc.setTextColor(isTotal ? 30 : 30, isTotal ? 64 : 41, isTotal ? 175 : 59);
    doc.text(val, right - 8, y, { align: "right" });
    y += isTotal ? 20 : 16;
  };
  totalRow("Subtotal", money(subtotal));
  totalRow("GST (18%)", money(gst));
  doc.setDrawColor(226, 232, 240).line(labelX - 10, y - 8, right, y - 8);
  totalRow("Total", money(total), true);

  // ---- Footer ----
  doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(148, 163, 184);
  doc.text(
    "This is a computer-generated invoice and does not require a signature.  " + (company.phone || ""),
    W / 2,
    802,
    { align: "center" }
  );

  const blob = doc.output("blob");
  return saveFile(filename || `${inv.id}.pdf`, blob, "application/pdf");
}

// Build a clean procurement report PDF directly with jsPDF (no html2canvas).
export async function downloadReportPdf({ kpis = [], categories = [], topVendors = [] }, filename = "wolf-report.pdf") {
  const jspdfMod = await import("jspdf");
  const JsPDF = jspdfMod.jsPDF || jspdfMod.default;
  const doc = new JsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 42;
  const right = W - M;
  const money = (n) => "INR " + Number(n || 0).toLocaleString("en-IN");
  let y = 58;

  const newPageIfNeeded = () => {
    if (y > H - 60) { doc.addPage(); y = 58; }
  };
  const heading = (title) => {
    newPageIfNeeded();
    doc.setFont("helvetica", "bold").setFontSize(12).setTextColor(30, 41, 59);
    doc.text(title, M, y);
    y += 8;
    doc.setDrawColor(226, 232, 240).line(M, y, right, y);
    y += 20;
  };
  const row = (label, value) => {
    newPageIfNeeded();
    doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(71, 85, 105);
    doc.text(String(label), M, y);
    doc.setFont("helvetica", "bold").setTextColor(15, 23, 42);
    doc.text(String(value), right, y, { align: "right" });
    y += 16;
    doc.setDrawColor(241, 245, 249).line(M, y - 5, right, y - 5);
    y += 4;
  };

  // ---- Title ----
  doc.setFont("helvetica", "bold").setFontSize(20).setTextColor(15, 23, 42);
  doc.text("Wolf ERP — Procurement Report", M, y);
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(100, 116, 139);
  doc.text("Generated " + new Date().toLocaleString("en-IN"), M, y + 16);
  y += 44;

  heading("Key metrics");
  kpis.forEach((k) => row(k.label, k.value));
  y += 16;

  heading("Spend by category");
  if (categories.length === 0) row("No spend recorded yet", "");
  categories.forEach((c) => row(c.category, money(c.amount)));
  y += 16;

  heading("Top vendors by spend");
  if (topVendors.length === 0) row("No vendor spend yet", "");
  topVendors.forEach((v, i) => row(`${i + 1}. ${v.vendor}  (${v.orders} orders)`, money(v.amount)));

  const blob = doc.output("blob");
  return saveFile(filename, blob, "application/pdf");
}
