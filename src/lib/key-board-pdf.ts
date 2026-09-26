import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { KEY_BOARD_SLOT_COUNT, type KeyBoardSlot } from "./key-board-api";

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 10;

function normalize(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function drawHeader(doc: jsPDF, title: string, subtitle: string) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(20, 20, 20);
  doc.text(title, MARGIN, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110, 110, 110);
  doc.text(subtitle, MARGIN, 22);
  doc.setDrawColor(200, 200, 200);
  doc.line(MARGIN, 25, PAGE_W - MARGIN, 25);
}

function drawGrid(doc: jsPDF, slots: KeyBoardSlot[]) {
  const byNumber = new Map(slots.map((s) => [s.slot_number, s]));
  const cols = 6;
  const rows = Math.ceil(KEY_BOARD_SLOT_COUNT / cols);
  const gap = 2;
  const top = 30;
  const availableH = PAGE_H - top - MARGIN;
  const cellW = (PAGE_W - MARGIN * 2 - gap * (cols - 1)) / cols;
  const cellH = (availableH - gap * (rows - 1)) / rows;

  for (let n = 1; n <= KEY_BOARD_SLOT_COUNT; n++) {
    const idx = n - 1;
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const x = MARGIN + col * (cellW + gap);
    const y = top + row * (cellH + gap);
    const slot = byNumber.get(n);

    if (slot) {
      doc.setFillColor(232, 240, 254);
      doc.setDrawColor(120, 150, 210);
    } else {
      doc.setFillColor(248, 248, 248);
      doc.setDrawColor(210, 210, 210);
    }
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, cellW, cellH, 1.2, 1.2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(slot ? 30 : 160, slot ? 60 : 160, slot ? 130 : 160);
    doc.text(String(n), x + 2, y + 5);

    if (slot) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(30, 30, 30);
      const lines = doc.splitTextToSize(slot.room_name, cellW - 4).slice(0, 2);
      doc.text(lines, x + 2, y + 9.5);
    } else {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(6.5);
      doc.setTextColor(170, 170, 170);
      doc.text("libre", x + 2, y + 9.5);
    }
  }
}

export function generateKeyBoardPdf(agencyLabel: string, slots: KeyBoardSlot[]) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const dateStr = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
  const subtitle = `Agence ${agencyLabel} · ${slots.length} / ${KEY_BOARD_SLOT_COUNT} emplacements occupés · édité le ${dateStr}`;

  // Page 1 : plan visuel du tableau
  drawHeader(doc, `Tableau à clés — ${agencyLabel}`, subtitle);
  drawGrid(doc, slots);

  // Page 2 : index alphabétique (pour retrouver une clé)
  doc.addPage();
  drawHeader(doc, `Index alphabétique — ${agencyLabel}`, "Retrouver rapidement le numéro du crochet à partir du nom du logement");
  const alpha = [...slots].sort((a, b) => (normalize(a.room_name) < normalize(b.room_name) ? -1 : 1));
  autoTable(doc, {
    startY: 29,
    head: [["Logement", "N°", "Adresse", "Clés", "Badges"]],
    body: alpha.map((s) => [s.room_name, String(s.slot_number), s.address || "", String(s.key_sets), String(s.badge_count)]),
    styles: { fontSize: 8.5, cellPadding: 1.6 },
    headStyles: { fillColor: [30, 60, 130], textColor: 255, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 60, fontStyle: "bold" },
      1: { cellWidth: 12, halign: "center", fontStyle: "bold" },
      3: { cellWidth: 12, halign: "center" },
      4: { cellWidth: 14, halign: "center" },
    },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: MARGIN, right: MARGIN },
  });

  // Page 3 : liste par numéro (avec notes)
  doc.addPage();
  drawHeader(doc, `Liste par numéro — ${agencyLabel}`, "Contenu de chaque crochet, du n°1 au n°" + KEY_BOARD_SLOT_COUNT);
  const byNumber = new Map(slots.map((s) => [s.slot_number, s]));
  const body: string[][] = [];
  for (let n = 1; n <= KEY_BOARD_SLOT_COUNT; n++) {
    const s = byNumber.get(n);
    body.push(
      s
        ? [String(n), s.room_name, s.address || "", String(s.key_sets), String(s.badge_count), s.notes || ""]
        : [String(n), "— libre —", "", "", "", ""],
    );
  }
  autoTable(doc, {
    startY: 29,
    head: [["N°", "Logement", "Adresse", "Clés", "Badges", "Notes"]],
    body,
    styles: { fontSize: 8, cellPadding: 1.4 },
    headStyles: { fillColor: [30, 60, 130], textColor: 255, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 10, halign: "center", fontStyle: "bold" },
      1: { cellWidth: 48 },
      3: { cellWidth: 11, halign: "center" },
      4: { cellWidth: 14, halign: "center" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.row.raw && (data.row.raw as string[])[1] === "— libre —") {
        data.cell.styles.textColor = [170, 170, 170];
        data.cell.styles.fontStyle = "italic";
      }
    },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: MARGIN, right: MARGIN },
  });

  // Pied de page
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(150, 150, 150);
    doc.text(`Hello Keys · Tableau à clés ${agencyLabel} · page ${i}/${pages}`, PAGE_W / 2, PAGE_H - 5, { align: "center" });
  }

  const fileName = `tableau-cles-${normalize(agencyLabel).replace(/[^a-z0-9]+/g, "-")}-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}
