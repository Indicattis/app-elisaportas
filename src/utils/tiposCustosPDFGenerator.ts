import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { TipoCusto } from "@/hooks/useTiposCustos";
import type { CategoriaDespesa } from "@/hooks/useDespesasCategorias";
import { supabase } from "@/integrations/supabase/client";

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export async function exportTiposCustosPDF(
  titulo: string,
  items: TipoCusto[],
  categorias: CategoriaDespesa[],
  opts?: {
    contagemGastos?: Record<string, number>;
    totaisGastos?: Record<string, number>;
    mesReferencia?: string | null;
  },
) {
  const contagemGastos = opts?.contagemGastos ?? {};
  const totaisGastos = opts?.totaisGastos ?? {};
  const mesReferencia = opts?.mesReferencia ?? null;

  // Pre-carregar gastos individuais por tipo (se houver mês selecionado)
  const gastosPorTipo: Record<string, Array<{ data: string; descricao: string | null; valor: number }>> = {};
  if (mesReferencia) {
    const [y, m] = mesReferencia.split("-").map(Number);
    const start = `${mesReferencia}-01`;
    const end = new Date(y, m, 0).toISOString().split("T")[0];
    const ids = items.map((i) => i.id);
    if (ids.length > 0) {
      const { data } = await supabase
        .from("gastos" as any)
        .select("tipo_custo_id, data, descricao, valor")
        .in("tipo_custo_id", ids)
        .gte("data", start)
        .lte("data", end)
        .order("data", { ascending: true });
      (data as any[] | null)?.forEach((g) => {
        (gastosPorTipo[g.tipo_custo_id] ||= []).push({
          data: g.data,
          descricao: g.descricao,
          valor: Number(g.valor) || 0,
        });
      });
    }
  }

  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.width;
  const pageHeight = pdf.internal.pageSize.height;
  const margin = 10;
  let y = 15;

  const primaryColor: [number, number, number] = [41, 128, 185];
  const grayColor: [number, number, number] = [128, 128, 128];

  pdf.setFont("helvetica", "normal");

  // Header / logo
  try {
    pdf.addImage(
      "/lovable-uploads/9f8b49f3-817e-40f0-87b0-856e0cbe536a.png",
      "PNG",
      margin,
      y - 10,
      60,
      25,
    );
  } catch {
    pdf.setFontSize(20);
    pdf.setTextColor(...primaryColor);
    pdf.setFont("helvetica", "bold");
    pdf.text("ELISA PORTAS LTDA", margin, y);
  }

  pdf.setFontSize(8);
  pdf.setTextColor(0, 0, 0);
  ["Rua Padre Elio Baron Toaldo, 571", "95055652 - Caxias do Sul, RS", "CNPJ: 59.277.825/0001-09"]
    .forEach((info, i) => pdf.text(info, pageWidth - margin - 60, y + i * 5));

  pdf.setDrawColor(...grayColor);
  pdf.setLineWidth(0.5);
  pdf.line(margin, y + 15, pageWidth - margin, y + 15);
  y += 25;

  // Title
  pdf.setFontSize(16);
  pdf.setTextColor(0, 0, 0);
  pdf.setFont("helvetica", "bold");
  pdf.text(titulo.toUpperCase(), margin, y);

  pdf.setFontSize(10);
  pdf.setTextColor(...grayColor);
  pdf.setFont("helvetica", "normal");
  pdf.text(
    `Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
    margin,
    y + 7,
  );
  y += 14;

  const categoriaPorId = new Map(categorias.map((c) => [c.id, c.nome]));
  const grupos: Array<{ nome: string; rows: TipoCusto[] }> = [];
  categorias.forEach((cat) => {
    const rows = items.filter((i) => i.categoria_id === cat.id);
    if (rows.length > 0) grupos.push({ nome: cat.nome, rows });
  });
  const semCat = items.filter((i) => !i.categoria_id);
  if (semCat.length > 0) grupos.push({ nome: "Sem categoria", rows: semCat });

  const head = [["Nome", "Categoria", "Gastos", "Total gasto", "Valor projetado"]];
  const columnStyles: Record<number, any> = {
    0: { cellWidth: 55 },
    1: { cellWidth: "auto" },
    2: { cellWidth: 18, halign: "center" },
    3: { cellWidth: 32, halign: "right" },
    4: { cellWidth: 32, halign: "right" },
  };

  let totalGastoGeral = 0;
  let totalProjetadoGeral = 0;

  grupos.forEach(({ nome, rows }) => {
    if (y + 25 > pageHeight - 20) {
      pdf.addPage();
      y = 20;
    }

    pdf.setFontSize(11);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont("helvetica", "bold");
    pdf.text(`${nome}  (${rows.length})`, margin, y);
    y += 4;

    let subtotalGasto = 0;
    let subtotalProjetado = 0;
    const body: any[] = [];
    rows.forEach((r) => {
      const projetado = Number(r.valor_maximo_mensal || 0);
      const totalGasto = Number(totaisGastos[r.id] || 0);
      const qtd = Number(contagemGastos[r.id] || 0);
      subtotalGasto += totalGasto;
      subtotalProjetado += projetado;
      totalGastoGeral += totalGasto;
      totalProjetadoGeral += projetado;
      body.push([
        r.nome,
        categoriaPorId.get(r.categoria_id || "") || "-",
        String(qtd),
        fmtBRL(totalGasto),
        fmtBRL(projetado),
      ]);

      const lancamentos = gastosPorTipo[r.id] || [];
      lancamentos.forEach((g) => {
        body.push([
          {
            content: `   ↳ ${format(new Date(g.data + "T12:00:00"), "dd/MM/yyyy")}`,
            styles: { fontStyle: "italic", textColor: [110, 110, 110], fillColor: [250, 250, 250] },
          },
          {
            content: g.descricao || "-",
            colSpan: 2,
            styles: { fontStyle: "italic", textColor: [110, 110, 110], fillColor: [250, 250, 250] },
          },
          {
            content: fmtBRL(g.valor),
            styles: { halign: "right", fontStyle: "italic", textColor: [110, 110, 110], fillColor: [250, 250, 250] },
          },
          { content: "", styles: { fillColor: [250, 250, 250] } },
        ]);
      });
    });

    body.push([
      {
        content: "Subtotal da categoria",
        colSpan: 3,
        styles: { halign: "right", fontStyle: "bold", fillColor: [240, 240, 240] },
      } as any,
      {
        content: fmtBRL(subtotalGasto),
        styles: { halign: "right", fontStyle: "bold", fillColor: [240, 240, 240] },
      } as any,
      {
        content: fmtBRL(subtotalProjetado),
        styles: { halign: "right", fontStyle: "bold", fillColor: [240, 240, 240] },
      } as any,
    ]);

    autoTable(pdf, {
      head,
      body,
      startY: y + 2,
      styles: {
        fontSize: 8,
        cellPadding: 1.6,
        valign: "middle",
        lineColor: [220, 220, 220],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8,
        halign: "center",
      },
      columnStyles,
      margin: { left: margin, right: margin },
      theme: "striped",
      alternateRowStyles: { fillColor: [248, 248, 248] },
    });

    y = ((pdf as any).lastAutoTable?.finalY || y) + 8;
  });

  // Grand totals
  if (y + 30 > pageHeight - 20) {
    pdf.addPage();
    y = 20;
  }
  pdf.setDrawColor(...grayColor);
  pdf.setLineWidth(0.3);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 7;

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(80, 80, 80);
  pdf.text("Total gasto no mês:", margin, y);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0, 0, 0);
  pdf.text(fmtBRL(totalGastoGeral), margin + 50, y);

  pdf.setFontSize(12);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(80, 80, 80);
  pdf.text("Total projetado:", pageWidth - margin - 70, y);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0, 0, 0);
  pdf.text(fmtBRL(totalProjetadoGeral), pageWidth - margin, y, { align: "right" });

  // Footer
  pdf.setFontSize(8);
  pdf.setTextColor(...grayColor);
  pdf.setFont("helvetica", "normal");
  pdf.text(
    "Elisa Portas LTDA - A maior fábrica de portas de enrolar do Sul do País",
    margin,
    pageHeight - 15,
  );
  pdf.text("Contato: comercial@elisaportas.com.br", margin, pageHeight - 10);

  pdf.save(`${slug(titulo)}-${format(new Date(), "dd-MM-yyyy")}.pdf`);
}