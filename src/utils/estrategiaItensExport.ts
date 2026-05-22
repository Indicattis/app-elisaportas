import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { CustoItem } from "@/hooks/useCustosItens";

export type GrupoItens = [string, CustoItem[]];

const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function calcLinha(item: CustoItem) {
  const custo = Number(item.custo_unitario || 0);
  const qtd = Number(item.quantidade || 0);
  const totalCusto = custo * qtd;
  const preco = Number(item.preco_venda || 0);
  const tImp = Number(item.taxa_impostos || 0);
  const tDesc = Number(item.taxa_descontos || 0);
  const tCard = Number(item.taxa_cartao || 0);
  const vImp = preco * (tImp / 100);
  const vDesc = preco * (tDesc / 100);
  const vCard = preco * (tCard / 100);
  const lucro = preco - custo - (vImp + vDesc + vCard);
  return { custo, totalCusto, preco, vImp, vDesc, vCard, lucro };
}

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

export function exportEstrategiaItensPDF(grupos: GrupoItens[]) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const data = new Date().toLocaleDateString("pt-BR");

  doc.setFontSize(16);
  doc.text("Itens — Estratégia", 14, 14);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`Gerado em ${data}`, 14, 20);
  doc.setTextColor(0);

  let cursorY = 26;
  let totCusto = 0;
  let totLucro = 0;
  let totVenda = 0;

  grupos.forEach(([categoria, itens]) => {
    const body = itens.map((it) => {
      const c = calcLinha(it);
      totCusto += c.totalCusto;
      totLucro += c.lucro;
      totVenda += c.preco;
      return [
        it.descricao,
        fmtBRL(c.custo),
        fmtBRL(c.totalCusto),
        fmtBRL(c.lucro),
        fmtBRL(c.vImp),
        fmtBRL(c.vDesc),
        fmtBRL(c.vCard),
        fmtBRL(c.preco),
      ];
    });

    autoTable(doc, {
      startY: cursorY,
      head: [[
        { content: `${categoria} (${itens.length})`, colSpan: 8, styles: { halign: "left", fillColor: [30, 41, 59], textColor: 255 } },
      ]],
      body: [],
      theme: "plain",
      margin: { left: 10, right: 10 },
    });
    cursorY = (doc as any).lastAutoTable.finalY;

    autoTable(doc, {
      startY: cursorY,
      head: [["Descrição", "Custo", "Total Custo", "Lucro", "Imposto", "Desc. Gerente", "Cartão", "Valor de Venda"]],
      body,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [51, 65, 85], textColor: 255, fontSize: 8 },
      columnStyles: {
        0: { cellWidth: "auto" },
        1: { halign: "right", cellWidth: 28 },
        2: { halign: "right", cellWidth: 28 },
        3: { halign: "right", cellWidth: 28 },
        4: { halign: "right", cellWidth: 28 },
        5: { halign: "right", cellWidth: 32 },
        6: { halign: "right", cellWidth: 28 },
        7: { halign: "right", cellWidth: 32 },
      },
      margin: { left: 10, right: 10 },
      theme: "striped",
    });
    cursorY = (doc as any).lastAutoTable.finalY + 6;
  });

  autoTable(doc, {
    startY: cursorY,
    head: [["TOTAL", "Custo", "Total Custo", "Lucro", "", "", "", "Valor de Venda"]],
    body: [["", "", fmtBRL(totCusto), fmtBRL(totLucro), "", "", "", fmtBRL(totVenda)]],
    styles: { fontSize: 9, fontStyle: "bold", cellPadding: 2 },
    headStyles: { fillColor: [15, 23, 42], textColor: 255 },
    columnStyles: {
      2: { halign: "right" },
      3: { halign: "right" },
      7: { halign: "right" },
    },
    margin: { left: 10, right: 10 },
  });

  doc.save(`itens-estrategia-${hoje()}.pdf`);
}

export function exportEstrategiaItensExcel(grupos: GrupoItens[]) {
  const rows: (string | number)[][] = [];
  rows.push([
    "Categoria",
    "Descrição",
    "Custo",
    "Total Custo",
    "Lucro",
    "Imposto (R$)",
    "Desc. Gerente (R$)",
    "Cartão (R$)",
    "Valor de Venda",
  ]);

  let totCusto = 0;
  let totLucro = 0;
  let totVenda = 0;

  grupos.forEach(([categoria, itens]) => {
    itens.forEach((it) => {
      const c = calcLinha(it);
      totCusto += c.totalCusto;
      totLucro += c.lucro;
      totVenda += c.preco;
      rows.push([
        categoria,
        it.descricao,
        c.custo,
        c.totalCusto,
        c.lucro,
        c.vImp,
        c.vDesc,
        c.vCard,
        c.preco,
      ]);
    });
  });

  rows.push([]);
  rows.push(["TOTAL", "", "", totCusto, totLucro, "", "", "", totVenda]);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // formato moeda nas colunas numéricas
  const moneyFmt = 'R$ #,##0.00;[Red](R$ #,##0.00);"-"';
  const range = XLSX.utils.decode_range(ws["!ref"] as string);
  for (let R = 1; R <= range.e.r; ++R) {
    for (const C of [2, 3, 4, 5, 6, 7, 8]) {
      const ref = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[ref];
      if (cell && typeof cell.v === "number") {
        cell.t = "n";
        cell.z = moneyFmt;
      }
    }
  }

  ws["!cols"] = [
    { wch: 22 },
    { wch: 40 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 18 },
    { wch: 14 },
    { wch: 16 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Itens");
  XLSX.writeFile(wb, `itens-estrategia-${hoje()}.xlsx`);
}