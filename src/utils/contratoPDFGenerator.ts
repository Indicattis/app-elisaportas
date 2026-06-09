import jsPDF from 'jspdf';
import { ContratoVariaveis } from '@/types/contrato';
import { substituirVariaveis } from '@/hooks/useContratoVariaveis';
import { CompanySettings } from '@/types/company';

interface ContratoPDFData {
  template: string;
  variaveis: ContratoVariaveis;
  numeroContrato: string;
  companySettings: CompanySettings;
}

export const generateContratoPDF = (data: ContratoPDFData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - (margin * 2);
  let currentY = margin;

  // === HEADER (APENAS PRIMEIRA PÁGINA) ===
  const addHeader = () => {
    // Logo da empresa
    try {
      const logo = new Image();
      logo.src = '/images/logo-elisa-contrato.png';
      doc.addImage(logo, 'PNG', margin, currentY, 40, 12);
    } catch (error) {
      console.error('Erro ao carregar logo:', error);
    }
    
    // Informações da empresa
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const infoX = margin + 45;
    doc.text(data.companySettings.nome, infoX, currentY + 3);
    doc.text(`CNPJ: ${data.companySettings.cnpj}`, infoX, currentY + 7);
    doc.text(`${data.companySettings.endereco} - ${data.companySettings.cidade} - CEP: ${data.companySettings.cep}`, infoX, currentY + 11);
    
    currentY += 20;
    
    // Título do contrato
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Contrato De Prestação de Serviço', pageWidth / 2, currentY, { align: 'center' });
    
    currentY += 8;
    
    // Data (sem número de contrato)
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Data: ${data.variaveis.data_geracao}`, pageWidth / 2, currentY, { align: 'center' });
    
    currentY += 10;
    
    // Linha separadora
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 10;
  };

  // === FOOTER (TODAS AS PÁGINAS) ===
  const addFooter = (pageNum: number, totalPages: number) => {
    const footerY = pageHeight - 15;
    
    // Linha separadora
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
    
    // Informações de contato
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    
    const footerInfo = [
      data.companySettings.site || '',
      data.companySettings.email || '',
      data.companySettings.telefone || ''
    ].filter(Boolean).join(' | ');
    
    doc.text(footerInfo, pageWidth / 2, footerY, { align: 'center' });
    
    // Número da página
    doc.text(`Página ${pageNum} de ${totalPages}`, pageWidth - margin, footerY, { align: 'right' });
  };

  // Adicionar header apenas na primeira página
  addHeader();

  // === CONTEÚDO DO TEMPLATE ===
  const conteudoProcessado = substituirVariaveis(data.template, data.variaveis);
  const linhas = conteudoProcessado.split('\n');
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);

  linhas.forEach(linha => {
    // Verificar se precisa de nova página
    if (currentY > pageHeight - 40) {
      addFooter(doc.getCurrentPageInfo().pageNumber, 1); // Será atualizado depois
      doc.addPage();
      currentY = margin;
      // NÃO adicionar header nas páginas seguintes
      // Resetar estilos do texto
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
    }

    // Processar linha (quebrar se muito longa)
    if (linha.trim()) {
      const linhasQuebradas = doc.splitTextToSize(linha, maxWidth);
      linhasQuebradas.forEach((linhaQuebrada: string) => {
        if (currentY > pageHeight - 40) {
          addFooter(doc.getCurrentPageInfo().pageNumber, 1);
          doc.addPage();
          currentY = margin;
          // NÃO adicionar header nas páginas seguintes
          // Resetar estilos do texto
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(60, 60, 60);
        }
        doc.text(linhaQuebrada, margin, currentY);
        currentY += 6;
      });
    } else {
      currentY += 4; // Espaço para linha vazia
    }
  });

  // === SEÇÃO DE ASSINATURAS (PADRÃO) ===
  const addSignatures = () => {
    // Verificar espaço para assinaturas
    if (currentY > pageHeight - 80) {
      addFooter(doc.getCurrentPageInfo().pageNumber, 1);
      doc.addPage();
      currentY = margin;
    }

    currentY += 15;

    // Título da seção
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('ASSINATURA', pageWidth / 2, currentY, { align: 'center' });
    currentY += 15;

    // Assinatura do Cliente (centralizada)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    
    const centerX = pageWidth / 2;
    const signatureY = currentY;

    // Cliente
    doc.text('CONTRATANTE:', centerX, signatureY, { align: 'center' });
    doc.line(centerX - 35, signatureY + 15, centerX + 35, signatureY + 15);
    doc.setFontSize(9);
    doc.text(data.variaveis.cliente_nome, centerX, signatureY + 20, { align: 'center' });
    doc.text(`CPF: ${data.variaveis.cliente_cpf || '___.___.___-__'}`, centerX, signatureY + 25, { align: 'center' });
    doc.text(`Data: ___/___/_____`, centerX, signatureY + 30, { align: 'center' });
  };

  addSignatures();

  // Atualizar todos os footers com número correto de páginas
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(i, totalPages);
  }

  // Salvar PDF
  const clienteSlug = (data.variaveis.cliente_nome || 'cliente')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_');
  const fileName = `contrato_${clienteSlug}_${data.numeroContrato}_${Date.now()}.pdf`;
  doc.save(fileName);
  
  return fileName;
};
