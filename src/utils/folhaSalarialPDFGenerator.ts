import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DespesaPadrao } from '@/hooks/useDespesasPadrao';

const DEFAULT_SETORES_ORDEM: { value: string; label: string }[] = [
  { value: 'vendas',         label: 'Vendas' },
  { value: 'marketing',      label: 'Marketing' },
  { value: 'instalacoes',    label: 'Instalações' },
  { value: 'fabrica',        label: 'Fábrica' },
  { value: 'administrativo', label: 'Administrativo' },
];

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n || 0);

function calcFeriasDefault(base: number) {
  return base / 3 / 12;
}

function calcTotalFolha(f: DespesaPadrao) {
  const salario = Number(f.salario) || 0;
  const horaExtra = Number((f as any).hora_extra) || 0;
  const bonif = Number((f as any).bonificacao) || 0;
  const base = salario + horaExtra;
  if (f.em_folha === false) return base + bonif;
  const baseInsalub = Number(f.salario_minimo) || salario;
  const aux = Number(f.aux_combustivel) || 0;
  const insalub = baseInsalub * (Number(f.insalubridade_pct) || 0) / 100;
  const fgts = base * (Number(f.fgts_pct) || 0) / 100;
  const ferias = f.ferias_valor == null ? calcFeriasDefault(base) : Number(f.ferias_valor) || 0;
  const prev13 = base / 12;
  const fgts13 = fgts / 12;
  const multaFgts = fgts * 0.4;
  return base + aux + bonif + insalub + fgts + prev13 + fgts13 + ferias + multaFgts;
}

export function exportFolhaSalarialPDF(
  items: DespesaPadrao[],
  setoresDinamicos?: { value: string; label: string }[],
) {
  const base = (setoresDinamicos && setoresDinamicos.length > 0)
    ? setoresDinamicos
    : DEFAULT_SETORES_ORDEM;
  const SETORES_ORDEM = [...base, { value: '', label: 'Sem setor' }];
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.width;
  const pageHeight = pdf.internal.pageSize.height;
  const margin = 10;
  let y = 15;

  const primaryColor: [number, number, number] = [41, 128, 185];
  const grayColor: [number, number, number] = [128, 128, 128];

  pdf.setFont('helvetica', 'normal');

  // Header / logo
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

  // Title
  pdf.setFontSize(16);
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'bold');
  pdf.text('FOLHA SALARIAL PADRÃO', margin, y);

  pdf.setFontSize(10);
  pdf.setTextColor(...grayColor);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, margin, y + 7);
  y += 14;

  const head = [[
    'Colaborador', 'Em folha', 'Salário', 'Sal. Mín.', 'Comb.', 'Bonif.', 'H. Extra',
    'Insalub.', 'FGTS', 'Prev. 13°', 'FGTS 13°', 'Férias', 'Multa FGTS', 'Total',
  ]];

  const columnStyles: Record<number, any> = {
    0: { cellWidth: 30 },
    1: { cellWidth: 10, halign: 'center' },
    2: { cellWidth: 15, halign: 'right' },
    3: { cellWidth: 15, halign: 'right' },
    4: { cellWidth: 13, halign: 'right' },
    5: { cellWidth: 14, halign: 'right' },
    6: { cellWidth: 14, halign: 'right' },
    7: { cellWidth: 14, halign: 'right' },
    8: { cellWidth: 14, halign: 'right' },
    9: { cellWidth: 14, halign: 'right' },
    10: { cellWidth: 14, halign: 'right' },
    11: { cellWidth: 14, halign: 'right' },
    12: { cellWidth: 16, halign: 'right' },
  };

  let totalSalarios = 0;
  let totalFolha = 0;

  SETORES_ORDEM.forEach((setor) => {
    const rows = items.filter(i => (i.setor ?? '') === setor.value);
    if (rows.length === 0) return;

    // Sector title
    if (y + 25 > pageHeight - 20) { pdf.addPage(); y = 20; }
    pdf.setFontSize(11);
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${setor.label}  (${rows.length})`, margin, y);
    y += 4;

    let subtotal = 0;
    const body = rows.map((i) => {
      const salario = Number(i.salario) || 0;
      const horaExtra = Number((i as any).hora_extra) || 0;
      const base = salario + horaExtra;
      const salarioMin = Number(i.salario_minimo) || salario;
      const desativado = i.em_folha === false;
      const insalubVal = desativado ? 0 : salarioMin * (Number(i.insalubridade_pct) || 0) / 100;
      const fgtsVal = desativado ? 0 : base * (Number(i.fgts_pct) || 0) / 100;
      const prev13 = desativado ? 0 : base / 12;
      const fgts13 = desativado ? 0 : fgtsVal / 12;
      const ferias = desativado
        ? 0
        : (i.ferias_valor == null ? calcFeriasDefault(base) : Number(i.ferias_valor) || 0);
      const multaFgts = desativado ? 0 : fgtsVal * 0.4;
      const aux = desativado ? 0 : (Number(i.aux_combustivel) || 0);
      const total = calcTotalFolha(i);
      totalSalarios += salario;
      totalFolha += total;
      subtotal += total;
      return [
        i.nome,
        desativado ? 'Não' : 'Sim',
        fmt(salario),
        fmt(salarioMin),
        fmt(aux),
        fmt(horaExtra),
        fmt(insalubVal),
        fmt(fgtsVal),
        fmt(prev13),
        fmt(fgts13),
        fmt(ferias),
        fmt(multaFgts),
        fmt(total),
      ];
    });

    body.push([
      { content: 'Subtotal do setor', colSpan: 12, styles: { halign: 'right', fontStyle: 'bold', fillColor: [240, 240, 240] } } as any,
      { content: fmt(subtotal), styles: { halign: 'right', fontStyle: 'bold', fillColor: [240, 240, 240] } } as any,
    ]);

    autoTable(pdf, {
      head,
      body,
      startY: y + 2,
      styles: { fontSize: 6.8, cellPadding: 1.4, valign: 'middle', lineColor: [220, 220, 220], lineWidth: 0.2 },
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 6.8, halign: 'center' },
      columnStyles,
      margin: { left: margin, right: margin },
      theme: 'striped',
      alternateRowStyles: { fillColor: [248, 248, 248] },
      didParseCell(data) {
        if (data.section === 'body' && data.column.index === 1 && (data.cell.raw === 'Sim' || data.cell.raw === 'Não')) {
          data.cell.styles.textColor = data.cell.raw === 'Sim' ? [22, 163, 74] : [220, 38, 38];
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });

    y = ((pdf as any).lastAutoTable?.finalY || y) + 8;
  });

  // Grand totals
  if (y + 30 > pageHeight - 20) { pdf.addPage(); y = 20; }
  pdf.setDrawColor(...grayColor);
  pdf.setLineWidth(0.3);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 7;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(80, 80, 80);
  pdf.text('Total de salários:', margin, y);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text(fmt(totalSalarios), margin + 45, y);

  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(80, 80, 80);
  pdf.text('Total da folha:', pageWidth - margin - 70, y);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text(fmt(totalFolha), pageWidth - margin, y, { align: 'right' });

  // Footer
  pdf.setFontSize(8);
  pdf.setTextColor(...grayColor);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Elisa Portas LTDA - A maior fábrica de portas de enrolar do Sul do País', margin, pageHeight - 15);
  pdf.text('Contato: comercial@elisaportas.com.br', margin, pageHeight - 10);

  pdf.save(`folha-salarial-padrao-${format(new Date(), 'dd-MM-yyyy')}.pdf`);
}