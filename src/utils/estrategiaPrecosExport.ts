import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { ItemTabelaPreco } from "@/hooks/useTabelaPrecos";
import type { CustoItem } from "@/hooks/useCustosItens";

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

function agruparPorCategoria(itens: CustoItem[]) {
  const map = new Map<string, CustoItem[]>();
  itens.forEach((it) => {
    const cat = it.categoria?.trim() || "Sem categoria";
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(it);
  });
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b, "pt-BR"));
}

export function exportEstrategiaPrecosPDF(kits: ItemTabelaPreco[], itensAvulso: CustoItem[] = [], colunasIn: ExportColuna[] = []) {
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

  if (itensAvulso.length > 0) {
    const grupos = agruparPorCategoria(itensAvulso);
    let cursorY = (doc as any).lastAutoTable.finalY + 8;

    if (cursorY > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage();
      pintarFundo(doc);
      cursorY = 14;
    }
    doc.setFontSize(12);
    doc.setTextColor(...PDF_CORES.branco);
    doc.text("Itens Avulso", 14, cursorY);
    cursorY += 4;

    grupos.forEach(([categoria, lista]) => {
      autoTable(doc, {
        startY: cursorY,
        head: [[
          { content: `${categoria} (${lista.length})`, colSpan: 3, styles: { halign: "left", fillColor: HEAD, textColor: PDF_CORES.branco } },
        ]],
        body: [],
        theme: "plain",
        willDrawPage: darkTable.willDrawPage,
        margin: { left: 14, right: 14 },
      });
      cursorY = (doc as any).lastAutoTable.finalY;

      autoTable(doc, {
        startY: cursorY,
        head: [["Nome", "Un.", "Preço/un"]],
        body: lista.map((it) => [
          it.descricao,
          it.unidade || "-",
          fmtBRL(Number(it.preco_venda || 0)),
        ]),
        ...darkTable,
        styles: { ...darkTable.styles, fontSize: 9, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: "auto" },
          1: { cellWidth: 30, halign: "center" },
          2: { cellWidth: 40, halign: "right", fontStyle: "bold", textColor: PDF_CORES.verde },
        },
        margin: { left: 14, right: 14 },
      });
      cursorY = (doc as any).lastAutoTable.finalY + 4;
    });
  }

  doc.save(`tabela-precos-${hoje()}.pdf`);
}

export function exportEstrategiaPrecosExcel(kits: ItemTabelaPreco[], itensAvulso: CustoItem[] = [], colunasIn: ExportColuna[] = []) {
  const colunas = colunasIn.length ? colunasIn : COLUNAS_PADRAO;
  const wb = XLSX.utils.book_new();

  const kitsRows = [
    ["#", "Descrição", ...colunas.map((c) => c.label)],
    ...kits.map((k, idx) => [idx + 1, k.descricao, ...colunas.map((c) => c.excel(k))]),
  ];
  const wsKits = XLSX.utils.aoa_to_sheet(kitsRows);
  wsKits["!cols"] = [{ wch: 5 }, { wch: 40 }, ...colunas.map(() => ({ wch: 16 }))];
  XLSX.utils.book_append_sheet(wb, wsKits, "Kits");

  if (itensAvulso.length > 0) {
    const avulsoRows: (string | number)[][] = [
      ["Categoria", "Nome", "Unidade", "Preço/un"],
      ...itensAvulso.map((it) => [
        it.categoria || "Sem categoria",
        it.descricao,
        it.unidade || "-",
        Number(it.preco_venda || 0),
      ]),
    ];
    const wsAvulso = XLSX.utils.aoa_to_sheet(avulsoRows);
    wsAvulso["!cols"] = [{ wch: 22 }, { wch: 40 }, { wch: 12 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, wsAvulso, "Itens Avulso");
  }

  XLSX.writeFile(wb, `tabela-precos-${hoje()}.xlsx`);
}