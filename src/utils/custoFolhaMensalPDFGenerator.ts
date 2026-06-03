import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface CustoFolhaLinhaPDF {
  nome: string;
  salarioBase: number;
  ajudaCusto: number;
  horasExtras: number;
  bonus: number;
  pensaoAlimenticia: number;
  total: number;
  previsao: number;
  adiantamento: number;
  pago: boolean;
  dataPagamento: string | null;
  chavePix: string | null;
}

export interface CustoFolhaTotaisPDF {
  salarioBase: number;
  ajudaCusto: number;
  horasExtras: number;
  bonus: number;
  pensaoAlimenticia: number;
  total: number;
  previsao: number;
  adiantamento: number;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n || 0);

const fmtDate = (s: string | null) => {
  if (!s) return '—';
  try {
    return format(new Date(`${s}T12:00:00`), 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return s;
  }
};

export function exportCustoFolhaMensalPDF(
  mesLabel: string,
  mesIso: string,
  linhas: CustoFolhaLinhaPDF[],
  totais: CustoFolhaTotaisPDF,
) {
  const pdf = new jsPDF('l', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.width;
  const pageHeight = pdf.internal.pageSize.height;
  const margin = 10;
  let y = 15;

  const primaryColor: [number, number, number] = [41, 128, 185];
  const grayColor: [number, number, number] = [128, 128, 128];

  pdf.setFont('helvetica', 'normal');

  try {
    pdf.addImage('/lovable-uploads/9f8b49f3-817e-40f0-87b0-856e0cbe536a.png', 'PNG', margin, y - 10, 60, 25);
  } catch {
    pdf.setFontSize(20);
    pdf.setTextColor(...primaryColor);
    pdf.setFont('helvetica', 'bold');
    pdf.text('ELISA PORTAS LTDA', margin, y);
  }

  pdf.setFontSize(8);
  pdf.setTextColor(0, 0, 0);
  ['Rua Padre Elio Baron Toaldo, 571', '95055652 - Caxias do Sul, RS', 'CNPJ: 59.277.825/0001-09']
    .forEach((info, i) => pdf.text(info, pageWidth - margin - 60, y + i * 5));

  pdf.setDrawColor(...grayColor);
  pdf.setLineWidth(0.5);
  pdf.line(margin, y + 15, pageWidth - margin, y + 15);
  y += 25;

  pdf.setFontSize(16);
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`CUSTO EM FOLHA — ${mesLabel.toUpperCase()}`, margin, y);

  pdf.setFontSize(10);
  pdf.setTextColor(...grayColor);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, margin, y + 7);
  y += 14;

  const head = [[
    'Colaborador', 'Sal. Base', 'Ajuda', 'H. Extras', 'Bônus', 'Pensão',
    'Total', 'Previsão', 'Adiant.', 'Pago', 'Data Pgto.', 'Chave PIX',
  ]];

  const body = linhas.map((l) => [
    l.nome,
    fmt(l.salarioBase),
    fmt(l.ajudaCusto),
    fmt(l.horasExtras),
    fmt(l.bonus),
    fmt(l.pensaoAlimenticia),
    fmt(l.total),
    fmt(l.previsao),
    fmt(l.adiantamento),
    l.pago ? 'Sim' : 'Não',
    fmtDate(l.dataPagamento),
    l.chavePix || '—',
  ]);

  body.push([
    { content: 'TOTAL DO MÊS', styles: { fontStyle: 'bold', fillColor: [240, 240, 240], halign: 'right' } } as any,
    { content: fmt(totais.salarioBase), styles: { fontStyle: 'bold', fillColor: [240, 240, 240], halign: 'right' } } as any,
    { content: fmt(totais.ajudaCusto), styles: { fontStyle: 'bold', fillColor: [240, 240, 240], halign: 'right' } } as any,
    { content: fmt(totais.horasExtras), styles: { fontStyle: 'bold', fillColor: [240, 240, 240], halign: 'right' } } as any,
    { content: fmt(totais.bonus), styles: { fontStyle: 'bold', fillColor: [240, 240, 240], halign: 'right' } } as any,
    { content: fmt(totais.pensaoAlimenticia), styles: { fontStyle: 'bold', fillColor: [240, 240, 240], halign: 'right' } } as any,
    { content: fmt(totais.total), styles: { fontStyle: 'bold', fillColor: [240, 240, 240], halign: 'right' } } as any,
    { content: fmt(totais.previsao), styles: { fontStyle: 'bold', fillColor: [240, 240, 240], halign: 'right' } } as any,
    { content: fmt(totais.adiantamento), styles: { fontStyle: 'bold', fillColor: [240, 240, 240], halign: 'right' } } as any,
    { content: '', styles: { fillColor: [240, 240, 240] } } as any,
    { content: '', styles: { fillColor: [240, 240, 240] } } as any,
    { content: '', styles: { fillColor: [240, 240, 240] } } as any,
  ]);

  autoTable(pdf, {
    head,
    body,
    startY: y,
    styles: { fontSize: 7, cellPadding: 1.6, valign: 'middle', lineColor: [220, 220, 220], lineWidth: 0.2 },
    headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.2, halign: 'center' },
    columnStyles: {
      0: { cellWidth: 42 },
      1: { cellWidth: 20, halign: 'right' },
      2: { cellWidth: 20, halign: 'right' },
      3: { cellWidth: 20, halign: 'right' },
      4: { cellWidth: 20, halign: 'right' },
      5: { cellWidth: 20, halign: 'right' },
      6: { cellWidth: 22, halign: 'right' },
      7: { cellWidth: 20, halign: 'right' },
      8: { cellWidth: 20, halign: 'right' },
      9: { cellWidth: 12, halign: 'center' },
      10: { cellWidth: 20, halign: 'center' },
      11: { cellWidth: 40 },
    },
    margin: { left: margin, right: margin },
    theme: 'striped',
    alternateRowStyles: { fillColor: [248, 248, 248] },
    didParseCell(data) {
      if (data.section === 'body' && data.column.index === 9 && (data.cell.raw === 'Sim' || data.cell.raw === 'Não')) {
        data.cell.styles.textColor = data.cell.raw === 'Sim' ? [22, 163, 74] : [220, 38, 38];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  pdf.setFontSize(8);
  pdf.setTextColor(...grayColor);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Elisa Portas LTDA - A maior fábrica de portas de enrolar do Sul do País', margin, pageHeight - 10);

  const fileName = `custo-folha-${mesIso.slice(0, 7)}.pdf`;
  pdf.save(fileName);
}