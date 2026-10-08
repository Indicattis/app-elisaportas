import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { ItemTabelaPreco } from "@/hooks/useTabelaPrecos";
import type { CustoItem } from "@/hooks/useCustosItens";

const fmtBRL = (n: number) =>
  Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const hoje = () => new Date().toISOString().slice(0, 10);

function kitTotal(i: ItemTabelaPreco) {
  return Number(i.valor_porta || 0) + Number(i.valor_instalacao || 0) + Number(i.valor_pintura || 0);
}

export type KitLucros = {
  lucroPorta: number | null;
  lucroInstalacao: number | null;
  lucroPintura: number | null;
};

export type KitLucrosMap = Record<string, KitLucros>;

const fmtBRLorDash = (n: number | null) => (n === null ? "-" : fmtBRL(n));

function lucroTotal(l: KitLucros | undefined): number | null {
  if (!l) return null;
  const parts = [l.lucroPorta, l.lucroInstalacao, l.lucroPintura].filter((v): v is number => v !== null);
  if (parts.length === 0) return null;
  return parts.reduce((a, b) => a + b, 0);
}

function agruparPorCategoria(itens: CustoItem[]) {
  const map = new Map<string, CustoItem[]>();
  itens.forEach((it) => {
    const cat = it.categoria?.trim() || "Sem categoria";
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(it);
  });
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b, "pt-BR"));
}

export function exportEstrategiaPrecosPDF(kits: ItemTabelaPreco[], itensAvulso: CustoItem[] = [], lucros: KitLucrosMap = {}) {
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
    head: [["#", "Descrição", "L (m)", "A (m)", "Porta", "Instalação", "Pintura", "Total", "Lucro Porta", "Lucro Inst.", "Lucro Pint.", "Lucro Total"]],
    body: kits.map((k, idx) => {
      const l = lucros[k.id];
      return [
        String(idx + 1),
        k.descricao,
        String(k.largura ?? ""),
        String(k.altura ?? ""),
        fmtBRL(k.valor_porta),
        fmtBRL(k.valor_instalacao),
        fmtBRL(k.valor_pintura),
        fmtBRL(kitTotal(k)),
        fmtBRLorDash(l?.lucroPorta ?? null),
        fmtBRLorDash(l?.lucroInstalacao ?? null),
        fmtBRLorDash(l?.lucroPintura ?? null),
        fmtBRLorDash(lucroTotal(l)),
      ];
    }),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [30, 41, 59], fontSize: 8 },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      2: { halign: "center", cellWidth: 14 },
      3: { halign: "center", cellWidth: 14 },
      4: { halign: "right" },
      5: { halign: "right" },
      6: { halign: "right" },
      7: { halign: "right", fontStyle: "bold" },
      8: { halign: "right" },
      9: { halign: "right" },
      10: { halign: "right" },
      11: { halign: "right", fontStyle: "bold" },
    },
  });

  if (itensAvulso.length > 0) {
    const grupos = agruparPorCategoria(itensAvulso);
    let cursorY = (doc as any).lastAutoTable.finalY + 8;

    if (cursorY > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage();
      cursorY = 14;
    }
    doc.setFontSize(12);
    doc.text("Itens Avulso", 14, cursorY);
    cursorY += 4;

    grupos.forEach(([categoria, lista]) => {
      autoTable(doc, {
        startY: cursorY,
        head: [[
          { content: `${categoria} (${lista.length})`, colSpan: 3, styles: { halign: "left", fillColor: [30, 41, 59], textColor: 255 } },
        ]],
        body: [],
        theme: "plain",
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
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [51, 65, 85], textColor: 255 },
        columnStyles: {
          0: { cellWidth: "auto" },
          1: { cellWidth: 30, halign: "center" },
          2: { cellWidth: 40, halign: "right", fontStyle: "bold" },
        },
        margin: { left: 14, right: 14 },
        theme: "striped",
      });
      cursorY = (doc as any).lastAutoTable.finalY + 4;
    });
  }

  doc.save(`tabela-precos-${hoje()}.pdf`);
}

export function exportEstrategiaPrecosExcel(kits: ItemTabelaPreco[], itensAvulso: CustoItem[] = []) {
  const wb = XLSX.utils.book_new();

  const kitsRows = [
    ["#", "Descrição", "Largura (m)", "Altura (m)", "Porta", "Instalação", "Pintura", "Total"],
    ...kits.map((k, idx) => [
      idx + 1,
      k.descricao,
      Number(k.largura || 0),
      Number(k.altura || 0),
      Number(k.valor_porta || 0),
      Number(k.valor_instalacao || 0),
      Number(k.valor_pintura || 0),
      kitTotal(k),
    ]),
  ];
  const wsKits = XLSX.utils.aoa_to_sheet(kitsRows);
  wsKits["!cols"] = [{ wch: 5 }, { wch: 40 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }];
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