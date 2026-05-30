import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { TipoCusto } from "@/hooks/useTiposCustos";
import type { CategoriaDespesa } from "@/hooks/useDespesasCategorias";

const fmtBRL = (n: number) =>
  Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const hoje = () => new Date().toISOString().slice(0, 10);

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export function exportTiposCustosPDF(
  titulo: string,
  items: TipoCusto[],
  categorias: CategoriaDespesa[],
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const data = new Date().toLocaleDateString("pt-BR");

  doc.setFontSize(16);
  doc.text(titulo, 14, 14);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(`Gerado em ${data}`, 14, 20);
  doc.setTextColor(0);

  const grupos: Array<{ nome: string; rows: TipoCusto[] }> = [];
  categorias.forEach((cat) => {
    const rows = items.filter((i) => i.categoria_id === cat.id);
    if (rows.length > 0) grupos.push({ nome: cat.nome, rows });
  });
  const semCat = items.filter((i) => !i.categoria_id);
  if (semCat.length > 0) grupos.push({ nome: "Sem categoria", rows: semCat });

  let cursorY = 26;

  grupos.forEach(({ nome, rows }) => {
    autoTable(doc, {
      startY: cursorY,
      head: [[
        {
          content: `${nome} (${rows.length})`,
          colSpan: 6,
          styles: { halign: "left", fillColor: [30, 41, 59], textColor: 255 },
        },
      ]],
      body: [],
      theme: "plain",
      margin: { left: 10, right: 10 },
    });
    cursorY = (doc as any).lastAutoTable.finalY;

    autoTable(doc, {
      startY: cursorY,
      head: [["Nome", "Descrição", "Empresa", "Valor máx. mensal", "DRE", "Ativo"]],
      body: rows.map((r) => [
        r.nome,
        r.descricao || "-",
        (r as any).empresa_nome || (r as any).empresa?.nome || "-",
        fmtBRL(Number(r.valor_maximo_mensal || 0)),
        r.aparece_no_dre ? "Sim" : "Não",
        r.ativo ? "Sim" : "Não",
      ]),
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [51, 65, 85], textColor: 255, fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 55 },
        1: { cellWidth: "auto" },
        2: { cellWidth: 50 },
        3: { halign: "right", cellWidth: 36 },
        4: { halign: "center", cellWidth: 18 },
        5: { halign: "center", cellWidth: 18 },
      },
      margin: { left: 10, right: 10 },
      theme: "striped",
    });
    cursorY = (doc as any).lastAutoTable.finalY + 6;
  });

  const totalAtivos = items
    .filter((i) => i.ativo)
    .reduce((s, i) => s + Number(i.valor_maximo_mensal || 0), 0);

  autoTable(doc, {
    startY: cursorY,
    head: [["TOTAL MENSAL ESTIMADO (ATIVOS)", "", "", fmtBRL(totalAtivos), "", ""]],
    body: [],
    styles: { fontSize: 10, fontStyle: "bold" },
    headStyles: { fillColor: [15, 23, 42], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: "auto" },
      2: { cellWidth: 50 },
      3: { halign: "right", cellWidth: 36 },
      4: { cellWidth: 18 },
      5: { cellWidth: 18 },
    },
    margin: { left: 10, right: 10 },
  });

  doc.save(`tipos-custos-${slug(titulo)}-${hoje()}.pdf`);
}