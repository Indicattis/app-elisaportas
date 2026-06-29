import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { TipoCusto } from "@/hooks/useTiposCustos";
import type { CategoriaDespesa } from "@/hooks/useDespesasCategorias";

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
  const totaisGastos = opts?.totaisGastos ?? {};

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

  const head = [["Nome", "Total gasto", "Valor projetado"]];
  const columnStyles: Record<number, any> = {
    0: { cellWidth: "auto" },
    1: { cellWidth: 40, halign: "right" },
    2: { cellWidth: 40, halign: "right" },
  };

  let totalGastoGeral = 0;
  let totalProjetadoGeral = 0;

  const rows = items;
  const body: any[] = [];
  rows.forEach((r, idx) => {
    const projetado = Number(r.valor_maximo_mensal || 0);
    const totalGasto = Number(totaisGastos[r.id] || 0);
    totalGastoGeral += totalGasto;
    totalProjetadoGeral += projetado;

    const even = idx % 2 === 0;
    const fillColor: [number, number, number] = even ? [255, 255, 255] : [245, 245, 245];
    const fontStyle = "normal";

    body.push([
      {
        content: r.nome,
        styles: { fontStyle, fillColor, textColor: [20, 20, 20] },
      },
      {
        content: fmtBRL(totalGasto),
        styles: { halign: "right", fontStyle, fillColor, textColor: [20, 20, 20] },
      },
      {
        content: fmtBRL(projetado),
        styles: { halign: "right", fontStyle, fillColor, textColor: [20, 20, 20] },
      },
    ]);
  });

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
    theme: "plain",
  });

  y = ((pdf as any).lastAutoTable?.finalY || y) + 8;

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
