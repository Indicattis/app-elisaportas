import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DespesaPadrao } from '@/hooks/useDespesasPadrao';

const SETORES_ORDEM: { value: string; label: string }[] = [
  { value: 'vendas',         label: 'Vendas' },
  { value: 'marketing',      label: 'Marketing' },
  { value: 'instalacoes',    label: 'Instalações' },
  { value: 'fabrica',        label: 'Fábrica' },
  { value: 'administrativo', label: 'Administrativo' },
  { value: '',               label: 'Sem setor' },
];

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n || 0);

function calcFeriasDefault(salario: number) {
  return salario / 3;
}

function calcTotalFolha(f: DespesaPadrao) {
  const salario = Number(f.salario) || 0;
  if (f.em_folha === false) return salario;
  const aux = Number(f.aux_combustivel) || 0;
  const insalub = salario * (Number(f.insalubridade_pct) || 0) / 100;
  const fgts = salario * (Number(f.fgts_pct) || 0) / 100;
  const ferias = f.ferias_valor == null ? calcFeriasDefault(salario) : Number(f.ferias_valor) || 0;
  const prev13 = salario / 12;
  const fgts13 = fgts / 12;
  return salario + aux + insalub + fgts + prev13 + fgts13 + ferias;
}

export function exportFolhaSalarialPDF(items: DespesaPadrao[]) {
  const pdf = new jsPDF('l', 'mm', 'a4');
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
    'Colaborador', 'Em folha', 'Salário', 'Combustível',
    'Insalub valor', 'FGTS valor', 'Previsão 13°', 'FGTS 13°', 'Férias + 1/3', 'Total',
  ]];

  const columnStyles: Record<number, any> = {
    0: { cellWidth: 50 },
    1: { cellWidth: 16, halign: 'center' },
    2: { cellWidth: 26, halign: 'right' },
    3: { cellWidth: 26, halign: 'right' },
    4: { cellWidth: 26, halign: 'right' },
    5: { cellWidth: 26, halign: 'right' },
    6: { cellWidth: 26, halign: 'right' },
    7: { cellWidth: 26, halign: 'right' },
    8: { cellWidth: 26, halign: 'right' },
    9: { cellWidth: 28, halign: 'right' },
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
      const desativado = i.em_folha === false;
      const insalubVal = desativado ? 0 : salario * (Number(i.insalubridade_pct) || 0) / 100;
      const fgtsVal = desativado ? 0 : salario * (Number(i.fgts_pct) || 0) / 100;
      const prev13 = desativado ? 0 : salario / 12;
      const fgts13 = desativado ? 0 : fgtsVal / 12;
      const ferias = desativado
        ? 0
        : (i.ferias_valor == null ? calcFeriasDefault(salario) : Number(i.ferias_valor) || 0);
      const aux = desativado ? 0 : (Number(i.aux_combustivel) || 0);
      const total = calcTotalFolha(i);
      totalSalarios += salario;
      totalFolha += total;
      subtotal += total;
      return [
        i.nome,
        desativado ? 'Não' : 'Sim',
        fmt(salario),
        fmt(aux),
        fmt(insalubVal),
        fmt(fgtsVal),
        fmt(prev13),
        fmt(fgts13),
        fmt(ferias),
        fmt(total),
      ];
    });

    body.push([
      { content: 'Subtotal do setor', colSpan: 9, styles: { halign: 'right', fontStyle: 'bold', fillColor: [240, 240, 240] } } as any,
      { content: fmt(subtotal), styles: { halign: 'right', fontStyle: 'bold', fillColor: [240, 240, 240] } } as any,
    ]);

    autoTable(pdf, {
      head,
      body,
      startY: y + 2,
      styles: { fontSize: 7.5, cellPadding: 1.8, valign: 'middle', lineColor: [220, 220, 220], lineWidth: 0.2 },
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5, halign: 'center' },
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