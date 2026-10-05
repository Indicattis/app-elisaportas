import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PesquisaPDF {
  created_at: string; comentario: string | null;
  nota_atendimento: number | null; nota_produto: number | null; nota_instalacao: number | null;
  recomendaria: boolean | null; avaliou_no_google: boolean; quis_comprar_avulsos: boolean;
  pedido?: { numero_pedido: string | null; cliente_nome: string | null } | null;
}

const fmtData = (d: string) => new Date(d.length === 10 ? `${d}T12:00:00` : d).toLocaleDateString('pt-BR');
const avg = (a: (number | null)[]) => {
  const v = a.filter((n): n is number => n != null);
  return v.length ? (v.reduce((x, y) => x + y, 0) / v.length).toFixed(1) : '—';
};
const pct = (n: number, t: number) => (t ? `${Math.round((n / t) * 100)}%` : '—');

export function gerarRelatorioPosVendasPDF(lista: PesquisaPDF[], inicio: string, fim: string) {
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = pdf.internal.pageSize.getWidth();
  const t = lista.length;

  pdf.setFillColor(29, 78, 216);
  pdf.rect(0, 0, W, 24, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(16);
  pdf.text('Relatório de Pesquisas de Pós-Vendas', 12, 12);
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10);
  const periodo = inicio || fim
    ? `Período: ${inicio ? fmtData(inicio) : 'início'} a ${fim ? fmtData(fim) : 'hoje'}`
    : 'Período: todas as pesquisas';
  pdf.text(`${periodo}   •   Gerado em ${new Date().toLocaleString('pt-BR')}`, 12, 19);

  const cards: [string, string][] = [
    ['Pesquisas', String(t)],
    ['Atendimento', avg(lista.map((p) => p.nota_atendimento))],
    ['Produto', avg(lista.map((p) => p.nota_produto))],
    ['Instalação', avg(lista.map((p) => p.nota_instalacao))],
    ['Recomendaria', pct(lista.filter((p) => p.recomendaria).length, t)],
    ['Avaliou Google', pct(lista.filter((p) => p.avaliou_no_google).length, t)],
    ['Quis avulsos', pct(lista.filter((p) => p.quis_comprar_avulsos).length, t)],
  ];
  const cw = (W - 24 - 6 * 3) / 7;
  cards.forEach(([l, v], i) => {
    const x = 12 + i * (cw + 3);
    pdf.setFillColor(239, 246, 255); pdf.setDrawColor(191, 219, 254);
    pdf.roundedRect(x, 30, cw, 18, 2, 2, 'FD');
    pdf.setTextColor(100, 116, 139); pdf.setFontSize(8); pdf.text(l, x + 3, 36);
    pdf.setTextColor(29, 78, 216); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(14);
    pdf.text(v, x + 3, 44); pdf.setFont('helvetica', 'normal');
  });

  autoTable(pdf, {
    startY: 54,
    head: [['Data', 'Pedido', 'Cliente', 'Atend.', 'Produto', 'Instal.', 'Recomenda', 'Google', 'Comentário']],
    body: lista.map((p) => [
      fmtData(p.created_at), `#${p.pedido?.numero_pedido ?? '—'}`, p.pedido?.cliente_nome ?? '—',
      p.nota_atendimento ?? '—', p.nota_produto ?? '—', p.nota_instalacao ?? '—',
      p.recomendaria == null ? '—' : p.recomendaria ? 'Sim' : 'Não',
      p.avaliou_no_google ? 'Sim' : 'Não', p.comentario || '—',
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [29, 78, 216] },
    alternateRowStyles: { fillColor: [245, 248, 255] },
    columnStyles: { 8: { cellWidth: 90 } },
    didParseCell: (d) => {
      if (d.section === 'body' && d.column.index >= 3 && d.column.index <= 5) {
        const n = Number(d.cell.raw);
        if (!isNaN(n)) d.cell.styles.textColor = n >= 4 ? [22, 163, 74] : n >= 3 ? [202, 138, 4] : [220, 38, 38];
        d.cell.styles.fontStyle = 'bold';
      }
    },
  });

  const pages = pdf.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    pdf.setPage(i); pdf.setFontSize(8); pdf.setTextColor(148, 163, 184);
    pdf.text(`Página ${i} de ${pages}`, W - 30, pdf.internal.pageSize.getHeight() - 6);
  }
  pdf.save(`relatorio-pos-vendas${inicio ? `-${inicio}` : ''}${fim ? `_${fim}` : ''}.pdf`);
}
