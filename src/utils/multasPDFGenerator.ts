import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Multa } from "@/hooks/useMultas";

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);

const MULTIPLICADOR_ACRESCIMO = 3;
const isEmpresa = (m: Multa) => m.responsavel_pagamento === "empresa";
const semCondutor = (m: Multa) => !m.usuario_id && !m.terceiro_nome && !isEmpresa(m);
const acrescimoMulta = (m: Multa) => (semCondutor(m) ? Number(m.valor) * MULTIPLICADOR_ACRESCIMO : 0);
const totalMulta = (m: Multa) => Number(m.valor) + acrescimoMulta(m);

const AZUL: [number, number, number] = [29, 118, 207]; // #1d76cf
const CINZA: [number, number, number] = [128, 128, 128];

export function exportMultasPDF(multas: Multa[]) {
  const pdf = new jsPDF("l", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.width;
  const pageHeight = pdf.internal.pageSize.height;
  const margin = 10;
  let y = 16;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.setTextColor(...AZUL);
  pdf.text("RELATÓRIO DE MULTAS", margin, y);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(...CINZA);
  pdf.text(
    `Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}  •  ${multas.length} registro(s)`,
    margin,
    y + 6,
  );

  pdf.setDrawColor(...CINZA);
  pdf.setLineWidth(0.3);
  pdf.line(margin, y + 10, pageWidth - margin, y + 10);
  y += 15;

  const body = multas.map((m) => {
    const dias = differenceInCalendarDays(new Date(), new Date(m.created_at));
    const acrescimo = acrescimoMulta(m);
    const sem = semCondutor(m);
    return [
      m.data_ocorrido ? format(parseISO(m.data_ocorrido + "T12:00:00"), "dd/MM/yyyy") : "—",
      m.descricao || "—",
      m.status === "pago" ? "Pago" : "Pendente",
      m.status_detran === "pago" ? "Pago" : "Pendente",
      m.aceite_condutor ? "Sim" : "Não",
      isEmpresa(m) ? "Empresa" : sem ? "Aguardando transferência" : m.usuario_nome || m.terceiro_nome || "—",
      String(dias),
      fmtBRL(Number(m.valor)),
      acrescimo > 0 ? fmtBRL(acrescimo) : "—",
      fmtBRL(totalMulta(m)),
    ];
  });

  autoTable(pdf, {
    head: [[
      "Data do ocorrido",
      "Descrição",
      "Pag. Condutor",
      "Pag. DETRAN",
      "Aceite do condutor",
      "Condutor",
      "Dias",
      "Valor",
      "Acréscimo (3x)",
      "Valor c/ acréscimo",
    ]],
    body,
    startY: y,
    styles: { fontSize: 8, cellPadding: 1.8, valign: "middle", lineColor: [220, 220, 220], lineWidth: 0.2 },
    headStyles: { fillColor: AZUL, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8, halign: "center" },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: "auto" },
      2: { cellWidth: 22, halign: "center" },
      3: { cellWidth: 28, halign: "center" },
      4: { cellWidth: 55 },
      5: { cellWidth: 16, halign: "right" },
      6: { cellWidth: 26, halign: "right" },
      7: { cellWidth: 26, halign: "right" },
      8: { cellWidth: 30, halign: "right" },
    },
    margin: { left: margin, right: margin },
    theme: "plain",
    didParseCell: (data) => {
      if (data.section !== "body") return;
      const m = multas[data.row.index];
      if (semCondutor(m) && (data.column.index === 4 || data.column.index === 7)) {
        data.cell.styles.textColor = [180, 83, 9];
        data.cell.styles.fontStyle = "bold";
      }
      if (data.column.index === 4 && isEmpresa(m)) {
        data.cell.styles.textColor = [29, 118, 207];
      }
      if (data.column.index === 2) {
        data.cell.styles.textColor = m.status === "pago" ? [16, 122, 87] : [180, 83, 9];
      }
    },
  });

  let finalY = ((pdf as any).lastAutoTable?.finalY || y) + 8;
  if (finalY + 26 > pageHeight - 18) {
    pdf.addPage();
    finalY = 20;
  }

  const totalPendente = multas.filter((m) => m.status !== "pago").reduce((s, m) => s + totalMulta(m), 0);
  const totalPago = multas.filter((m) => m.status === "pago").reduce((s, m) => s + totalMulta(m), 0);
  const totalAcrescimos = multas.reduce((s, m) => s + acrescimoMulta(m), 0);

  pdf.setDrawColor(...CINZA);
  pdf.line(margin, finalY, pageWidth - margin, finalY);
  finalY += 7;

  const totais: [string, string][] = [
    ["Quantidade de multas:", String(multas.length)],
    ["Total pendente:", fmtBRL(totalPendente)],
    ["Total pago:", fmtBRL(totalPago)],
    ["Total de acréscimos:", fmtBRL(totalAcrescimos)],
  ];

  pdf.setFontSize(9);
  totais.forEach(([label, valor], i) => {
    const x = margin + i * 68;
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(80, 80, 80);
    pdf.text(label, x, finalY);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(0, 0, 0);
    pdf.text(valor, x, finalY + 5);
  });

  const pages = pdf.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...CINZA);
    pdf.text("Elisa Portas LTDA", margin, pageHeight - 8);
    pdf.text(`Página ${i} de ${pages}`, pageWidth - margin, pageHeight - 8, { align: "right" });
  }

  pdf.save(`multas-${format(new Date(), "dd-MM-yyyy")}.pdf`);
}
