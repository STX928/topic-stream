import jsPDF from "jspdf";

export type PdfRow = { name: string; topic: string; timestamp: string };

// Terminal Handshake palette, translated to RGB for the PDF canvas.
const INK: [number, number, number] = [10, 14, 18];
const PANEL: [number, number, number] = [17, 23, 29];
const EDGE: [number, number, number] = [40, 52, 61];
const SIGNAL: [number, number, number] = [45, 226, 199];
const TEXT: [number, number, number] = [232, 240, 240];
const MUTE: [number, number, number] = [140, 158, 165];

const W = 210;
const H = 297;
const M = 16;

function background(doc: jsPDF) {
  doc.setFillColor(...INK);
  doc.rect(0, 0, W, H, "F");
  // faint grid — mobile-computing mesh
  doc.setDrawColor(24, 33, 40);
  doc.setLineWidth(0.2);
  for (let x = M; x <= W - M; x += 10) doc.line(x, 0, x, H);
  for (let y = 0; y <= H; y += 10) doc.line(M, y, W - M, y);
}

function header(doc: jsPDF, total: number, generated: string) {
  doc.setFillColor(...PANEL);
  doc.roundedRect(M, M, W - M * 2, 26, 2, 2, "F");
  doc.setDrawColor(...EDGE);
  doc.roundedRect(M, M, W - M * 2, 26, 2, 2, "S");

  doc.setFillColor(...SIGNAL);
  doc.circle(M + 7, M + 9, 1.4, "F");

  doc.setFont("courier", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...SIGNAL);
  doc.text("/ PACKET.RELAY  ·  SUBMISSION MANIFEST", M + 12, M + 10);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...TEXT);
  doc.text("Students & Topics", M + 6, M + 20);

  doc.setFont("courier", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTE);
  doc.text(`records: ${String(total).padStart(3, "0")}`, W - M - 6, M + 10, { align: "right" });
  doc.text(`exported: ${generated}`, W - M - 6, M + 20, { align: "right" });
}

function tableHead(doc: jsPDF, y: number) {
  doc.setFillColor(...PANEL);
  doc.rect(M, y, W - M * 2, 8, "F");
  doc.setFont("courier", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...MUTE);
  doc.text("#", M + 4, y + 5.4);
  doc.text("STUDENT", M + 12, y + 5.4);
  doc.text("TOPIC", M + 68, y + 5.4);
  doc.text("TIMESTAMP", W - M - 4, y + 5.4, { align: "right" });
  return y + 8;
}

export function exportSubmissionsPdf(rows: PdfRow[]) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const generated = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

  background(doc);
  header(doc, rows.length, generated);
  let y = tableHead(doc, M + 34);

  const startPage = () => {
    doc.addPage();
    background(doc);
    y = tableHead(doc, M);
  };

  rows.forEach((r, i) => {
    const topicLines = doc.splitTextToSize(r.topic || "—", 62) as string[];
    const nameLines = doc.splitTextToSize(r.name, 52) as string[];
    const lines = Math.max(topicLines.length, nameLines.length);
    const rowH = 5 + lines * 4;

    if (y + rowH > H - M - 10) startPage();

    if (i % 2 === 1) {
      doc.setFillColor(14, 19, 24);
      doc.rect(M, y, W - M * 2, rowH, "F");
    }
    doc.setDrawColor(...EDGE);
    doc.setLineWidth(0.1);
    doc.line(M, y + rowH, W - M, y + rowH);

    doc.setFont("courier", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...SIGNAL);
    doc.text(String(i + 1).padStart(2, "0"), M + 4, y + 6);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...TEXT);
    nameLines.forEach((l, k) => doc.text(l, M + 12, y + 6 + k * 4));

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MUTE);
    topicLines.forEach((l, k) => doc.text(l, M + 68, y + 6 + k * 4));

    doc.setFont("courier", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MUTE);
    doc.text(r.timestamp, W - M - 4, y + 6, { align: "right" });

    y += rowH;
  });

  if (rows.length === 0) {
    doc.setFont("courier", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTE);
    doc.text("no submissions recorded", M + 4, y + 7);
  }

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(...SIGNAL);
    doc.setLineWidth(0.6);
    doc.line(M, H - M - 4, M + 18, H - M - 4);
    doc.setFont("courier", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MUTE);
    doc.text(`page ${p} / ${pages}`, W - M, H - M - 3, { align: "right" });
    doc.text("end of transmission", M + 22, H - M - 3);
  }

  doc.save(`submissions-${generated.replace(/[: ]/g, "-")}.pdf`);
}
