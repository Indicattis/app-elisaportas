import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ProdutoVenda {
  tipo_produto: string;
  tamanho?: string;
  largura?: number;
  altura?: number;
  cor?: { nome: string; codigo_hex?: string } | null;
  valor_produto: number;
  valor_pintura?: number;
  valor_instalacao?: number;
  desconto_percentual?: number;
  desconto_valor?: number;
  tipo_desconto?: string;
  quantidade?: number;
  descricao?: string;
  descricao_manutencao?: string;
}

export interface FormalizacaoVendaPDFData {
  id: string;
  numeroVenda?: string;
  dataVenda: string;
  dataPrevistaEntrega?: string;
  cliente: {
    nome?: string;
    cpf?: string;
    telefone?: string;
    email?: string;
    estado?: string;
    cidade?: string;
    cep?: string;
    bairro?: string;
  };
  produtos: ProdutoVenda[];
  valores: {
    valorVenda: number;
    valorFrete?: number;
    valorInstalacao?: number;
    valorEntrada?: number;
    valorAReceber?: number;
  };
  formaPagamento?: string;
  observacoes?: string;
  atendente?: {
    nome?: string;
    cargo?: string;
    foto_perfil_url?: string;
  };
}

export const generateFormalizacaoVendaPDF = (data: FormalizacaoVendaPDFData) => {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.width;
  const margin = 10;
  let yPosition = 15;

  // Configuração de cores
  const primaryColor = [41, 128, 185] as [number, number, number];
  const grayColor = [128, 128, 128] as [number, number, number];
  const successColor = [34, 139, 34] as [number, number, number];
  
  // Configurar fonte padrão como sans-serif
  pdf.setFont('helvetica', 'normal');

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('pt-BR');
  };

  const getTipoProdutoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      porta_enrolar: 'Porta de Enrolar',
      porta_social: 'Porta Social',
      acessorio: 'Acessório',
      manutencao: 'Manutenção',
      adicional: 'Adicional',
      pintura_epoxi: 'Pintura Epóxi',
      instalacao: 'Instalação',
    };
    return labels[tipo] || tipo;
  };

  // Logo da empresa
  try {
    pdf.addImage('/lovable-uploads/9f8b49f3-817e-40f0-87b0-856e0cbe536a.png', 'PNG', margin, yPosition - 10, 60, 25);
  } catch (error) {
    // Fallback para texto se a imagem não carregar
    pdf.setFontSize(20);
    pdf.setTextColor(...primaryColor);
    pdf.setFont('helvetica', 'bold');
    pdf.text('ELISA PORTAS LTDA', margin, yPosition);
    
    pdf.setFontSize(12);
    pdf.setTextColor(...grayColor);
    pdf.setFont('helvetica', 'normal');
    pdf.text('A maior fábrica de portas de enrolar do Sul do país', margin, yPosition + 8);
  }

  // Informações da empresa no canto direito
  pdf.setFontSize(8);
  pdf.setTextColor(0, 0, 0);
  const empresaInfo = [
    'Rua Padre Elio Baron Toaldo, 571',
    '95055652 - Caxias do Sul, RS',
    'CNPJ: 59.277.825/0001-09'
  ];
  
  empresaInfo.forEach((info, index) => {
    pdf.text(info, pageWidth - margin - 60, yPosition + (index * 5));
  });
  
  // Linha divisória
  pdf.setDrawColor(...grayColor);
  pdf.setLineWidth(0.5);
  pdf.line(margin, yPosition + 15, pageWidth - margin, yPosition + 15);
  
  yPosition += 25;

  // Título do documento e número
  pdf.setFontSize(15);
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'bold');
  pdf.text('FORMALIZAÇÃO DE VENDA', margin, yPosition);

  const numeroVenda = data.numeroVenda || `VND-${(data.id || '').slice(-8).toUpperCase()}`;
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Nº: ${numeroVenda}`, pageWidth - margin - 60, yPosition - 4);
  pdf.text(`Data: ${formatDate(data.dataVenda) || new Date().toLocaleDateString('pt-BR')}`, pageWidth - margin - 60, yPosition + 2);
  
  yPosition += 10;

  // Dados do cliente com fundo destacado
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Dados do cliente', margin, yPosition);
  yPosition += 10;

  // Fundo cinza claro para a seção do cliente
  pdf.setFillColor(245, 245, 245);
  pdf.rect(margin, yPosition - 3, pageWidth - (margin * 2), 34, 'F');
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  pdf.text(`Nome: ${data.cliente.nome || 'Não informado'}`, margin + 3, yPosition + 3);
  pdf.text(`CPF: ${data.cliente.cpf || 'Não informado'}`, margin + 3, yPosition + 9);
  pdf.text(`Telefone: ${data.cliente.telefone || 'Não informado'}`, margin + 3, yPosition + 15);
  pdf.text(`Email: ${data.cliente.email || 'Não informado'}`, margin + 3, yPosition + 21);

  pdf.text(`Estado: ${data.cliente.estado || 'Não informado'}`, pageWidth / 2, yPosition + 3);
  pdf.text(`Cidade: ${data.cliente.cidade || 'Não informado'}`, pageWidth / 2, yPosition + 9);
  pdf.text(`CEP: ${data.cliente.cep || 'Não informado'}`, pageWidth / 2, yPosition + 15);
  pdf.text(`Bairro: ${data.cliente.bairro || 'Não informado'}`, pageWidth / 2, yPosition + 21);

  yPosition += 38;

  // Informações da vendedora
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Atendente responsável', margin, yPosition);
  yPosition += 5;

  // Adicionar avatar do atendente
  try {
    if (data.atendente?.foto_perfil_url) {
      pdf.addImage(data.atendente.foto_perfil_url, 'PNG', margin, yPosition, 12, 12);
    } else {
      pdf.addImage('/lovable-uploads/9f8b49f3-817e-40f0-87b0-856e0cbe536a.png', 'PNG', margin, yPosition, 20, 20);
    }
  } catch (error) {
    pdf.setFillColor(200, 200, 200);
    pdf.circle(margin + 10, yPosition + 10, 10, 'F');
  }

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${data.atendente?.nome || 'Consultor(a) de Vendas'}`, margin + 15, yPosition + 4);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`${data.atendente?.cargo || 'Departamento Comercial'}`, margin + 15, yPosition + 8);
  
  yPosition += 20;

  // Produtos
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Produtos e Serviços', margin, yPosition);
  yPosition += 5;

  if (data.produtos && data.produtos.length > 0) {
    const tableData = data.produtos.map(produto => {
      const categoria = getTipoProdutoLabel(produto.tipo_produto);
      let descricao = '';

      if (produto.tipo_produto === 'porta_enrolar' || produto.tipo_produto === 'porta_social') {
        if (produto.largura && produto.altura) {
          descricao = `${categoria} ${produto.largura.toFixed(2)}m x ${produto.altura.toFixed(2)}m`;
        } else if (produto.tamanho) {
          descricao = `${categoria} ${produto.tamanho}`;
        } else {
          descricao = categoria;
        }
        if (produto.cor?.nome) descricao += ` - ${produto.cor.nome}`;
      } else if (produto.tipo_produto === 'pintura_epoxi') {
        descricao = produto.cor?.nome ? `Pintura Epóxi - ${produto.cor.nome}` : 'Pintura Epóxi';
      } else if (produto.tipo_produto === 'manutencao') {
        descricao = produto.descricao_manutencao || 'Serviço de manutenção';
      } else {
        descricao = produto.descricao || categoria;
      }

      const quantidade = produto.quantidade || 1;
      const precoUnitario = (produto.valor_produto || 0) + (produto.valor_pintura || 0) + (produto.valor_instalacao || 0);

      let desconto = 0;
      if (produto.tipo_desconto === 'percentual' && produto.desconto_percentual) {
        desconto = precoUnitario * (produto.desconto_percentual / 100);
      } else if (produto.desconto_valor) {
        desconto = produto.desconto_valor;
      } else if (produto.desconto_percentual) {
        desconto = precoUnitario * (produto.desconto_percentual / 100);
      }

      const precoFinal = (precoUnitario - desconto) * quantidade;

      return [
        categoria,
        descricao,
        quantidade.toString(),
        formatCurrency(precoUnitario),
        desconto > 0 ? formatCurrency(desconto) : '-',
        formatCurrency(precoFinal)
      ];
    });

    autoTable(pdf, {
      head: [['Categoria', 'Produto', 'Un.', 'Valor', 'Desconto', 'Valor final']],
      body: tableData,
      startY: yPosition,
      styles: { 
        fontSize: 8,
        cellPadding: 3
      },
      headStyles: { 
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold'
      },
      tableWidth: 'auto',
      columnStyles: {
        0: { halign: 'left' },     // Categoria
        1: { halign: 'left' },     // Produto
        2: { halign: 'center' },   // QTD
        3: { halign: 'right' },    // Preço
        4: { halign: 'center' },   // Desconto
        5: { halign: 'right' }     // Preço Final
      },
      margin: { left: margin, right: margin }
    });

    yPosition = (pdf as any).lastAutoTable.finalY + 20;
  } else {
    pdf.setFont('helvetica', 'normal');
    pdf.text('Nenhum produto adicionado', margin, yPosition);
    yPosition += 10;
  }

  // Resumo
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('RESUMO FINANCEIRO', margin, yPosition);
  yPosition += 10;

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  
  const valorProdutos = (data.valores.valorVenda || 0) - (data.valores.valorFrete || 0);
  pdf.text('Valor dos Produtos:', margin, yPosition);
  const vpText = formatCurrency(valorProdutos);
  pdf.text(vpText, pageWidth - margin - pdf.getTextWidth(vpText), yPosition);
  yPosition += 7;

  if (data.valores.valorFrete && data.valores.valorFrete > 0) {
    pdf.text('Frete:', margin, yPosition);
    const t = formatCurrency(data.valores.valorFrete);
    pdf.text(t, pageWidth - margin - pdf.getTextWidth(t), yPosition);
    yPosition += 7;
  }

  // Linha antes do total
  pdf.setDrawColor(...grayColor);
  pdf.setLineWidth(0.5);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 8;

  // Total - alinhado à direita máxima
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text('TOTAL:', margin, yPosition);
  const totalText = formatCurrency(data.valores.valorVenda || 0);
  const totalTextWidth = pdf.getTextWidth(totalText);
  pdf.text(totalText, pageWidth - margin - totalTextWidth, yPosition);
  
  yPosition += 12;

  // Entrada / Saldo
  if (data.valores.valorEntrada && data.valores.valorEntrada > 0) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(...successColor);
    pdf.text(`Entrada: ${formatCurrency(data.valores.valorEntrada)}`, margin, yPosition);
    if (data.valores.valorAReceber && data.valores.valorAReceber > 0) {
      pdf.setTextColor(0, 0, 0);
      const saldoText = `Saldo a receber: ${formatCurrency(data.valores.valorAReceber)}`;
      pdf.text(saldoText, pageWidth - margin - pdf.getTextWidth(saldoText), yPosition);
    }
    pdf.setTextColor(0, 0, 0);
    yPosition += 8;
  }

  // Forma de pagamento
  if (data.formaPagamento) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`Forma de Pagamento: ${data.formaPagamento}`, margin, yPosition);
    yPosition += 7;
  }

  // Previsão de entrega
  if (data.dataPrevistaEntrega) {
    pdf.text(`Previsão de Entrega: ${formatDate(data.dataPrevistaEntrega)}`, margin, yPosition);
    yPosition += 7;
  }

  yPosition += 6;

  // Bloco de confirmação
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  pdf.text('CONFIRMAÇÃO DA VENDA', margin, yPosition);
  yPosition += 7;

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(60, 60, 60);
  const confirmacaoLinhas = pdf.splitTextToSize(
    'Este documento formaliza a compra e venda dos produtos e serviços descritos acima, ratificando os valores, prazos e condições acordados entre as partes. Ao efetuar o pagamento, o cliente declara estar ciente e de acordo com as condições, garantias e responsabilidades descritas neste documento.',
    pageWidth - 2 * margin
  );
  confirmacaoLinhas.forEach((l: string) => {
    pdf.text(l, margin, yPosition);
    yPosition += 5;
  });
  yPosition += 4;

  // Seção de Observações (se houver)
  if (data.observacoes && data.observacoes.trim()) {
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('OBSERVAÇÕES:', margin, yPosition);
    yPosition += 8;
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...grayColor);
    
    const linhasObs = pdf.splitTextToSize(data.observacoes, pageWidth - 2 * margin);
    linhasObs.forEach((linha: string) => {
      pdf.text(linha, margin, yPosition);
      yPosition += 5;
    });
    yPosition += 10;
  }

  // Rodapé sempre no final da página
  yPosition = pdf.internal.pageSize.height - 15;
  pdf.setFontSize(8);
  pdf.setTextColor(...grayColor);
  pdf.text('Elisa Portas LTDA - Documento de formalização de venda.', margin, yPosition);
  pdf.text('A maior fábrica de portas de enrolar do Sul do País', margin, yPosition + 6);
  pdf.text('Contato: comercial@elisaportas.com.br', margin, yPosition + 12);

  //NOVA PÁGINA
  pdf.addPage();
  yPosition = 15;

  // Termos de garantia
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(0, 0, 0);
  pdf.text('INFORMAÇÕES IMPORTANTES:', margin, yPosition);
  yPosition += 15;


  pdf.setFontSize(8);
  pdf.setTextColor(...grayColor);
  pdf.text('- Todas as cortinas são produzidas em aço galvanizado de alta resistência;', margin, yPosition);
  yPosition += 3;
  pdf.text('- Atenção: A empresa não se responsabiliza por passagem de PU nas laterais da porta. Pois a porta será instalada no nível e olumo, caso ', margin, yPosition);
  yPosition += 3;
  pdf.text('a estrutura ou viga esteja desalinhada, é de responsabilidade do cliente realizar o acabamento após a instalação;', margin, yPosition);
  yPosition += 3;
  pdf.text('- Atenção: A porta de enrolar não é totalmente silenciosa, possui o ruído natural do atrito do aço;', margin, yPosition);
  yPosition += 3;
  pdf.text('- Atenção: A porta não possui vedação total na sua parte inferior (Contra água, areia, poeira entre outros).', margin, yPosition);
  yPosition += 15;
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(0, 0, 0);
  pdf.text('RESPONSABILIDADE DO CLIENTE:', margin, yPosition);
  yPosition += 15;

  pdf.setFontSize(8);
  pdf.setTextColor(...grayColor);
  pdf.text('- Deixar o local de instalacão limpo e livre para o dia da instalacão, caso haia aloum obieto que impeca a instalação, a mesma será ', margin, yPosition);
  yPosition += 3;
  pdf.text('reagendada para os próximos 15 dias. (Caso não seja avisado antecipadamente será cobrado novo deslocamento).', margin, yPosition);
  yPosition += 3;
  pdf.text('- Deixar um ponto de energia para ligar o motor.', margin, yPosition);
  yPosition += 3;
  pdf.text('- Caso o cliente opte por outra forma de esconder o rolo e motor, é necessário dois acessos de 50x50cm para eventuais manutenções.', margin, yPosition);
  yPosition += 5;
  pdf.setFont('helvetica', 'bold');
  pdf.text('NOBREACK: Bateria para funcionamento sem energia elétrica;', margin, yPosition);
  yPosition += 3;
  pdf.text('CAIXA: Para esconder rolo e motor;', margin, yPosition);
  yPosition += 3;
  pdf.text('ITENS NÃO OBRIGATÓRIOS, CASO DESEJE SOLICITE NO SEU ORÇAMENTO)', margin, yPosition);
  yPosition += 15;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(0, 0, 0);
  pdf.text('TERMO DE GARANTIA', margin, yPosition);
  yPosition += 15;

  pdf.text('01 - GARANTIA', margin, yPosition);
  yPosition += 10;
  
  pdf.setFontSize(8);
  pdf.setTextColor(...grayColor);
  pdf.text('1.1 A empresa garante os serviços e produtos por ela forecidos, pelo período de 5 anos, incluídas a garantia legal, contados a partir ', margin, yPosition);
  yPosition += 3;
  pdf.text('do recebimento definitivo do ojbeto do contrato.', margin, yPosition);
  yPosition += 3;
  pdf.text('1.1.1 Esta garantia abrange peças, materiais e serviços, desde que os produtos tenham sido utilizados conforme orientações passadas ', margin, yPosition);
  yPosition += 3;
  pdf.text('pelos técnicos.', margin, yPosition);
  yPosition += 3;
  pdf.text('1.1.2 Garantia de cada peça:', margin, yPosition);
  yPosition += 3;
  pdf.text('Motor - 01 ano de garantia, Controles, botoeira e instalação - 01 mês de garantia.', margin, yPosition);
  yPosition += 3;
  pdf.text('A garantia de 05 anos refere se sobre ocorrer corrosão das peças ou desplacamento da pintura epóxi.', margin, yPosition);
  yPosition += 3;
  pdf.text('1.1.3 Somente um técnico autorizado pela empresa está habilitado a reparar defeitos cobertos pela garantia, mediante abertura de .', margin, yPosition);
  yPosition += 3;
  pdf.text('chamado.', margin, yPosition);
  yPosition += 3;
  pdf.text('1.1.3 Somente um técnico autorizado pela empresa está habilitado a reparar defeitos cobertos pela garantia, ', margin, yPosition);
  yPosition += 15;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(0, 0, 0);
  pdf.text('02 - ASSISTÊNCIA TÉCNICA', margin, yPosition);
  yPosition += 10;

  pdf.setFontSize(8);
  pdf.setTextColor(...grayColor);
  pdf.text('2.1 A assistência técnica será prestada de segunda-feira a sexta-feira, no horário de 8h às 17h, e consistirá na reparação de ', margin, yPosition);
  yPosition += 3;
  pdf.text('eventuais falhas das portas e na substituição de peças e componentes que se apresentem defeituosos, de acordo com normas ', margin, yPosition);
  yPosition += 3;
  pdf.text('técnicas específicas.', margin, yPosition);
  yPosition += 3;
  pdf.text('2.20 prazo para atendimento de chamado e devida resolução de problema em produtos e serviços fornecidos é de 10 dias úteis, ', margin, yPosition);
  yPosition += 3;
  pdf.text('a partir da comunição do defeito realizada pelo cliente à contratada, conforme sistema de registro da própria contratante.', margin, yPosition);
  yPosition += 15;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(0, 0, 0);
  pdf.text('03 - AS GARANTIAS LEGAL E/ OU CONTRATUAL NÃO COBREM', margin, yPosition);
  yPosition += 10;

  pdf.setFontSize(8);
  pdf.setTextColor(...grayColor);
  pdf.text('3.1 Falhas no funcionamento dos produtos decorrentes de uso inadequado, ou seja, em desacordo com as instruções e recomendações ', margin, yPosition);
  yPosition += 3;
  pdf.text('de uso. Ex: Esquecer objetos embaixo da porta.', margin, yPosition);
  yPosition += 3;
  pdf.text('3.2 Produtos ou peças que tenham sido danificados em consequência de remoção ou manuseio por pessoas não autorizadas ou fatos ', margin, yPosition);
  yPosition += 3;
  pdf.text('decorrentes de forças da natureza, tais como ralos, chuvas, inundações, etc.', margin, yPosition);
  yPosition += 15;

  pdf.setFontSize(8);
  pdf.setTextColor(0, 0, 0);
  pdf.text('Atenciosamente,', margin, yPosition);
  yPosition += 3;
  pdf.text('Equipe de vendas.', margin, yPosition);
  yPosition += 5;
  
  // Salvar o PDF
  const dateStr = new Date().toISOString().split('T')[0];
  const fileName = `formalizacao-venda-${numeroVenda}-${dateStr}.pdf`;
  pdf.save(fileName);
  
  return fileName;
};