import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { ItemTabelaPreco } from "@/hooks/useTabelaPrecos";

type RGB = [number, number, number];
const BG: RGB = [15, 23, 42];
const ROW: RGB = [22, 31, 52];
const ROW_ALT: RGB = [28, 38, 61];
const HEAD: RGB = [36, 48, 74];
const LINE: RGB = [51, 65, 85];
const TXT: RGB = [226, 232, 240];
const MUTED: RGB = [148, 163, 184];
export const PDF_CORES = {
  azul: [96, 165, 250] as RGB,
  verde: [52, 211, 153] as RGB,
  vermelho: [248, 113, 113] as RGB,
  laranja: [251, 146, 60] as RGB,
  rosa: [244, 114, 182] as RGB,
  ambar: [252, 211, 77] as RGB,
  claro: [203, 213, 225] as RGB,
  branco: [255, 255, 255] as RGB,
  apagado: [100, 116, 139] as RGB,
};
const pintarFundo = (doc: jsPDF) => {
  doc.setFillColor(...BG);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight(), "F");
};
const darkTable = {
  theme: "grid" as const,
  styles: { fillColor: ROW, textColor: TXT, lineColor: LINE, lineWidth: 0.1 },
  alternateRowStyles: { fillColor: ROW_ALT },
  headStyles: { fillColor: HEAD, textColor: MUTED, fontStyle: "bold" as const, lineColor: LINE, lineWidth: 0.1 },
  willDrawPage: (d: any) => { if (d.pageNumber > 1) pintarFundo(d.doc); },
};

const fmtBRL = (n: number) =>
  Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const hoje = () => new Date().toISOString().slice(0, 10);

function kitTotal(i: ItemTabelaPreco) {
  return Number(i.valor_porta || 0) + Number(i.valor_instalacao || 0) + Number(i.valor_pintura || 0);
}

export type ExportColuna = {
  label: string;
  pdf: (k: ItemTabelaPreco) => string;
  excel: (k: ItemTabelaPreco) => number | string | null;
  cor?: (k: ItemTabelaPreco) => [number, number, number];
  alinhar?: "left" | "center" | "right";
};

const COLUNAS_PADRAO: ExportColuna[] = [
  { label: "L (m)", pdf: (k) => String(k.largura ?? ""), excel: (k) => Number(k.largura || 0), alinhar: "center" },
  { label: "A (m)", pdf: (k) => String(k.altura ?? ""), excel: (k) => Number(k.altura || 0), alinhar: "center" },
  { label: "Porta", pdf: (k) => fmtBRL(k.valor_porta), excel: (k) => Number(k.valor_porta || 0) },
  { label: "Instalação", pdf: (k) => fmtBRL(k.valor_instalacao), excel: (k) => Number(k.valor_instalacao || 0) },
  { label: "Pintura", pdf: (k) => fmtBRL(k.valor_pintura), excel: (k) => Number(k.valor_pintura || 0) },
  { label: "Total", pdf: (k) => fmtBRL(kitTotal(k)), excel: (k) => kitTotal(k) },
];

export function exportEstrategiaPrecosPDF(kits: ItemTabelaPreco[], colunasIn: ExportColuna[] = []) {
  const colunas = colunasIn.length ? colunasIn : COLUNAS_PADRAO;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const data = new Date().toLocaleDateString("pt-BR");

  pintarFundo(doc);
  doc.setTextColor(...PDF_CORES.branco);
  doc.setFontSize(16);
  doc.text("Tabela de Preços — Estratégia", 14, 14);
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text(`Gerado em ${data}`, 14, 20);
  doc.setTextColor(...PDF_CORES.branco);

  // Section 1: Kits
  doc.setFontSize(12);
  doc.text("Kits de Portas", 14, 28);

  const fs = colunas.length > 10 ? 7 : 8;
  autoTable(doc, {
    ...darkTable,
    startY: 32,
    head: [["#", "Descrição", ...colunas.map((c) => c.label)]],
    body: kits.map((k, idx) => [String(idx + 1), k.descricao, ...colunas.map((c) => c.pdf(k))]),
    styles: { ...darkTable.styles, fontSize: fs, cellPadding: 2 },
    headStyles: { ...darkTable.headStyles, fontSize: fs },
    columnStyles: { 0: { halign: "center", cellWidth: 10, textColor: MUTED }, 1: { textColor: PDF_CORES.branco, fontStyle: "bold" } },
    didParseCell: (d: any) => {
      const ci = d.column.index - 2;
      if (ci < 0) return;
      const c = colunas[ci];
      d.cell.styles.halign = c.alinhar || "right";
      if (d.section !== "body") return;
      const k = kits[d.row.index];
      if (d.cell.raw === "-" || d.cell.raw === "—") { d.cell.styles.textColor = PDF_CORES.apagado; return; }
      if (c.cor) d.cell.styles.textColor = c.cor(k);
    },
  });

  doc.save(`tabela-precos-${hoje()}.pdf`);
}

export function exportEstrategiaPrecosExcel(kits: ItemTabelaPreco[], colunasIn: ExportColuna[] = []) {
  const colunas = colunasIn.length ? colunasIn : COLUNAS_PADRAO;
  const wb = XLSX.utils.book_new();

  const kitsRows = [
    ["#", "Descrição", ...colunas.map((c) => c.label)],
    ...kits.map((k, idx) => [idx + 1, k.descricao, ...colunas.map((c) => c.excel(k))]),
  ];
  const wsKits = XLSX.utils.aoa_to_sheet(kitsRows);
  wsKits["!cols"] = [{ wch: 5 }, { wch: 40 }, ...colunas.map(() => ({ wch: 16 }))];
  XLSX.utils.book_append_sheet(wb, wsKits, "Kits");

  XLSX.writeFile(wb, `tabela-precos-${hoje()}.xlsx`);
}

const FORNECEDORES_HEAD = ["#", "Descrição", "Largura", "Altura", "Preço sugerido", "Fornecedor 1", "Fornecedor 2", "Fornecedor 3", "Fornecedor 4", "Fornecedor 5", "Custo da Porta"];

export function exportPrecosFornecedoresPDF(kits: ItemTabelaPreco[], custoPorta: (k: ItemTabelaPreco) => number | null, preencherPrecoSugerido = false) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const data = new Date().toLocaleDateString("pt-BR");
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(16);
  doc.text("Tabela de Preços — Estratégia", 14, 14);
  doc.setFontSize(10);
  doc.setTextColor(110, 110, 110);
  doc.text(`Gerado em ${data}`, 14, 20);
  autoTable(doc, {
    theme: "grid",
    startY: 26,
    head: [FORNECEDORES_HEAD],
    body: kits.map((k, i) => {
      const c = custoPorta(k);
      const sugerido = preencherPrecoSugerido ? (c == null ? "—" : fmtBRL(c)) : "";
      return [String(i + 1), k.descricao, String(k.largura ?? ""), String(k.altura ?? ""), sugerido, "", "", "", "", "", c == null ? "—" : fmtBRL(c)];
    }),
    styles: { fontSize: 8, cellPadding: 2.5, textColor: [30, 30, 30], lineColor: [200, 200, 200], lineWidth: 0.1, minCellHeight: 8 },
    headStyles: { fillColor: [25, 118, 210], textColor: [255, 255, 255], fontStyle: "bold", halign: "center" },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles: {
      0: { halign: "center", cellWidth: 9 },
      1: { cellWidth: 52 },
      2: { halign: "center", cellWidth: 16 },
      3: { halign: "center", cellWidth: 16 },
      4: { cellWidth: 24 }, 5: { cellWidth: 23 }, 6: { cellWidth: 23 }, 7: { cellWidth: 23 }, 8: { cellWidth: 23 }, 9: { cellWidth: 23 },
      10: { halign: "right", cellWidth: 26, fontStyle: "bold" },
    },
    didParseCell: (d: any) => {
      if (preencherPrecoSugerido && d.section === "body" && d.column.index === 4) {
        d.cell.styles.halign = "right";
        d.cell.styles.fontStyle = "bold";
        d.cell.styles.textColor = [25, 118, 210];
      }
    },
    didDrawPage: (d: any) => {
      const h = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(130, 130, 130);
      doc.text(`${data} · Página ${d.pageNumber}`, doc.internal.pageSize.getWidth() - 14, h - 6, { align: "right" });
    },
  });
  doc.save(`tabela-precos-${hoje()}.pdf`);
}

export function exportPrecosFornecedoresExcel(kits: ItemTabelaPreco[], custoPorta: (k: ItemTabelaPreco) => number | null, preencherPrecoSugerido = false) {
  const wb = XLSX.utils.book_new();
  const rows = [
    FORNECEDORES_HEAD,
    ...kits.map((k, i) => {
      const c = custoPorta(k);
      return [i + 1, k.descricao, Number(k.largura || 0), Number(k.altura || 0), preencherPrecoSugerido ? c : null, null, null, null, null, null, c];
    }),
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 5 }, { wch: 40 }, { wch: 10 }, { wch: 10 }, ...Array(6).fill({ wch: 16 }), { wch: 16 }];
  const BRL = "R$ #,##0.00";
  rows.forEach((_, r) => {
    if (r === 0) return;
    ["E", "K"].forEach((col) => {
      const cell = ws[`${col}${r + 1}`];
      if (cell && typeof cell.v === "number") cell.z = BRL;
    });
  });
  XLSX.utils.book_append_sheet(wb, ws, "Kits");
  XLSX.writeFile(wb, `tabela-precos-${hoje()}.xlsx`);
}
