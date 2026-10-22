import jsPDF from 'jspdf';

export interface ContratoKitData {
  comprador_nome: string;
  comprador_documento: string;
  comprador_endereco: string;
  quantidade_kits: string; // ex.: "01 (um)"
  material: string;
  motor: string;
  cor: string;
  dimensoes: string;
  valor_total: string; // "R$ 13.000,00 (treze mil reais)"
  forma_pagamento: string;
  cidade_assinatura: string;
}

const VENDEDOR =
  'VENDEDOR: GRUPO ELISA LTDA, CNPJ nº 20.462.028/0001-58, com sede na Rua Padre Elio Baron Toaldo, nº 571, Jardim das Hortências, CEP 95055-652, Caxias do Sul/RS.';

function clausulas(d: ContratoKitData): Array<{ titulo?: string; texto: string }> {
  return [
    { texto: `COMPRADOR: ${d.comprador_nome}, CPF/CNPJ nº ${d.comprador_documento}, com residência na ${d.comprador_endereco}.` },
    { texto: 'As partes acima identificadas celebram o presente Contrato de Compra e Venda de Kit de Porta de Enrolar Automática, que se regerá pelas cláusulas e condições seguintes.' },
    {
      titulo: 'CLÁUSULA PRIMEIRA – DO OBJETO DO CONTRATO',
      texto:
        `1. O presente contrato tem como objeto exclusivamente a fabricação e venda de ${d.quantidade_kits} kit(s) de porta de enrolar automática, sem fornecimento de serviço de instalação pelo VENDEDOR, conforme as seguintes especificações:\n\n` +
        `• MATERIAL: ${d.material}, dimensionado conforme as medidas e especificações aprovadas pelo COMPRADOR.\n` +
        `• MOTOR: ${d.motor}, com freio eletromagnético e fim de curso com limitador de parada automática; acionamento por botoeira de comando com 3 botões (abre, para e fecha).\n` +
        '• SISTEMA DE EMERGÊNCIA: corrente manual para acionamento na falta de energia elétrica.\n' +
        `• CARACTERÍSTICAS ADICIONAIS: pintura eletrostática na cor ${d.cor}.\n` +
        `• DIMENSÕES DA PORTA: ${d.dimensoes}.\n\n` +
        '2. O objeto contratado limita-se ao fornecimento do kit e dos componentes descritos nesta cláusula. Não estão incluídos instalação, montagem, regulagem no local, serviços elétricos, obras civis, acabamentos ou quaisquer outros serviços, salvo se contratados posteriormente por instrumento escrito específico.',
    },
    {
      titulo: 'CLÁUSULA SEGUNDA – DO PREÇO E DAS CONDIÇÕES DE PAGAMENTO',
      texto:
        `1. O COMPRADOR pagará ao VENDEDOR, pela fabricação e aquisição do kit descrito neste contrato, o valor total de ${d.valor_total}.\n` +
        `2. O valor será pago da seguinte forma: ${d.forma_pagamento}.\n` +
        '3. O pagamento deverá ser efetuado por depósito ou transferência identificada para conta de titularidade de GRUPO ELISA, ELISA PORTAS DE ENROLAR ou ELISA PROJETOS ESPECIAIS.\n' +
        '4. A entrega ou disponibilização do kit não depende de instalação pelo VENDEDOR, uma vez que a instalação não integra o objeto deste contrato.',
    },
    {
      titulo: 'CLÁUSULA TERCEIRA – DAS GARANTIAS DO PRODUTO',
      texto:
        '1. Os componentes eletrônicos do equipamento, tais como controles remotos, centrais de comando e botoeiras, possuem garantia legal de 90 (noventa) dias contra defeitos de fabricação, contados da entrega do produto, observada a legislação aplicável.\n' +
        '2. As peças mecânicas e estruturais, incluindo meia-cana, guias e motor, possuem garantia contratual de 01 (um) ano contra defeitos de fabricação, contados da entrega do produto, sem prejuízo das garantias legais aplicáveis.\n' +
        '3. A garantia das peças refere-se ao componente defeituoso e não inclui, por si só, despesas de deslocamento, desmontagem, reinstalação, hospedagem, alimentação, frete, transporte ou demais despesas operacionais. Quando houver atendimento técnico fora do perímetro urbano de Caxias do Sul, eventuais custos de deslocamento e despesas operacionais serão previamente informados ao COMPRADOR.\n' +
        '4. O COMPRADOR declara ciência de que o motor é classificado como de baixo fluxo operacional e deve respeitar os limites técnicos recomendados para o modelo contratado, ficando estabelecido o limite máximo de até 6 (seis) ciclos de abertura e fechamento por dia. O uso fora dessa especificação poderá caracterizar utilização inadequada.\n' +
        '5. A garantia não cobre danos decorrentes de utilização inadequada, sobrecarga operacional, uso contínuo excessivo, aquecimento por excesso de acionamentos, quebra de engrenagens, utilização em desacordo com as especificações técnicas, oscilações elétricas, ausência de manutenção preventiva, infiltrações, oxidação, impactos ou danos externos não relacionados a defeito de fabricação.\n' +
        '6. A manutenção preventiva deverá ser realizada periodicamente, incluindo lubrificação, alinhamento, regulagem de fim de curso e demais ajustes técnicos recomendados, observando-se intervalo máximo de 06 (seis) meses entre revisões. A ausência de manutenção poderá afetar a cobertura da garantia contratual, conforme a relação entre a falta de manutenção e o defeito apresentado.\n' +
        '7. A assistência técnica não cobre danos causados por acidentes, caso fortuito, força maior, instalações elétricas inadequadas, ausência de aterramento, surtos ou oscilações de energia elétrica.\n' +
        '8. A origem do defeito e a cobertura da garantia serão avaliadas tecnicamente pelo VENDEDOR, sem prejuízo dos direitos assegurados ao COMPRADOR pela legislação aplicável.\n' +
        '9. Intervenções, reparos ou manutenções realizados por pessoas não autorizadas poderão comprometer a garantia contratual quando houver relação entre a intervenção e o defeito constatado, sem afastar direitos legais obrigatórios do consumidor.',
    },
    {
      titulo: 'CLÁUSULA QUARTA – DA INSTALAÇÃO POR TERCEIROS E DOS LIMITES DE RESPONSABILIDADE',
      texto:
        '1. O COMPRADOR declara estar ciente de que o VENDEDOR comercializa, por este instrumento, exclusivamente o kit da porta automática, não executando nem supervisionando sua instalação.\n' +
        '2. A contratação do instalador, a conferência do local, a montagem, a fixação, a ligação elétrica, a regulagem, os testes de funcionamento e a observância das normas técnicas aplicáveis à instalação serão de responsabilidade do COMPRADOR e do profissional ou empresa por ele contratado.\n' +
        '3. O VENDEDOR não se responsabiliza pela qualidade, segurança, execução, prazo ou resultado dos serviços realizados por instaladores ou terceiros contratados diretamente pelo COMPRADOR, nem por danos decorrentes de instalação incorreta, montagem inadequada, ligações elétricas impróprias, ajustes indevidos ou intervenções de terceiros.\n' +
        '4. A exclusão de responsabilidade prevista nesta cláusula limita-se aos serviços de instalação e aos danos a eles relacionados. Ela não exclui nem restringe a responsabilidade do VENDEDOR por defeitos de fabricação do produto ou quaisquer direitos que sejam assegurados ao COMPRADOR pela legislação aplicável.',
    },
    {
      titulo: 'CLÁUSULA QUINTA – DA ASSISTÊNCIA TÉCNICA',
      texto:
        '1. A assistência técnica referente ao produto fornecido será atendida de segunda a sexta-feira, das 8h às 17h, e poderá envolver análise de falhas e substituição de peças ou componentes cobertos pela garantia, conforme as condições da Cláusula Terceira.\n' +
        '2. O prazo estimado para atendimento e resolução de chamados relativos aos produtos fornecidos é de até 20 (vinte) dias úteis a partir da comunicação do defeito ao VENDEDOR, observadas a disponibilidade de peças, a avaliação técnica, as condições da garantia e a legislação aplicável.\n' +
        '3. A assistência técnica do VENDEDOR não inclui a execução ou correção de serviços de instalação feitos por terceiros. Caso a avaliação identifique que o problema decorre da instalação, o COMPRADOR deverá tratar da correção com o responsável pela instalação, sem prejuízo da análise de eventual defeito de fabricação do produto.',
    },
    {
      titulo: 'CLÁUSULA SEXTA – DAS OBRIGAÇÕES DO COMPRADOR',
      texto:
        '1. Compete ao COMPRADOR providenciar, por sua conta e responsabilidade, profissional habilitado para a instalação do kit, bem como garantir que o local esteja estruturalmente preparado e adequado.\n' +
        '2. O COMPRADOR deverá providenciar o ponto de energia elétrica adequado ao funcionamento do motor (220 V), incluindo aterramento e demais requisitos técnicos necessários.\n' +
        '3. O VENDEDOR não executa serviços de alvenaria, pintura, gesso, elétrica, acabamento ou construção civil. A estrutura física do local, incluindo batentes, vãos, nivelamento, pontos elétricos e espaço destinado à instalação, deverá estar finalizada e apta à montagem.\n' +
        '4. O VENDEDOR não se responsabiliza pela aplicação de PU (poliuretano), silicone, massa, pintura de acabamento, instalação de cantoneiras, arremates ou ajustes estéticos no local. Também não executará correções de desníveis, paredes fora de esquadro, pisos desnivelados ou outras imperfeições estruturais.\n' +
        '5. O COMPRADOR deverá observar as instruções técnicas fornecidas com o produto e realizar a manutenção preventiva recomendada. Serviços não incluídos no objeto deste contrato deverão ser contratados diretamente pelo COMPRADOR com terceiros.\n' +
        '6. O COMPRADOR reconhece que a instalação inadequada por terceiros pode comprometer o funcionamento e a segurança do equipamento, bem como a cobertura da garantia quando houver nexo entre a instalação ou intervenção e o defeito apresentado.',
    },
    {
      titulo: 'CLÁUSULA SÉTIMA – DO PRAZO DE FABRICAÇÃO E ENTREGA',
      texto:
        '1. O prazo estimado para fabricação e disponibilização do kit é de 30 a 45 dias úteis, contados da confirmação do pagamento inicial, ressalvadas situações de força maior, indisponibilidade de insumos ou outras circunstâncias alheias ao controle razoável do VENDEDOR.\n' +
        '2. O prazo desta cláusula refere-se à fabricação e disponibilização/entrega do produto, não abrangendo instalação, montagem ou conclusão de serviços no imóvel.\n' +
        '3. O VENDEDOR comunicará ao COMPRADOR quando o material estiver concluído e disponível para entrega ou retirada. O COMPRADOR deverá combinar a forma e a data de entrega/retirada com o VENDEDOR.',
    },
    {
      titulo: 'CLÁUSULA OITAVA – DA ENTREGA E ARMAZENAGEM',
      texto:
        '1. O VENDEDOR não é obrigado a manter o produto armazenado por prazo indeterminado após comunicar que está pronto e disponível. Caso o COMPRADOR solicite armazenamento prolongado, poderá ser cobrada taxa proporcional ao período, previamente informada.\n' +
        '2. O pagamento do saldo previsto na Cláusula Segunda deverá ocorrer antes da entrega ou liberação do kit, não podendo ser condicionado à instalação por terceiros.',
    },
    {
      titulo: 'CLÁUSULA NONA – DA ALTERAÇÃO DE COR',
      texto:
        '1. A cor escolhida pelo COMPRADOR integra as especificações técnicas do produto e o planejamento produtivo do VENDEDOR.\n' +
        '2. O COMPRADOR declara estar ciente de que a pintura eletrostática é organizada por escala de produção e que determinadas cores podem exigir aquisição específica de tinta.\n' +
        '3. Qualquer solicitação de alteração da cor após a assinatura dependerá de aceite expresso do VENDEDOR e de formalização por escrito, podendo gerar custos e alteração de prazo.',
    },
    {
      titulo: 'CLÁUSULA DÉCIMA – DAS ALTERAÇÕES DE ESPECIFICAÇÃO',
      texto:
        '1. Após o início da fabricação, alterações de especificações técnicas, incluindo cor, medidas, modelo ou acessórios, dependerão de avaliação e aceite expresso do VENDEDOR, formalizados por escrito.\n' +
        '2. A aceitação de alterações não obriga o VENDEDOR a reaproveitar materiais já adquiridos ou produzidos, cujos custos poderão ser suportados pelo COMPRADOR, mediante informação prévia.',
    },
    {
      titulo: 'CLÁUSULA DÉCIMA PRIMEIRA – DAS PENALIDADES',
      texto:
        '1. Em caso de rescisão imotivada por iniciativa do COMPRADOR após a confirmação do pedido ou início da fabricação, poderá ser devida multa compensatória de 20% (vinte por cento) do valor total do contrato, sem prejuízo de despesas comprovadas e materiais produzidos, personalizados ou adquiridos especificamente, observada a legislação aplicável.\n' +
        '2. Caso a rescisão ocorra por iniciativa do VENDEDOR, sem justa causa, este restituirá os valores efetivamente pagos pelo COMPRADOR, sem prejuízo de outros direitos que possam decorrer da legislação aplicável.\n' +
        '3. Não será considerada rescisão por culpa do VENDEDOR eventual alteração de prazo decorrente de atraso do COMPRADOR, caso fortuito, força maior ou fatos alheios à responsabilidade do VENDEDOR.',
    },
    {
      titulo: 'CLÁUSULA DÉCIMA SEGUNDA – DA APROVAÇÃO FINAL DAS ESPECIFICAÇÕES',
      texto: 'O COMPRADOR declara que conferiu as especificações técnicas, dimensões, cor e demais características do kit, assumindo responsabilidade pela conferência das informações fornecidas para a fabricação.',
    },
    {
      titulo: 'CLÁUSULA DÉCIMA TERCEIRA – DA ASSINATURA ELETRÔNICA',
      texto:
        'As partes reconhecem a autenticidade, integridade, validade e eficácia deste documento em formato eletrônico, inclusive quando assinado por meio de plataforma digital, conforme a legislação aplicável.\n\n' +
        'As partes reconhecem que o presente instrumento poderá constituir título executivo extrajudicial quando preenchidos os requisitos legais aplicáveis.',
    },
    {
      titulo: 'CLÁUSULA DÉCIMA QUARTA – DO FORO',
      texto:
        'Fica eleito o foro da comarca de Caxias do Sul/RS para dirimir controvérsias oriundas deste contrato, ressalvadas as hipóteses de competência obrigatória previstas na legislação aplicável, especialmente na legislação de proteção ao consumidor.\n\n' +
        'E, por estarem de acordo, as partes firmam o presente instrumento para que produza seus efeitos legais.',
    },
  ];
}

export function generateContratoKitPDF(data: ContratoKitData): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const para = (text: string, opts?: { bold?: boolean; size?: number; center?: boolean; gap?: number }) => {
    const size = opts?.size ?? 10;
    doc.setFont('helvetica', opts?.bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(40, 40, 40);
    const lines = doc.splitTextToSize(text, maxWidth) as string[];
    const lh = size * 0.45;
    lines.forEach(line => {
      ensureSpace(lh);
      if (opts?.center) doc.text(line, pageWidth / 2, y, { align: 'center' });
      else doc.text(line, margin, y);
      y += lh;
    });
    y += opts?.gap ?? 2;
  };

  para('CONTRATO DE COMPRA E VENDA DE KIT DE PORTA DE ENROLAR AUTOMÁTICA', { bold: true, size: 13, center: true, gap: 5 });
  para(VENDEDOR, { bold: true, gap: 3 });

  clausulas(data).forEach(c => {
    if (c.titulo) {
      ensureSpace(10);
      para(c.titulo, { bold: true, size: 11, gap: 2 });
    }
    para(c.texto, { gap: 4 });
  });

  ensureSpace(70);
  y += 6;
  para(`${data.cidade_assinatura}, ____ de ____________________ de ______.`, { gap: 14 });

  const colW = maxWidth / 2 - 5;
  const lineY = y + 8;
  doc.setDrawColor(80, 80, 80);
  doc.line(margin, lineY, margin + colW, lineY);
  doc.line(margin + colW + 10, lineY, pageWidth - margin, lineY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('VENDEDOR – GRUPO ELISA LTDA', margin + colW / 2, lineY + 5, { align: 'center' });
  doc.text('COMPRADOR', margin + colW + 10 + colW / 2, lineY + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(data.comprador_nome || '', margin + colW + 10 + colW / 2, lineY + 10, { align: 'center' });

  y = lineY + 22;
  para('TESTEMUNHAS:', { bold: true, gap: 10 });
  const tY = y + 4;
  doc.line(margin + 5, tY, margin + colW, tY);
  doc.line(margin + colW + 15, tY, pageWidth - margin, tY);
  doc.setFontSize(10);
  doc.text('1.', margin, tY);
  doc.text('2.', margin + colW + 10, tY);

  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text('GRUPO ELISA LTDA — CNPJ 20.462.028/0001-58', margin, pageHeight - 8);
    doc.text(`Página ${i} de ${total}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  }

  return doc.output('blob');
}
