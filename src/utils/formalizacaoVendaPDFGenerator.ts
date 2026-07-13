import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { OrcamentoFormData } from '@/types/orcamento';
import type { OrcamentoProduto } from '@/types/produto';
import { distribuirCustosLogisticos, criarItensLogisticosIncluso } from './costDistribution';

interface OrcamentoPDFData {
  id?: string;
  formData: OrcamentoFormData;
  produtos: OrcamentoProduto[];
  calculatedTotal: number;
  numeroOrcamento?: string;
  valorInstalacao?: number;
  vendedora?: {
    nome: string;
    cargo: string;
    avatar_url?: string;
  };
}

interface GeneratePDFOptions {
  id?: string;
  numeroOrcamento?: string;
  observacoes?: string;
  valorInstalacao?: number;
  modalidadeInstalacao?: string;
  vendedora?: {
    nome: string;
    cargo: string;
    avatar_url?: string;
  };
}

export const generateOrcamentoPDF = (formData: OrcamentoFormData, valorTotal: number, options?: GeneratePDFOptions) => {
  const data: OrcamentoPDFData = {
    id: options?.id,
    formData,
    produtos: formData.produtos || [],
    calculatedTotal: valorTotal,
    numeroOrcamento: options?.numeroOrcamento,
    valorInstalacao: options?.valorInstalacao,
    vendedora: options?.vendedora
  };
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.width;
  const margin = 10;
  let yPosition = 15;

  // Configuração de cores
  const primaryColor = [41, 128, 185] as [number, number, number];
  const grayColor = [128, 128, 128] as [number, number, number];
  const lightGrayColor = [245, 245, 245] as [number, number, number];
  
  // Configurar fonte padrão como sans-serif
  pdf.setFont('helvetica', 'normal');

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  };

  const getTipoProdutoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      porta_enrolar: 'Porta de Enrolar',
      porta_social: 'Porta Social',
      acessorio: 'Acessório',
      manutencao: 'Manutenção',
      adicional: 'Adicional',
      pintura_epoxi: 'Pintura Epóxi'
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
  pdf.setFontSize(16);
  pdf.setTextColor(0, 0, 0);
  pdf.setFont('helvetica', 'bold');
  pdf.text('#Proposta', margin, yPosition);
  
  const numeroOrcamento = data.numeroOrcamento || `ORC-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Nº: ${numeroOrcamento}`, 40, yPosition);
  pdf.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth - margin - 60, yPosition);
  
  yPosition += 10;

  // Dados do cliente com fundo destacado
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Dados do cliente', margin, yPosition);
  yPosition += 10;

  // Fundo cinza claro para a seção do cliente
  pdf.setFillColor(245, 245, 245);
  pdf.rect(margin, yPosition - 3, pageWidth - (margin * 2), 30, 'F');
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  pdf.text(`Nome: ${data.formData.cliente_nome || 'Não informado'}`, margin + 3, yPosition + 3);
  pdf.text(`CPF: ${data.formData.cliente_cpf || 'Não informado'}`, margin + 3, yPosition + 9);
  pdf.text(`Telefone: ${data.formData.cliente_telefone || 'Não informado'}`, margin + 3, yPosition + 15);
  
  pdf.text(`Estado: ${data.formData.cliente_estado || 'Não informado'}`, pageWidth/2, yPosition + 3);
  pdf.text(`Cidade: ${data.formData.cliente_cidade || 'Não informado'}`, pageWidth/2, yPosition + 9);
  pdf.text(`CEP: ${data.formData.cliente_cep || 'Não informado'}`, pageWidth/2, yPosition + 15);
  
  yPosition += 35;

  // Informações da vendedora
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Atendente responsável', margin, yPosition);
  yPosition += 5;

  // Adicionar avatar do atendente
  try {
    // Verifica se há avatar do vendedor, senão usa a logo da empresa como fallback
    if (data.vendedora?.avatar_url && data.vendedora.avatar_url !== '') {
      pdf.addImage(data.vendedora.avatar_url, 'PNG', margin, yPosition, 12, 12);
    } else {
      // Usar logo da empresa como fallback
      pdf.addImage('/lovable-uploads/9f8b49f3-817e-40f0-87b0-856e0cbe536a.png', 'PNG', margin, yPosition, 20, 20);
    }
  } catch (error) {
    // Fallback para círculo se a imagem não carregar
    pdf.setFillColor(200, 200, 200);
    pdf.circle(margin + 10, yPosition + 10, 10, 'F');
  }

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${data.vendedora?.nome || 'Consultora de Vendas'}`, margin + 15, yPosition + 4);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`${data.vendedora?.cargo || 'Departamento Comercial'}`, margin + 15, yPosition + 8);
  
  yPosition += 20;

  // Produtos
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Produtos e Serviços', margin, yPosition);
  yPosition += 5;

  if (data.produtos.length > 0) {
    // Distribuir custos logísticos entre produtos de porta
    const valorFrete = parseFloat(data.formData.valor_frete) || 0;
    const valorInstalacao = data.valorInstalacao || 0;
    const modalidadeInstalacao = (data.formData as any).modalidade_instalacao || 'instalacao_elisa';
    
    // Chamar a função para distribuir os custos proporcionalmente nas portas
    const produtosComCustosDistribuidos = distribuirCustosLogisticos(
      data.produtos,
      valorFrete,
      valorInstalacao,
      modalidadeInstalacao
    );
    
    // Preparar dados da tabela com produtos
    const tableData = produtosComCustosDistribuidos.map(produto => {
      const categoria = getTipoProdutoLabel(produto.tipo_produto);
      
      let produto_descricao = '';
      
      // Para produtos de porta, incluir medidas
      if (produto.tipo_produto === 'porta_enrolar' || produto.tipo_produto === 'porta_social') {
        if (produto.medidas) {
          produto_descricao = `${categoria} ${produto.medidas}`;
        } else {
          produto_descricao = categoria;
        }
      }
      // Para acessórios, usar a descrição se disponível
      else if (produto.tipo_produto === 'acessorio') {
        produto_descricao = produto.descricao || 'Acessório';
      }
      // Para manutenção, usar a descrição de manutenção
      else if (produto.tipo_produto === 'manutencao') {
        produto_descricao = produto.descricao_manutencao || 'Serviço de manutenção';
      }
      // Para adicionais, usar a descrição
      else if (produto.tipo_produto === 'adicional') {
        produto_descricao = produto.descricao || 'Adicional';
      }
      // Para pintura epóxi, buscar o nome da cor
      else if (produto.tipo_produto === 'pintura_epoxi') {
        // Aqui seria ideal ter o nome da cor, mas por enquanto mantemos uma descrição padrão
        produto_descricao = 'Pintura Epóxi';
      }
      else {
        produto_descricao = categoria;
      }

      const quantidade = 1; // Por padrão 1 unidade, pode ser modificado conforme necessário
      const precoUnitario = produto.valor;
      const desconto = produto.desconto_percentual || 0;
      const precoFinal = precoUnitario - (precoUnitario * desconto / 100);

      return [
        categoria,
        produto_descricao,
        quantidade.toString(),
        formatCurrency(precoUnitario),
        desconto > 0 ? `${desconto}%` : '-',
        formatCurrency(precoFinal)
      ];
    });

    // Adicionar itens logísticos como "Incluso"
    const itensLogisticos = criarItensLogisticosIncluso('instalacao_elisa');
    itensLogisticos.forEach(item => {
      tableData.push([
        'Serviço',
        `${item.descricao}: Incluso`,
        '1',
        formatCurrency(0),
        '-',
        formatCurrency(0)
      ]);
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
  pdf.text('RESUMO', margin, yPosition);
  yPosition += 10;

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  
  // Quantidade de itens - alinhado à direita máxima
  pdf.text('Quantidade de itens:', margin, yPosition);
  const qtyText = data.produtos.length.toString();
  const qtyTextWidth = pdf.getTextWidth(qtyText);
  pdf.text(qtyText, pageWidth - margin - qtyTextWidth, yPosition);
  yPosition += 8;

  // Desconto se houver - alinhado à direita máxima
  if (data.formData.desconto_total_percentual > 0) {
    const subtotal = data.calculatedTotal / (1 - data.formData.desconto_total_percentual / 100);
    const desconto = subtotal - data.calculatedTotal;
    
    pdf.text('Subtotal:', margin, yPosition);
    const subtotalText = formatCurrency(subtotal);
    const subtotalTextWidth = pdf.getTextWidth(subtotalText);
    pdf.text(subtotalText, pageWidth - margin - subtotalTextWidth, yPosition);
    yPosition += 8;
    
    pdf.setTextColor(0, 150, 0); // Verde para desconto
    pdf.text(`Desconto (${data.formData.desconto_total_percentual}%):`, margin, yPosition);
    const descontoText = `-${formatCurrency(desconto)}`;
    const descontoTextWidth = pdf.getTextWidth(descontoText);
    pdf.text(descontoText, pageWidth - margin - descontoTextWidth, yPosition);
    yPosition += 8;
    pdf.setTextColor(0, 0, 0); // Voltar para preto
  }

  // Linha antes do total
  pdf.setDrawColor(...grayColor);
  pdf.setLineWidth(0.5);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // Total - alinhado à direita máxima
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text('TOTAL:', margin, yPosition);
  const totalText = formatCurrency(data.calculatedTotal);
  const totalTextWidth = pdf.getTextWidth(totalText);
  pdf.text(totalText, pageWidth - margin - totalTextWidth, yPosition);
  
  yPosition += 20;

  // Seção de Observações (se houver)
  if (options?.observacoes && options.observacoes.trim()) {
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text('OBSERVAÇÕES:', margin, yPosition);
    yPosition += 8;
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...grayColor);
    
    // Quebrar texto longo em múltiplas linhas
    const linhasObs = pdf.splitTextToSize(options.observacoes, pageWidth - 2 * margin);
    linhasObs.forEach((linha: string) => {
      pdf.text(linha, margin, yPosition);
      yPosition += 5;
    });
    yPosition += 10;
  }

  // Verificar se há espaço suficiente para informações de pagamento
  // const remainingSpace = pdf.internal.pageSize.height - yPosition - 60; // 60 para o rodapé
  
  // if (remainingSpace < 30) {
  //   pdf.addPage();
  //   yPosition = 30;
  // }

  // Informações de pagamento
  // pdf.setFontSize(11);
  // pdf.setFont('helvetica', 'normal');
  // pdf.text(`Forma de Pagamento: ${data.formData.forma_pagamento || 'Não informado'}`, margin, yPosition);
  // yPosition += 6;
  
  // const modalidade = data.formData.modalidade_instalacao === 'instalacao_elisa' ? 'Instalação Elisa' : 'Autorizado Elisa';
  // pdf.text(`Modalidade de Instalação: ${modalidade}`, margin, yPosition);
  
  // Rodapé sempre no final da página
  yPosition = pdf.internal.pageSize.height - 15;
  pdf.setFontSize(8);
  pdf.setTextColor(...grayColor);
  pdf.text('Este orçamento tem validade de 30 dias.', margin, yPosition);
  pdf.text('Elisa Portas LTDA - A maior fábrica de portas de enrolar do Sul do País', margin, yPosition + 6);
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
  const fileName = `orcamento-${numeroOrcamento}.pdf`;
  pdf.save(fileName);
  
  return fileName;
};