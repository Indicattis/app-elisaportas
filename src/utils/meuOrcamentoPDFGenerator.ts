import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface CartPorta {
  uid: string;
  tipo: 'porta';
  largura: number;
  altura: number;
  guia_escondido: boolean;
  rolo_escondido: boolean;
  pintura: boolean;
  instalacao: boolean;
  quantidade: number;
  preco_unitario: number;
  descricao: string;
}
export interface CartAvulso {
  uid: string;
  tipo: 'avulso';
  custo_item_id?: string | null;
  descricao: string;
  unidade?: string | null;
  quantidade: number;
  preco_unitario: number;
}
export interface CartFrete {
  uid: string;
  tipo: 'frete';
  estado: string;
  cidade: string;
  valor: number;
}

export interface MeuOrcamentoPDFData {
  numero: number | string;
  data: Date;
  cliente: string;
  vendedor: string;
  portas: CartPorta[];
  avulsos: CartAvulso[];
  frete: CartFrete | null;
}

const fmtBR = (n: number) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtCurrency = (n: number) => `R$ ${fmtBR(n)}`;

export function generateMeuOrcamentoPDF(data: MeuOrcamentoPDFData): jsPDF {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const margin = 14;

  // ===== Cabeçalho =====
  try {
    pdf.addImage('/lovable-uploads/9f8b49f3-817e-40f0-87b0-856e0cbe536a.png', 'PNG', margin, 10, 55, 22);
  } catch {
    pdf.setFont('helvetica', 'bold').setFontSize(22).text('ELISA', margin, 22);
    pdf.setFont('helvetica', 'normal').setFontSize(9).text('PORTAS DE ENROLAR', margin, 28);
  }

  pdf.setFont('helvetica', 'normal').setFontSize(9).setTextColor(0, 0, 0);
  const headerRight = [
    'ELISA PORTAS LTDA',
    'Rua Padre Elio Baron Toaldo, Nº 571',
    '95055-652 - Caxias do Sul, RS',
    'Telefone: (54) 99219-9382',
    'CNPJ: 59.277.825/0001-09',
  ];
  headerRight.forEach((line, i) => {
    pdf.text(line, pageW - margin, 14 + i * 5, { align: 'right' });
  });

  // ===== Título =====
  let y = 50;
  pdf.setFont('helvetica', 'bold').setFontSize(18);
  pdf.text(`Proposta Nº ${String(data.numero).padStart(4, '0')}`, pageW / 2, y, { align: 'center' });
  y += 12;

  // ===== "Para" + caixa de número/data =====
  pdf.setFont('helvetica', 'bold').setFontSize(10);
  pdf.text('Para', margin, y);
  y += 2;

  const leftBoxW = 115;
  const rightBoxX = margin + leftBoxW + 8;
  const rightBoxW = pageW - margin - rightBoxX;

  pdf.setDrawColor(180);
  pdf.rect(margin, y, leftBoxW, 26);
  pdf.setFont('helvetica', 'normal').setFontSize(10);
  pdf.text(data.cliente || '—', margin + 3, y + 6);

  // Caixa de número/data com duas linhas
  autoTable(pdf, {
    startY: y,
    margin: { left: rightBoxX, right: margin },
    tableWidth: rightBoxW,
    styles: { fontSize: 9, cellPadding: 2, lineColor: [180, 180, 180], lineWidth: 0.2 },
    headStyles: { fillColor: [255, 255, 255] },
    body: [
      [{ content: 'Número da Proposta', styles: { fontStyle: 'bold' } }, String(data.numero).padStart(4, '0')],
      [{ content: 'Data', styles: { fontStyle: 'bold' } }, data.data.toLocaleDateString('pt-BR')],
    ],
    theme: 'grid',
  });

  y += 32;
  pdf.setFont('helvetica', 'normal').setFontSize(10);
  pdf.text(`Vendedor(a): ${data.vendedor || '—'}`, margin, y);
  y += 7;

  // ===== Itens =====
  pdf.setFont('helvetica', 'bold').setFontSize(10);
  pdf.text('Itens da proposta comercial', margin, y);
  y += 2;

  const linhasItens: any[] = [];
  data.portas.forEach((p) => {
    linhasItens.push([
      p.descricao,
      '—',
      'Un',
      fmtBR(p.quantidade),
      fmtBR(p.preco_unitario),
      '0,00',
      fmtBR(p.preco_unitario),
      fmtBR(p.preco_unitario * p.quantidade),
    ]);
  });
  data.avulsos.forEach((a) => {
    linhasItens.push([
      a.descricao,
      '—',
      a.unidade || 'Un',
      fmtBR(a.quantidade),
      fmtBR(a.preco_unitario),
      '0,00',
      fmtBR(a.preco_unitario),
      fmtBR(a.preco_unitario * a.quantidade),
    ]);
  });

  autoTable(pdf, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Descrição do produto/serviço', 'Código', 'Un', 'Qtd.', 'Preço lista.', 'Desconto %', 'Preço un.', 'Preço total']],
    body: linhasItens.length ? linhasItens : [[{ content: 'Nenhum item', colSpan: 8, styles: { halign: 'center' } }]],
    styles: { fontSize: 9, cellPadding: 2.2, lineColor: [180, 180, 180], lineWidth: 0.2 },
    headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 60 },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right' },
    },
    theme: 'grid',
  });

  // ===== Resumo =====
  const totalPortas = data.portas.reduce((s, p) => s + p.preco_unitario * p.quantidade, 0);
  const totalAvulsos = data.avulsos.reduce((s, a) => s + a.preco_unitario * a.quantidade, 0);
  const totalItens = totalPortas + totalAvulsos;
  const frete = data.frete?.valor || 0;
  const totalProposta = totalItens + frete;
  const somaQtds = data.portas.reduce((s, p) => s + p.quantidade, 0) + data.avulsos.reduce((s, a) => s + a.quantidade, 0);
  const nItens = data.portas.length + data.avulsos.length;

  const afterItensY = (pdf as any).lastAutoTable.finalY + 6;

  autoTable(pdf, {
    startY: afterItensY,
    margin: { left: margin, right: margin },
    head: [['Nº de Itens', 'Soma das Qtdes', 'Total outros itens', 'Desconto total dos itens', 'Total dos itens', 'Frete', 'Total da proposta']],
    body: [[
      String(nItens).padStart(2, '0') + ',00',
      String(somaQtds),
      fmtBR(totalAvulsos),
      '0,00',
      fmtBR(totalItens),
      fmtBR(frete),
      fmtBR(totalProposta),
    ]],
    styles: { fontSize: 9, cellPadding: 2.2, halign: 'right', lineColor: [180, 180, 180], lineWidth: 0.2 },
    headStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'right' },
    theme: 'grid',
  });

  let y2 = (pdf as any).lastAutoTable.finalY + 8;

  // ===== Outros itens / Formas de pagamento =====
  pdf.setFont('helvetica', 'bold').setFontSize(11);
  pdf.text('Outros itens ou serviços', margin, y2);
  y2 += 6;

  pdf.setFont('helvetica', 'normal').setFontSize(10);
  pdf.text('Formas de pagamento:', margin, y2); y2 += 5;
  pdf.text('Entrada de 70% + boleto 21 dias, considerando valor à vista.', margin, y2); y2 += 5;
  pdf.text(`Valor à vista (3% de desconto): ${fmtCurrency(totalProposta * 0.97)}`, margin, y2); y2 += 5;
  pdf.text('Ou até 10x no cartão SEM JUROS.', margin, y2); y2 += 5;

  // ===== Página 2: condições =====
  pdf.addPage();
  let py = 18;
  pdf.setFont('helvetica', 'bold').setFontSize(14);
  pdf.text('Condições comerciais', margin, py); py += 8;

  const sections: Array<{ title: string; lines: string[] }> = [
    {
      title: 'INFORMAÇÕES IMPORTANTES:',
      lines: [
        '• Todas as cortinas são produzidas em aço galvanizado de alta resistência;',
        '• Atenção: A empresa não se responsabiliza por passagem de PU nas laterais da porta. Pois a porta será',
        '  instalada no nível e prumo, caso a estrutura ou viga esteja desalinhada, é de responsabilidade do',
        '  cliente realizar o acabamento após a instalação;',
        '• Atenção: A porta de enrolar não é totalmente silenciosa, possui o ruído natural do atrito do aço;',
        '• Atenção: A porta não possui vedação total na sua parte inferior (contra água, areia, poeira entre outros).',
      ],
    },
    {
      title: 'RESPONSABILIDADE DO CLIENTE:',
      lines: [
        '• Deixar o local de instalação limpo e livre para o dia da instalação. Caso haja algum objeto que impeça',
        '  a instalação, a mesma será reagendada para os próximos 15 dias (caso não seja avisado antecipadamente,',
        '  será cobrado novo deslocamento).',
        '• Deixar um ponto de energia para ligar o motor.',
        '• Caso o cliente opte por outra forma de esconder o rolo e motor, é necessário dois acessos de 50x50cm',
        '  para eventuais manutenções.',
      ],
    },
    {
      title: 'ITENS NÃO OBRIGATÓRIOS, CASO DESEJE SOLICITE NO SEU ORÇAMENTO:',
      lines: [
        'NOBREAK: Bateria para funcionamento sem energia elétrica;',
        'CAIXA: Para esconder rolo e motor;',
        'WIFI OU CENTRAL BLUETOOTH: Para abertura pelo celular.',
      ],
    },
  ];

  pdf.setFontSize(9);
  sections.forEach((s) => {
    pdf.setFont('helvetica', 'bold').text(s.title, margin, py); py += 5;
    pdf.setFont('helvetica', 'normal');
    s.lines.forEach((l) => { pdf.text(l, margin, py); py += 4.5; });
    py += 2;
  });

  py += 2;
  pdf.setFont('helvetica', 'bold').setFontSize(13).text('TERMO DE GARANTIA', margin, py); py += 7;

  const garantia: Array<{ title: string; lines: string[] }> = [
    {
      title: 'GARANTIA GRUPO ELISA:',
      lines: [
        '1.1 7 DIAS: Controles e Central de Comando do Motor.',
        '1.2 30 DIAS: Instalação da Porta de Enrolar.',
        '(Após os 30 dias da instalação, a garantia se estende em 1 ano para defeitos sobre peças como meia',
        'cana, guias e motores. Sendo cobrado o custo de deslocamento e despesas para os instaladores efetuarem',
        'a troca. OU SEJA, A GARANTIA DE 1 ANO SE ESTENDE PARA A PEÇA NA PORTA DA EMPRESA.)',
        '1.3 A empresa garante os serviços e produtos por ela fornecidos, pelo período de 1 ano, contados a partir',
        'do recebimento definitivo do objeto do contrato, NÃO se estendendo a mais 1 ano após a troca de garantia.',
        '1.4 Somente um técnico autorizado pela empresa está habilitado a reparar defeitos cobertos pela garantia,',
        'mediante abertura de chamado.',
      ],
    },
    {
      title: '02 - ASSISTÊNCIA TÉCNICA',
      lines: [
        '2.1 A assistência técnica será prestada de segunda-feira a sexta-feira, no horário de 8h às 17h,',
        'e consistirá na reparação de eventuais falhas das portas e na substituição de peças e componentes',
        'que se apresentem defeituosos, de acordo com normas técnicas específicas.',
        '2.2 O prazo para atendimento de chamado e devida resolução de problema em produtos e serviços',
        'fornecidos é de 15 dias úteis, a partir da comunicação do defeito realizada pelo cliente à contratada.',
      ],
    },
    {
      title: '03 - AS GARANTIAS LEGAL E/OU CONTRATUAL NÃO COBREM',
      lines: [
        '3.1 Falhas no funcionamento dos produtos decorrentes de uso inadequado, ou seja, em desacordo com',
        'as instruções e recomendações de uso. Ex: esquecer objetos embaixo da porta.',
        '3.2 Produtos ou peças que tenham sido danificados em consequência de remoção ou manuseio por',
        'pessoas não autorizadas ou fatos decorrentes de forças da natureza, tais como raios, chuvas, inundações.',
      ],
    },
    {
      title: 'CANCELAMENTO DO PEDIDO',
      lines: [
        '04 - Até 48 horas sem custo. A partir disto, será retido para valores de matéria-prima e mão de obra',
        '80% do valor e restituído em até 60 dias os outros 20% para o cliente.',
      ],
    },
    {
      title: 'PRAZO DE ENTREGA',
      lines: ['05 - 30 a 60 dias úteis.'],
    },
  ];

  pdf.setFontSize(9);
  garantia.forEach((s) => {
    if (py > 270) { pdf.addPage(); py = 18; }
    pdf.setFont('helvetica', 'bold').text(s.title, margin, py); py += 5;
    pdf.setFont('helvetica', 'normal');
    s.lines.forEach((l) => { pdf.text(l, margin, py); py += 4.5; });
    py += 2;
  });

  py += 4;
  pdf.setFont('helvetica', 'normal').setFontSize(10);
  pdf.text('Atenciosamente,', margin, py); py += 5;
  pdf.text('Departamento de vendas', margin, py);

  return pdf;
}

export function downloadMeuOrcamentoPDF(data: MeuOrcamentoPDFData) {
  const pdf = generateMeuOrcamentoPDF(data);
  pdf.save(`Elisa_Portas_-_${String(data.numero).padStart(4, '0')}.pdf`);
}
