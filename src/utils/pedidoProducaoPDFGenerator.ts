import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PedidoProducaoPDFData {
  pedido: {
    id: string;
    numero_pedido: string;
    etapa_atual: string;
    status?: string;
    created_at: string;
  };
  cliente?: {
    nome: string;
    cidade?: string;
    estado?: string;
    valor_venda?: number;
    forma_pagamento?: string;
    tipo_entrega?: string;
    data_prevista_entrega?: string;
  };
  produtos: Array<{
    tipo_produto?: string;
    descricao?: string;
    tamanho?: string;
    cor?: string;
    quantidade: number;
    peso?: string;
    meiaCanas?: string;
  }>;
  linhas: Array<{
    nome_produto?: string;
    descricao_produto?: string;
    quantidade: number;
    tamanho?: string;
  }>;
  observacoes: Array<{
    porta_descricao: string;
    local_instalacao?: string;
    observacoes?: string;
    responsavel_nome?: string;
  }>;
  ordens: Array<{
    tipo: string;
    numero_ordem: string;
    status: string;
  }>;
}

const ETAPA_LABELS: Record<string, string> = {
  aberto: "Aberto",
  em_producao: "Em Produção",
  inspecao_qualidade: "Inspeção de Qualidade",
  aguardando_pintura: "Aguardando Pintura",
  aguardando_coleta: "Expedição Coleta",
  aguardando_instalacao: "Expedição Instalação",
  finalizado: "Finalizado",
};

const STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  em_andamento: "Em Andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export const gerarPedidoProducaoPDF = (data: PedidoProducaoPDFData): jsPDF => {
  const doc = new jsPDF();
  renderPedidoProducaoIntoDoc(doc, data);
  return doc;
};

/**
 * Renderiza um pedido em um documento jsPDF existente, começando em startY.
 * Útil para concatenar múltiplos pedidos em um único PDF (impressão em lote).
 */
export const renderPedidoProducaoIntoDoc = (
  doc: jsPDF,
  data: PedidoProducaoPDFData,
  startY: number = 15
): number => {
  const margemX = 15;
  let posY = startY;
  
  const corPrimaria: [number, number, number] = [41, 128, 185];
  const corSecundaria: [number, number, number] = [128, 128, 128];
  
  // === CABEÇALHO ===
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('ELISA PORTAS LTDA', margemX, posY);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(corSecundaria[0], corSecundaria[1], corSecundaria[2]);
  posY += 5;
  doc.text('Rua Padre Elio, Nº 30 - Bairro Lama Preta', margemX, posY);
  posY += 4;
  doc.text('Barbacena - MG | (32) 3331-8383', margemX, posY);
  doc.setTextColor(0, 0, 0);
  
  // Linha divisória
  posY += 5;
  doc.setDrawColor(corPrimaria[0], corPrimaria[1], corPrimaria[2]);
  doc.setLineWidth(1);
  doc.line(margemX, posY, 195, posY);
  
  // === TÍTULO ===
  posY += 10;
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(corPrimaria[0], corPrimaria[1], corPrimaria[2]);
  doc.text('PEDIDO DE PRODUÇÃO', 105, posY, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  
  // === BOX INFORMAÇÕES DO PEDIDO ===
  posY += 8;
  doc.setDrawColor(corPrimaria[0], corPrimaria[1], corPrimaria[2]);
  doc.setLineWidth(0.5);
  doc.rect(margemX, posY, 180, 20);
  
  posY += 6;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Pedido: #${data.pedido.numero_pedido}`, margemX + 5, posY);
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Etapa: ${ETAPA_LABELS[data.pedido.etapa_atual] || data.pedido.etapa_atual}`, 110, posY);
  
  posY += 7;
  const dataCriacao = format(new Date(data.pedido.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  doc.text(`Criado em: ${dataCriacao}`, margemX + 5, posY);
  
  if (data.pedido.status) {
    doc.text(`Status: ${STATUS_LABELS[data.pedido.status] || data.pedido.status}`, 110, posY);
  }
  
  posY += 15;
  
  // === DADOS DO CLIENTE ===
  if (data.cliente) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Dados do Cliente', margemX, posY);
    posY += 2;
    
    const clienteRows: string[][] = [];
    clienteRows.push(['Nome', data.cliente.nome || '-']);
    
    if (data.cliente.cidade && data.cliente.estado) {
      clienteRows.push(['Localização', `${data.cliente.cidade}, ${data.cliente.estado}`]);
    }
    if (data.cliente.valor_venda) {
      clienteRows.push(['Valor da Venda', `R$ ${Number(data.cliente.valor_venda).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`]);
    }
    if (data.cliente.forma_pagamento) {
      clienteRows.push(['Forma de Pagamento', data.cliente.forma_pagamento]);
    }
    if (data.cliente.tipo_entrega) {
      clienteRows.push(['Tipo de Entrega', data.cliente.tipo_entrega]);
    }
    if (data.cliente.data_prevista_entrega) {
      clienteRows.push(['Data Prevista', format(new Date(data.cliente.data_prevista_entrega), "dd/MM/yyyy")]);
    }
    
    autoTable(doc, {
      startY: posY,
      margin: { left: margemX, right: margemX },
      head: [['Campo', 'Valor']],
      body: clienteRows,
      headStyles: {
        fillColor: corPrimaria,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: 'bold' },
        1: { cellWidth: 130 },
      },
    });
    
    posY = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // === PRODUTOS DA VENDA ===
  if (data.produtos.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Produtos da Venda', margemX, posY);
    posY += 2;
    
    const produtosRows = data.produtos.map(p => [
      p.tipo_produto || '-',
      p.descricao || '-',
      p.tamanho || '-',
      p.cor || '-',
      p.peso || '-',
      p.meiaCanas || '-',
      p.quantidade.toString(),
    ]);
    
    autoTable(doc, {
      startY: posY,
      margin: { left: margemX, right: margemX },
      head: [['Tipo', 'Descrição', 'Tamanho', 'Cor', 'Peso (kg)', 'M. Canas', 'Qtd']],
      body: produtosRows,
      headStyles: {
        fillColor: corPrimaria,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 50 },
        2: { cellWidth: 25 },
        3: { cellWidth: 25 },
        4: { cellWidth: 20, halign: 'right' },
        5: { cellWidth: 20, halign: 'right' },
        6: { cellWidth: 15, halign: 'center' },
      },
    });
    
    posY = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // === ITENS DO PEDIDO (LINHAS) ===
  if (data.linhas.length > 0) {
    // Verificar se precisa de nova página
    if (posY > 220) {
      doc.addPage();
      posY = 20;
    }
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Itens do Pedido', margemX, posY);
    posY += 2;
    
    const linhasRows = data.linhas.map(l => [
      l.nome_produto || '-',
      l.descricao_produto || '-',
      l.quantidade.toString(),
      l.tamanho || '-',
    ]);
    
    autoTable(doc, {
      startY: posY,
      margin: { left: margemX, right: margemX },
      head: [['Produto', 'Descrição', 'Qtd', 'Tamanho']],
      body: linhasRows,
      headStyles: {
        fillColor: corPrimaria,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 75 },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 30 },
      },
    });
    
    posY = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // === OBSERVAÇÕES DA VISITA TÉCNICA ===
  if (data.observacoes.length > 0) {
    if (posY > 220) {
      doc.addPage();
      posY = 20;
    }
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Observações da Visita Técnica', margemX, posY);
    posY += 2;
    
    const obsRows = data.observacoes.map(o => [
      o.porta_descricao || '-',
      o.local_instalacao || '-',
      o.observacoes || '-',
      o.responsavel_nome || '-',
    ]);
    
    autoTable(doc, {
      startY: posY,
      margin: { left: margemX, right: margemX },
      head: [['Porta', 'Local de Instalação', 'Observações', 'Responsável']],
      body: obsRows,
      headStyles: {
        fillColor: [255, 152, 0],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 35 },
        2: { cellWidth: 70 },
        3: { cellWidth: 35 },
      },
    });
    
    posY = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // === ORDENS DE PRODUÇÃO ===
  if (data.ordens.length > 0) {
    if (posY > 240) {
      doc.addPage();
      posY = 20;
    }
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Ordens de Produção', margemX, posY);
    posY += 2;
    
    const ordensRows = data.ordens.map(o => [
      o.tipo,
      o.numero_ordem,
      STATUS_LABELS[o.status] || o.status,
    ]);
    
    autoTable(doc, {
      startY: posY,
      margin: { left: margemX, right: margemX },
      head: [['Tipo', 'Número', 'Status']],
      body: ordensRows,
      headStyles: {
        fillColor: [76, 175, 80],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 70 },
        2: { cellWidth: 60 },
      },
      didParseCell: (cellData) => {
        if (cellData.row.section === 'body' && cellData.column.index === 2) {
          const status = data.ordens[cellData.row.index]?.status;
          if (status === 'concluido') {
            cellData.cell.styles.textColor = [46, 125, 50];
            cellData.cell.styles.fontStyle = 'bold';
          } else if (status === 'em_andamento') {
            cellData.cell.styles.textColor = [25, 118, 210];
          }
        }
      },
    });
    
    posY = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // === RODAPÉ ===
  const finalY = Math.max(posY, 270);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(corSecundaria[0], corSecundaria[1], corSecundaria[2]);
  
  const dataEmissao = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  doc.text(`Emitido em: ${dataEmissao}`, margemX, finalY);
  doc.text('Elisa Portas - comercial@elisaportas.com.br | www.elisaportas.com.br', margemX, finalY + 4);
  doc.setTextColor(0, 0, 0);

  return finalY + 4;
};

export const baixarPedidoProducaoPDF = (data: PedidoProducaoPDFData): void => {
  const doc = gerarPedidoProducaoPDF(data);
  const fileName = `pedido-${data.pedido.numero_pedido}.pdf`;
  doc.save(fileName);
};

export const imprimirPedidoProducaoPDF = (data: PedidoProducaoPDFData): void => {
  const doc = gerarPedidoProducaoPDF(data);
  const pdfBlob = doc.output('blob');
  const url = URL.createObjectURL(pdfBlob);
  const printWindow = window.open(url, '_blank');
  if (printWindow) {
    printWindow.onload = () => printWindow.print();
  }
};

/**
 * Gera um único PDF contendo vários pedidos, um por página.
 */
export const gerarPedidosProducaoPDFBatch = (
  dataArr: PedidoProducaoPDFData[]
): jsPDF => {
  const doc = new jsPDF();
  dataArr.forEach((data, idx) => {
    if (idx > 0) doc.addPage();
    renderPedidoProducaoIntoDoc(doc, data, 15);
  });
  return doc;
};

export const imprimirPedidosProducaoPDFBatch = (
  dataArr: PedidoProducaoPDFData[]
): void => {
  const doc = gerarPedidosProducaoPDFBatch(dataArr);
  const pdfBlob = doc.output('blob');
  const url = URL.createObjectURL(pdfBlob);
  const printWindow = window.open(url, '_blank');
  if (printWindow) {
    printWindow.onload = () => printWindow.print();
  }
};

export type { PedidoProducaoPDFData };
