import jsPDF from 'jspdf';

interface CompanyInfo {
  nome: string;
  cnpj: string;
  endereco: string;
  cidade: string;
  cep: string;
  telefone?: string | null;
  email?: string | null;
  site?: string | null;
}

interface AutorizadoInfo {
  nome: string;
  cpf_cnpj?: string | null;
}

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

const slug = (s: string) =>
  (s || 'autorizado')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .toLowerCase();

export function generateContratoAutorizadoPDF(autorizado: AutorizadoInfo, company: CompanyInfo) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  const now = new Date();
  const dataExtenso = `Caxias do Sul/RS, ${now.getDate()} de ${MESES[now.getMonth()]} de ${now.getFullYear()}`;

  const parceiroNome = (autorizado.nome || '').trim() || '___________________________________________';
  const parceiroDoc = (autorizado.cpf_cnpj || '').trim() || '____________________________';

  // Header
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(company.nome, margin, y + 3);
  doc.text(`CNPJ: ${company.cnpj}`, margin, y + 7);
  doc.text(`${company.endereco} - ${company.cidade} - CEP: ${company.cep}`, margin, y + 11);
  y += 18;

  // Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('TERMO DE PARCERIA COM INSTALADOR AUTORIZADO', pageWidth / 2, y, { align: 'center' });
  y += 8;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 40, 40);

  const ensureSpace = (needed = 10) => {
    if (y + needed > pageHeight - 25) {
      doc.addPage();
      y = margin;
    }
  };

  const writePara = (text: string, opts: { bold?: boolean; spacing?: number } = {}) => {
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach((line: string) => {
      ensureSpace(6);
      doc.text(line, margin, y);
      y += 5;
    });
    y += opts.spacing ?? 3;
  };

  const writeBullet = (text: string) => {
    const bulletIndent = margin + 5;
    const lines = doc.splitTextToSize(text, maxWidth - 5);
    lines.forEach((line: string, i: number) => {
      ensureSpace(6);
      if (i === 0) doc.text('•', margin, y);
      doc.text(line, bulletIndent, y);
      y += 5;
    });
    y += 2;
  };

  // Partes
  writePara(`CONTRATANTE: ${company.nome.toUpperCase()}, inscrita no CNPJ nº ${company.cnpj}, com sede em ${company.cidade}.`);
  writePara(`PARCEIRO AUTORIZADO: ${parceiroNome}, CPF/CNPJ nº ${parceiroDoc}.`);
  writePara('As partes firmam o presente Termo de Parceria para Instalação Autorizada de Portas de Enrolar Automáticas, mediante as seguintes condições:', { spacing: 4 });

  // 1
  writePara('1. OBJETO', { bold: true });
  writePara('O presente termo tem por finalidade estabelecer parceria entre as partes para a realização de serviços de instalação, manutenção e assistência técnica das portas de enrolar automáticas comercializadas pela CONTRATANTE.', { spacing: 4 });

  // 2
  writePara('2. RESPONSABILIDADES DO PARCEIRO', { bold: true });
  writePara('O PARCEIRO compromete-se a:');
  writeBullet('Executar os serviços com qualidade, segurança e observância das orientações técnicas fornecidas pela CONTRATANTE;');
  writeBullet('Utilizar ferramentas adequadas e equipamentos de proteção individual;');
  writeBullet('Preservar a imagem e reputação da CONTRATANTE perante os clientes;');
  writeBullet('Informar imediatamente qualquer ocorrência, defeito ou situação que possa comprometer o funcionamento do equipamento ou a satisfação do cliente;');
  writeBullet('Responsabilizar-se por danos decorrentes de falhas de instalação causadas por negligência, imprudência ou imperícia.');
  y += 2;

  // 3
  writePara('3. AUTONOMIA DAS PARTES', { bold: true });
  writePara('A presente parceria possui natureza estritamente comercial, não gerando vínculo empregatício, societário, associativo ou de exclusividade entre as partes, sendo o PARCEIRO integralmente responsável por seus encargos fiscais, trabalhistas, previdenciários e demais obrigações legais.', { spacing: 4 });

  // 4
  writePara('4. USO DA IDENTIFICAÇÃO DE INSTALADOR AUTORIZADO', { bold: true });
  writePara('Enquanto vigente esta parceria, o PARCEIRO poderá divulgar-se como "Instalador Autorizado Grupo Elisa", comprometendo-se a utilizar essa identificação de forma ética e profissional.', { spacing: 4 });

  // 5
  writePara('5. VIGÊNCIA E RESCISÃO', { bold: true });
  writePara('O presente termo vigorará por prazo indeterminado, podendo ser encerrado por qualquer das partes mediante comunicação por escrito, sem ônus, permanecendo exigíveis as obrigações assumidas até a data do encerramento.', { spacing: 4 });

  writePara('E, por estarem de acordo, as partes assinam o presente Termo de Parceria em 2 (duas) vias de igual teor e forma.', { spacing: 6 });

  ensureSpace(50);
  doc.setFont('helvetica', 'bold');
  doc.text(dataExtenso, pageWidth / 2, y, { align: 'center' });
  y += 20;

  // Assinaturas lado a lado
  ensureSpace(40);
  const leftX = margin + 30;
  const rightX = pageWidth - margin - 30;
  doc.setDrawColor(80, 80, 80);
  doc.line(leftX - 25, y, leftX + 25, y);
  doc.line(rightX - 25, y, rightX + 25, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(company.nome.toUpperCase(), leftX, y, { align: 'center' });
  doc.text('PARCEIRO AUTORIZADO', rightX, y, { align: 'center' });
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('CONTRATANTE', leftX, y, { align: 'center' });
  doc.text(parceiroNome, rightX, y, { align: 'center' });
  y += 4;
  doc.text('', leftX, y, { align: 'center' });
  doc.text(`CPF/CNPJ: ${parceiroDoc}`, rightX, y, { align: 'center' });

  // Footer todas as páginas
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    const fy = pageHeight - 12;
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, fy - 4, pageWidth - margin, fy - 4);
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.setFont('helvetica', 'normal');
    const info = [company.site, company.email, company.telefone].filter(Boolean).join(' | ');
    if (info) doc.text(info, pageWidth / 2, fy, { align: 'center' });
    doc.text(`Página ${i} de ${total}`, pageWidth - margin, fy, { align: 'right' });
  }

  const fileName = `contrato_parceria_${slug(autorizado.nome)}_${Date.now()}.pdf`;
  doc.save(fileName);
  return fileName;
}