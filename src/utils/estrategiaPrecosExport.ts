import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { ItemTabelaPreco } from "@/hooks/useTabelaPrecos";
import type { ProdutoCatalogo } from "@/hooks/useVendasCatalogo";

const fmtBRL = (n: number) =>
  Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const hoje = () => new Date().toISOString().slice(0, 10);

function kitTotal(i: ItemTabelaPreco) {
  return Number(i.valor_porta || 0) + Number(i.valor_instalacao || 0) + Number(i.valor_pintura || 0);
}

function groupCatalogo(produtos: ProdutoCatalogo[]): Array<[string, ProdutoCatalogo[]]> {
  const map = new Map<string, ProdutoCatalogo[]>();
  for (const p of produtos) {
    const key = (p.categoria || "").trim() || "Sem categoria";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }
  return Array.from(map.entries());
}

export function exportEstrategiaPrecosPDF(kits: ItemTabelaPreco[], catalogo: ProdutoCatalogo[]) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const data = new Date().toLocaleDateString("pt-BR");

  doc.setFontSize(16);
  doc.text("Tabela de Preços — Estratégia", 14, 14);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`Gerado em ${data}`, 14, 20);
  doc.setTextColor(0);

  // Section 1: Kits
  doc.setFontSize(12);
  doc.text("Kits de Portas", 14, 28);

  autoTable(doc, {
    startY: 32,
    head: [["#", "Descrição", "Porta", "Instalação", "Pintura", "Total"]],
    body: kits.map((k, idx) => [
      String(idx + 1),
      k.descricao,
      fmtBRL(k.valor_porta),
      fmtBRL(k.valor_instalacao),
      fmtBRL(k.valor_pintura),
      fmtBRL(kitTotal(k)),
    ]),
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [30, 41, 59] },
    columnStyles: {
      0: { halign: "center", cellWidth: 12 },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right", fontStyle: "bold" },
    },
  });

  // Section 2: Catálogo
  const grupos = groupCatalogo(catalogo);
  let cursorY = (doc as any).lastAutoTable.finalY + 10;

  if (cursorY > 180) {
    doc.addPage();
    cursorY = 14;
  }
  doc.setFontSize(12);
  doc.text("Catálogo", 14, cursorY);
  cursorY += 4;

  for (const [categoria, produtos] of grupos) {
    autoTable(doc, {
      startY: cursorY,
      head: [[categoria, "Unidade", "Custo", "Preço de Venda"]],
      body: produtos.map((p) => [
        p.nome_produto,
        p.unidade || "Un",
        fmtBRL(Number(p.custo_produto || 0)),
        fmtBRL(Number(p.preco_venda || 0)),
      ]),
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [51, 65, 85] },
      columnStyles: {
        1: { halign: "center", cellWidth: 25 },
        2: { halign: "right", cellWidth: 35 },
        3: { halign: "right", cellWidth: 40 },
      },
    });
    cursorY = (doc as any).lastAutoTable.finalY + 6;
  }

  doc.save(`tabela-precos-${hoje()}.pdf`);
}

export function exportEstrategiaPrecosExcel(kits: ItemTabelaPreco[], catalogo: ProdutoCatalogo[]) {
  const wb = XLSX.utils.book_new();

  const kitsRows = [
    ["#", "Descrição", "Porta", "Instalação", "Pintura", "Total"],
    ...kits.map((k, idx) => [
      idx + 1,
      k.descricao,
      Number(k.valor_porta || 0),
      Number(k.valor_instalacao || 0),
      Number(k.valor_pintura || 0),
      kitTotal(k),
    ]),
  ];
  const wsKits = XLSX.utils.aoa_to_sheet(kitsRows);
  wsKits["!cols"] = [{ wch: 5 }, { wch: 40 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, wsKits, "Kits");

  const grupos = groupCatalogo(catalogo);
  const catRows: (string | number)[][] = [["Categoria", "Produto", "Unidade", "Custo", "Preço de Venda"]];
  for (const [categoria, produtos] of grupos) {
    for (const p of produtos) {
      catRows.push([
        categoria,
        p.nome_produto,
        p.unidade || "Un",
        Number(p.custo_produto || 0),
        Number(p.preco_venda || 0),
      ]);
    }
  }
  const wsCat = XLSX.utils.aoa_to_sheet(catRows);
  wsCat["!cols"] = [{ wch: 24 }, { wch: 40 }, { wch: 10 }, { wch: 14 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsCat, "Catálogo");

  XLSX.writeFile(wb, `tabela-precos-${hoje()}.xlsx`);
}