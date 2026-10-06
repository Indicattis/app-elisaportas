import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export interface KitItem { descricao: string; quantidade: number; unidade: string; categoria?: string }

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
  kit_id?: string | null;
  kit_itens?: KitItem[];
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
  clienteCpf?: string;
  clienteCidade?: string;
  vendedor: string;
  vendedorFoto?: string;
  /** interno: foto já convertida em dataURL */
  vendedorFotoData?: string;
  detalharItens?: boolean;
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
  const margin = 12;
  const contentW = pageW - margin * 2;
  const blue: [number, number, number] = [25, 118, 210];
  const gray: [number, number, number] = [128, 128, 128];
  const light: [number, number, number] = [245, 245, 245];
  const pageBottom = 278;
  const lastTableY = () => (pdf as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 120;

  try {
    pdf.addImage('/lovable-uploads/9f8b49f3-817e-40f0-87b0-856e0cbe536a.png', 'PNG', margin, 8, 62, 22);
  } catch {
    pdf.setFont('helvetica', 'bold').setFontSize(24).text('ELISA', margin, 22);
    pdf.setFont('helvetica', 'normal').setFontSize(9).text('PORTAS DE ENROLAR', margin, 28);
  }
  pdf.setFont('helvetica', 'normal').setFontSize(9).setTextColor(0);
  [
    'Rua Padre Elio Baron Toaldo, 571',
    '95055652 - Caxias do Sul, RS',
    'CNPJ: 59.277.825/0001-09',
    'Telefone: (54) 99219-9382',
  ].forEach((line, i) => pdf.text(line, pageW - margin - 58, 14 + i * 4.3));
  pdf.setDrawColor(...gray).setLineWidth(0.2).line(margin, 33, pageW - margin, 33);
  pdf.setFont('helvetica', 'bold').setFontSize(16).text('PROPOSTA COMERCIAL', margin, 43);
  pdf.setFont('helvetica', 'normal').setFontSize(10);
  pdf.text(`Nº: ${data.numero}`, pageW - margin - 58, 39.5);
  pdf.text(`Data: ${data.data.toLocaleDateString('pt-BR')}`, pageW - margin - 58, 45.5);

  pdf.setFont('helvetica', 'bold').setFontSize(12).text('Dados do cliente', margin, 55);
  pdf.setFont('helvetica', 'normal').setFontSize(9);
  const nameLines = pdf.splitTextToSize(`Nome: ${data.cliente || 'Não informado'}`, contentW / 2 - 10);
  const cityLines = pdf.splitTextToSize(`Cidade: ${data.clienteCidade || 'Não informado'}`, contentW / 2 - 10);
  const boxH = Math.max(18, Math.max(nameLines.length, cityLines.length) * 4.2 + 12);
  pdf.setFillColor(...light).rect(margin, 60, contentW, boxH, 'F');
  pdf.text(nameLines, margin + 4, 66);
  if (data.clienteCpf) pdf.text(`CPF/CNPJ: ${data.clienteCpf}`, margin + 4, 66 + nameLines.length * 4.2 + 2);
  pdf.text(cityLines, pageW / 2, 66);
  // O estado disponível pertence ao destino do frete, não ao cadastro do cliente.

  let y = 60 + boxH + 9;
  pdf.setFont('helvetica', 'bold').setFontSize(12).text('Atendente responsável', margin, y);
  y += 4;
  if (data.vendedorFotoData) {
    try {
      const imageType = data.vendedorFotoData.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      pdf.addImage(data.vendedorFotoData, imageType, margin, y, 14, 14);
    } catch { /* Foto indisponível: mantém o nome do atendente. */ }
  }
  const nomeX = data.vendedorFotoData ? margin + 19 : margin;
  pdf.setFont('helvetica', 'bold').setFontSize(10);
  const sellerLines = pdf.splitTextToSize(data.vendedor || 'Não informado', pageW - margin - nomeX);
  pdf.text(sellerLines, nomeX, y + 4);
  pdf.setFont('helvetica', 'normal').setFontSize(9).text('Departamento Comercial', nomeX, y + 4 + sellerLines.length * 4.2);
  y += Math.max(22, sellerLines.length * 4.2 + 14);
  pdf.setFont('helvetica', 'bold').setFontSize(12).text('Produtos e Serviços', margin, y);

  const linhasItens: any[] = [];
  const quantity = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 3 });
  data.portas.forEach((p) => {
    linhasItens.push(['Porta de Enrolar', p.descricao, quantity(p.quantidade), fmtCurrency(p.preco_unitario), '-', fmtCurrency(p.preco_unitario * p.quantidade)]);
    if (data.detalharItens) p.kit_itens?.forEach((k) => {
      const style = { textColor: gray, fontSize: 8, cellPadding: { top: 1.5, bottom: 1.5, left: 3, right: 3 } };
      linhasItens.push(['Kit', k.descricao, `${quantity(Number(k.quantidade || 0) * p.quantidade)} ${k.unidade || 'Un'}`, 'Incluso', '-', 'Incluso'].map(content => ({ content, styles: style })));
    });
  });
  data.avulsos.forEach((a) => linhasItens.push(['Avulso', a.descricao, `${quantity(a.quantidade)} ${a.unidade || 'Un'}`, fmtCurrency(a.preco_unitario), '-', fmtCurrency(a.preco_unitario * a.quantidade)]));
  autoTable(pdf, {
    startY: y + 3,
    margin: { left: margin, right: margin, bottom: 20, top: 15 },
    head: [['Categoria', 'Produto', 'Un.', 'Valor', 'Desconto', 'Valor final']],
    body: linhasItens.length ? linhasItens : [[{ content: 'Nenhum item', colSpan: 6, styles: { halign: 'center' } }]],
    theme: 'striped',
    styles: { fontSize: 9, cellPadding: 3, textColor: [70, 70, 70], overflow: 'linebreak' },
    headStyles: { fillColor: blue, textColor: [255, 255, 255], fontStyle: 'bold', minCellHeight: 10 },
    alternateRowStyles: { fillColor: light },
    rowPageBreak: 'avoid',
    columnStyles: {
      0: { cellWidth: 32 }, 1: { cellWidth: 58 }, 2: { cellWidth: 19, halign: 'center' },
      3: { cellWidth: 27, halign: 'right' }, 4: { cellWidth: 24, halign: 'center' }, 5: { cellWidth: contentW - 160, halign: 'right' },
    },
  });
  const totalItens = data.portas.reduce((s, p) => s + p.preco_unitario * p.quantidade, 0) + data.avulsos.reduce((s, a) => s + a.preco_unitario * a.quantidade, 0);
  const frete = data.frete?.valor || 0;
  const totalProposta = totalItens + frete;
  y = lastTableY() + 12;
  if (y + 49 > pageBottom) { pdf.addPage(); y = 18; }
  pdf.setTextColor(0).setFont('helvetica', 'bold').setFontSize(12).text('RESUMO FINANCEIRO', margin, y);
  y += 9;
  pdf.setFont('helvetica', 'normal').setFontSize(10).text('Valor dos Produtos:', margin, y);
  pdf.text(fmtCurrency(totalItens), pageW - margin, y, { align: 'right' });
  y += 6;
  pdf.text('Frete:', margin, y);
  pdf.text(data.frete ? fmtCurrency(frete) : 'Não incluso', pageW - margin, y, { align: 'right' });
  y += 7;
  pdf.setDrawColor(...gray).setLineWidth(0.4).line(margin, y, pageW - margin, y);
  y += 8;
  pdf.setFont('helvetica', 'bold').setFontSize(16).text('TOTAL:', margin, y);
  pdf.text(fmtCurrency(totalProposta), pageW - margin, y, { align: 'right' });
  y += 9;
  pdf.setFont('helvetica', 'normal').setFontSize(10);
  const payment = pdf.splitTextToSize('Forma de Pagamento: Entrada de 70% + boleto 21 dias (valor à vista) ou até 10x no cartão sem juros.', contentW);
  pdf.text(payment, margin, y);
  y += payment.length * 4.5 + 1;
  pdf.text('Previsão de Entrega: 30 a 60 dias úteis.', margin, y);

  // Desenho proporcional às medidas de cada porta, em página própria.
  const totalPortas = data.portas.reduce((n, p) => n + p.quantidade, 0);
  let doorNumber = 0;
  data.portas.forEach(p => {
    for (let i = 0; i < p.quantidade; i++) {
      doorNumber++;
      pdf.addPage();
      pdf.setTextColor(0).setFont('helvetica', 'bold').setFontSize(14).text('DESENHO TÉCNICO', 15, 18);
      pdf.setTextColor(...gray).setFont('helvetica', 'normal').setFontSize(10);
      pdf.text(`Porta ${doorNumber} de ${totalPortas} - ${fmtBR(p.largura)}m x ${fmtBR(p.altura)}m`, 15, 25);
      if (p.largura <= 0 || p.altura <= 0) continue;
      const scale = Math.min(136 / p.largura, 136 / p.altura);
      const w = p.largura * scale, h = p.altura * scale;
      const x = (pageW - w) / 2, top = 66 + (136 - h) / 2;
      pdf.setDrawColor(90).setLineWidth(0.3);
      pdf.setFillColor(190, 190, 190).rect(x, top, w, 12, 'FD');
      pdf.setFillColor(140, 140, 140).rect(x - 6, top + 12, 6, h - 12, 'FD');
      pdf.rect(x + w, top + 12, 6, h - 12, 'FD');
      pdf.setFillColor(232, 240, 252).rect(x, top + 12, w, h - 12, 'F');
      pdf.setDrawColor(...blue).setLineWidth(0.5).line(x, top + 12, x + w, top + 12);
      pdf.line(x, top + h, x + w, top + h);
      pdf.setLineWidth(0.15);
      for (let slat = top + 19; slat < top + h; slat += 7) pdf.line(x, slat, x + w, slat);
      pdf.setTextColor(80).setFontSize(7).text('Rolo / eixo', pageW / 2, top + 7, { align: 'center' });
      const bottom = top + h;
      pdf.setDrawColor(50).setLineWidth(0.25);
      pdf.line(x, bottom + 2, x, bottom + 14); pdf.line(x + w, bottom + 2, x + w, bottom + 14);
      pdf.line(x, bottom + 12, x + w, bottom + 12);
      pdf.setFillColor(90, 90, 90).triangle(x, bottom + 12, x + 3, bottom + 11, x + 3, bottom + 13, 'F');
      pdf.triangle(x + w, bottom + 12, x + w - 3, bottom + 11, x + w - 3, bottom + 13, 'F');
      const dimX = x + w + 16;
      pdf.line(dimX - 8, top, dimX + 2, top); pdf.line(dimX - 8, bottom, dimX + 2, bottom);
      pdf.line(dimX, top, dimX, bottom);
      pdf.triangle(dimX, top, dimX - 1, top + 3, dimX + 1, top + 3, 'F');
      pdf.triangle(dimX, bottom, dimX - 1, bottom - 3, dimX + 1, bottom - 3, 'F');
      pdf.setTextColor(0).setFont('helvetica', 'bold').setFontSize(10);
      pdf.text(`Largura: ${fmtBR(p.largura)} m`, pageW / 2, bottom + 9, { align: 'center' });
      pdf.text(`Altura: ${fmtBR(p.altura)} m`, dimX + 4, top + h / 2 - 12, { angle: 90 });
      pdf.setTextColor(...gray).setFont('helvetica', 'normal').setFontSize(9);
      pdf.text(`Área: ${fmtBR(p.largura * p.altura)} m²`, pageW / 2, bottom + 20, { align: 'center' });
    }
  });

  pdf.addPage();
  let py = 18;
  pdf.setTextColor(0).setFont('helvetica', 'bold').setFontSize(14);
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

  const writeSections = (items: Array<{ title: string; lines: string[] }>) => {
    items.forEach(section => {
      pdf.setFont('helvetica', 'normal').setFontSize(8);
      const paragraphs: string[] = [];
      section.lines.forEach(line => {
        if (/^(•|\d\.\d|NOBREAK:|CAIXA:|WIFI|0[45] -|\()/.test(line) || !paragraphs.length) {
          paragraphs.push(line.trim());
        } else {
          const last = paragraphs.length - 1;
          paragraphs[last] = `${paragraphs[last]} ${line.trim()}`;
        }
      });
      const lines = paragraphs.flatMap(paragraph => pdf.splitTextToSize(paragraph, contentW));
      if (py + 8 + lines.length * 3.5 > pageBottom) { pdf.addPage(); py = 18; }
      pdf.setFont('helvetica', 'bold').setFontSize(9).text(section.title, margin, py); py += 5;
      pdf.setFont('helvetica', 'normal').setFontSize(8).text(lines, margin, py);
      py += lines.length * 3.5 + 4;
    });
  };
  writeSections(sections);

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

  writeSections(garantia);

  py += 4;
  pdf.setFont('helvetica', 'normal').setFontSize(10);
  pdf.text('Atenciosamente,', margin, py); py += 5;
  pdf.text('Departamento de vendas', margin, py);

  for (let page = 1; page <= pdf.getNumberOfPages(); page++) {
    pdf.setPage(page);
    pdf.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...gray);
    pdf.text('Elisa Portas LTDA - A maior fábrica de portas de enrolar do Sul do País', margin, 289);
  }
  return pdf;
}

async function urlToDataURL(url?: string): Promise<string | undefined> {
  if (!url) return undefined;
  try {
    const res = await fetch(url);
    if (!res.ok) return undefined;
    const blob = await res.blob();
    const raw: string = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
    // normaliza para JPEG via canvas (suporta webp etc.)
    return await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const size = Math.min(img.width, img.height);
        const c = document.createElement('canvas');
        c.width = 200; c.height = 200;
        const ctx = c.getContext('2d');
        if (!ctx) return resolve(raw);
        ctx.beginPath(); ctx.arc(100, 100, 100, 0, Math.PI * 2); ctx.clip();
        ctx.drawImage(img, (img.width - size) / 2, (img.height - size) / 2, size, size, 0, 0, 200, 200);
        resolve(c.toDataURL('image/png'));
      };
      img.onerror = () => resolve(undefined);
      img.src = raw;
    });
  } catch {
    return undefined;
  }
}

export async function fetchKitItens(kitId: string): Promise<KitItem[]> {
  const { data, error } = await supabase.rpc('get_kit_itens', { p_kit_id: kitId });
  if (error) return [];
  return (data || []).map((d: any) => ({ descricao: d.descricao, quantidade: Number(d.quantidade || 0), unidade: d.unidade || 'Un', categoria: d.categoria }));
}

export async function findKitId(largura: number, altura: number): Promise<string | null> {
  const { data } = await supabase
    .from('tabela_precos_portas')
    .select('id,largura,altura')
    .eq('ativo', true)
    .gte('largura', largura)
    .gte('altura', altura);
  if (!data || !data.length) return null;
  const best = [...data].sort((a: any, b: any) => (a.largura - largura + a.altura - altura) - (b.largura - largura + b.altura - altura))[0] as any;
  return best?.id ?? null;
}

/** Garante kit_id e kit_itens em cada porta (para orçamentos antigos também) */
export async function resolveKitItens(portas: CartPorta[]): Promise<CartPorta[]> {
  return Promise.all(portas.map(async (p) => {
    if (p.kit_itens && p.kit_itens.length) return p;
    const kitId = p.kit_id || await findKitId(p.largura, p.altura);
    if (!kitId) return p;
    return { ...p, kit_id: kitId, kit_itens: await fetchKitItens(kitId) };
  }));
}

async function prepare(data: MeuOrcamentoPDFData): Promise<MeuOrcamentoPDFData> {
  const portas = data.detalharItens ? await resolveKitItens(data.portas) : data.portas;
  return { ...data, portas, vendedorFotoData: await urlToDataURL(data.vendedorFoto) };
}

export async function downloadMeuOrcamentoPDF(data: MeuOrcamentoPDFData) {
  const pdf = generateMeuOrcamentoPDF(await prepare(data));
  pdf.save(`Elisa_Portas_-_${String(data.numero).padStart(4, '0')}.pdf`);
}

export async function previewMeuOrcamentoPDF(data: MeuOrcamentoPDFData) {
  // Abre a aba já no clique para não ser bloqueada pelo navegador
  const win = window.open('', '_blank');
  const pdf = generateMeuOrcamentoPDF(await prepare(data));
  const url = pdf.output('bloburl').toString();
  if (win) {
    win.location.href = url;
  } else {
    toast.error('Permita pop-ups para visualizar o PDF');
  }
}
