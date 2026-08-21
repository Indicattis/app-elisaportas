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

type RGB = [number, number, number];

// Paleta espelhando a UI (fundo escuro + vidro)
const BG: RGB = [12, 14, 20];
const PANEL: RGB = [25, 29, 38];
const PANEL_ALT: RGB = [21, 24, 32];
const HEAD_BG: RGB = [37, 42, 54];
const BORDA: RGB = [55, 60, 72];
const TXT: RGB = [235, 238, 244];
const TXT_SOFT: RGB = [160, 168, 182];
const TXT_MUTED: RGB = [110, 118, 132];
const AZUL: RGB = [59, 130, 246];
const VERDE: RGB = [52, 211, 153];
const AMBAR: RGB = [251, 191, 36];
const VERMELHO: RGB = [248, 113, 113];

export function exportMultasPDF(multas: Multa[]) {
  const pdf = new jsPDF("l", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.width;
  const pageHeight = pdf.internal.pageSize.height;
  const margin = 10;
  const contentW = pageWidth - margin * 2;

  const paintBackground = () => {
    pdf.setFillColor(...BG);
    pdf.rect(0, 0, pageWidth, pageHeight, "F");
  };
  paintBackground();

  const totalPendente = multas.filter((m) => m.status !== "pago").reduce((s, m) => s + totalMulta(m), 0);
  const totalPago = multas.filter((m) => m.status === "pago").reduce((s, m) => s + totalMulta(m), 0);
  const totalAcrescimos = multas.reduce((s, m) => s + acrescimoMulta(m), 0);
  const totalValores = multas.reduce((s, m) => s + Number(m.valor), 0);

  // ---------- Cabeçalho ----------
  let y = 16;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(17);
  pdf.setTextColor(...TXT);
  pdf.text("Multas", margin, y);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(...TXT_SOFT);
  pdf.text("Controle de infrações de trânsito da frota", margin, y + 5.5);
  pdf.setTextColor(...TXT_MUTED);
  pdf.text(
    `Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
    pageWidth - margin,
    y,
    { align: "right" },
  );
  y += 12;

  // ---------- Cards de resumo (glass) ----------
  const cards: { label: string; valor: string; cor: RGB }[] = [
    { label: "Total Pendente", valor: fmtBRL(totalPendente), cor: AMBAR },
    { label: "Total Pago", valor: fmtBRL(totalPago), cor: VERDE },
    { label: "Total de Multas", valor: String(multas.length), cor: TXT },
  ];
  const gap = 4;
  const cardW = (contentW - gap * (cards.length - 1)) / cards.length;
  const cardH = 17;
  cards.forEach((c, i) => {
    const x = margin + i * (cardW + gap);
    pdf.setFillColor(...PANEL);
    pdf.setDrawColor(...BORDA);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(x, y, cardW, cardH, 2.5, 2.5, "FD");
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(...TXT_MUTED);
    pdf.text(c.label.toUpperCase(), x + 4, y + 6);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.setTextColor(...c.cor);
    pdf.text(c.valor, x + 4, y + 13);
  });
  y += cardH + 6;

  // ---------- Tabela ----------
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
      `${dias} ${dias === 1 ? "dia" : "dias"}`,
      fmtBRL(Number(m.valor)),
      acrescimo > 0 ? `+ ${fmtBRL(acrescimo)}` : "—",
      fmtBRL(totalMulta(m)),
    ];
  });

  const foot = [[
    `${multas.length} multa(s)`,
    "",
    "",
    "",
    "",
    "",
    "",
    fmtBRL(totalValores),
    fmtBRL(totalAcrescimos),
    fmtBRL(totalPendente + totalPago),
  ]];

  // Badges (pílulas) desenhadas manualmente sobre as células de status
  type Pill = { x: number; y: number; h: number; text: string; fg: RGB; bg: RGB; border: RGB; page: number };
  const pills: Pill[] = [];
  let currentPage = 1;

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
    foot,
    startY: y,
    theme: "plain",
    styles: {
      fontSize: 8,
      cellPadding: { top: 2.4, bottom: 2.4, left: 3, right: 3 },
      valign: "middle",
      textColor: TXT_SOFT,
      lineColor: BORDA,
      lineWidth: { top: 0, bottom: 0, left: 0, right: 0.2 },
      fillColor: PANEL,
    },
    headStyles: {
      fillColor: HEAD_BG,
      textColor: TXT_SOFT,
      fontStyle: "bold",
      fontSize: 7.5,
      halign: "left",
      cellPadding: { top: 2.6, bottom: 2.6, left: 3, right: 3 },
    },
    footStyles: {
      fillColor: HEAD_BG,
      textColor: TXT,
      fontStyle: "bold",
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: PANEL_ALT },
    columnStyles: {
      0: { cellWidth: 26 },
      1: { cellWidth: "auto" },
      2: { cellWidth: 25 },
      3: { cellWidth: 25 },
      4: { cellWidth: 27 },
      5: { cellWidth: 46 },
      6: { cellWidth: 16, halign: "right" },
      7: { cellWidth: 25, halign: "right", fontStyle: "bold" },
      8: { cellWidth: 26, halign: "right" },
      9: { cellWidth: 30, halign: "right", fontStyle: "bold" },
    },
    margin: { left: margin, right: margin, top: 14, bottom: 16 },
    willDrawPage: () => {
      paintBackground();
    },
    didParseCell: (data) => {
      if (data.section === "foot") {
        if (data.column.index === 8) data.cell.styles.textColor = VERMELHO;
        if (data.column.index > 0 && data.column.index < 7) data.cell.text = [""];
        return;
      }
      if (data.section !== "body") return;
      const m = multas[data.row.index];
      const sem = semCondutor(m);
      const col = data.column.index;

      if (col === 0) data.cell.styles.textColor = TXT;
      if (col === 5) {
        data.cell.styles.textColor = isEmpresa(m) ? AZUL : sem ? AMBAR : TXT;
        if (sem || isEmpresa(m)) data.cell.styles.fontStyle = "bold";
      }
      if (col === 7) data.cell.styles.textColor = m.status === "pago" ? VERDE : TXT;
      if (col === 8) data.cell.styles.textColor = sem ? VERMELHO : TXT_MUTED;
      if (col === 9) data.cell.styles.textColor = sem ? VERMELHO : TXT_SOFT;
      // status/aceite viram pílulas desenhadas: escondemos o texto padrão
      if (col === 2 || col === 3 || col === 4) data.cell.text = [""];
    },
    didDrawCell: (data) => {
      if (data.section === "body" && data.column.index >= 2 && data.column.index <= 4) {
        const m = multas[data.row.index];
        let label = "";
        let ativo = false;
        let neutro = false;
        if (data.column.index === 2) {
          ativo = m.status === "pago";
          label = ativo ? "Pago" : "Pendente";
        } else if (data.column.index === 3) {
          ativo = m.status_detran === "pago";
          label = ativo ? "Pago" : "Pendente";
        } else {
          ativo = !!m.aceite_condutor;
          label = ativo ? "Sim" : "Não";
          neutro = !ativo;
        }
        const fg: RGB = ativo ? VERDE : neutro ? TXT_MUTED : AMBAR;
        const bg: RGB = ativo ? [22, 60, 50] : neutro ? [34, 38, 48] : [64, 50, 20];
        const border: RGB = ativo ? [32, 96, 78] : neutro ? [58, 63, 76] : [116, 84, 24];
        pills.push({
          x: data.cell.x + 3,
          y: data.cell.y + (data.cell.height - 5.4) / 2,
          h: 5.4,
          text: label,
          fg,
          bg,
          border,
          page: currentPage,
        });
      }
    },
    didDrawPage: (data) => {
      // desenha as pílulas acumuladas desta página
      pdf.setFontSize(7);
      pills
        .filter((p) => p.page === currentPage)
        .forEach((p) => {
          pdf.setFont("helvetica", "bold");
          const w = pdf.getTextWidth(p.text) + 5;
          pdf.setFillColor(...p.bg);
          pdf.setDrawColor(...p.border);
          pdf.setLineWidth(0.25);
          pdf.roundedRect(p.x, p.y, w, p.h, 2.7, 2.7, "FD");
          pdf.setTextColor(...p.fg);
          pdf.text(p.text, p.x + w / 2, p.y + p.h / 2 + 1.1, { align: "center" });
        });
      currentPage = data.pageNumber + 1;

      // rodapé
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      pdf.setTextColor(...TXT_MUTED);
      pdf.text("Elisa Portas LTDA", margin, pageHeight - 7);
      pdf.text(`Página ${data.pageNumber}`, pageWidth - margin, pageHeight - 7, { align: "right" });
    },
  });

  // contorno arredondado sutil ao redor da tabela (efeito "card")
  pdf.save(`multas-${format(new Date(), "dd-MM-yyyy")}.pdf`);
}
