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

export function exportTiposCustosPDF(
  titulo: string,
  items: TipoCusto[],
  categorias: CategoriaDespesa[],
) {
  const pdf = new jsPDF("l", "mm", "a4");
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

  const grupos: Array<{ nome: string; rows: TipoCusto[] }> = [];
  categorias.forEach((cat) => {
    const rows = items.filter((i) => i.categoria_id === cat.id);
    if (rows.length > 0) grupos.push({ nome: cat.nome, rows });
  });
  const semCat = items.filter((i) => !i.categoria_id);
  if (semCat.length > 0) grupos.push({ nome: "Sem categoria", rows: semCat });

  const head = [["Nome", "Descrição", "Valor projetado", "DRE", "Ativo"]];
  const columnStyles: Record<number, any> = {
    0: { cellWidth: 70 },
    1: { cellWidth: "auto" },
    2: { cellWidth: 38, halign: "right" },
    3: { cellWidth: 20, halign: "center" },
    4: { cellWidth: 20, halign: "center" },
  };

  let totalGeral = 0;
  let totalAtivos = 0;

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

    let subtotal = 0;
    const body = rows.map((r) => {
      const valor = Number(r.valor_maximo_mensal || 0);
      subtotal += valor;
      totalGeral += valor;
      if (r.ativo) totalAtivos += valor;
      return [
        r.nome,
        r.descricao || "-",
        fmtBRL(valor),
        r.aparece_no_dre ? "Sim" : "Não",
        r.ativo ? "Sim" : "Não",
      ];
    });

    body.push([
      {
        content: "Subtotal da categoria",
        colSpan: 2,
        styles: { halign: "right", fontStyle: "bold", fillColor: [240, 240, 240] },
      } as any,
      {
        content: fmtBRL(subtotal),
        styles: { halign: "right", fontStyle: "bold", fillColor: [240, 240, 240] },
      } as any,
      { content: "", styles: { fillColor: [240, 240, 240] } } as any,
      { content: "", styles: { fillColor: [240, 240, 240] } } as any,
    ]);

    autoTable(pdf, {
      head,
      body,
      startY: y + 2,
      styles: {
        fontSize: 8,
        cellPadding: 2,
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
      didParseCell(data) {
        if (
          data.section === "body" &&
          (data.column.index === 3 || data.column.index === 4) &&
          (data.cell.raw === "Sim" || data.cell.raw === "Não")
        ) {
          data.cell.styles.textColor =
            data.cell.raw === "Sim" ? [22, 163, 74] : [220, 38, 38];
          data.cell.styles.fontStyle = "bold";
        }
      },
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
  pdf.text("Total geral:", margin, y);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0, 0, 0);
  pdf.text(fmtBRL(totalGeral), margin + 45, y);

  pdf.setFontSize(12);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(80, 80, 80);
  pdf.text("Total mensal (ativos):", pageWidth - margin - 70, y);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(0, 0, 0);
  pdf.text(fmtBRL(totalAtivos), pageWidth - margin, y, { align: "right" });

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