import jsPDF from 'jspdf';

export interface ContratoElisaData {
  comprador_nome: string;
  comprador_documento: string; // CPF ou CNPJ
  comprador_endereco: string;
  quantidade_portas: string;
  material_detalhado: string;
  quantidade_motores: string;
  cor: string;
  dimensoes: string;
  valor_total: string;
  condicao_pagamento: string;
  cidade_assinatura: string;
  data_assinatura: string;
}

const VENDEDOR_LINHA =
  'VENDEDOR: GRUPO ELISA LTDA, CNPJ: 20.462.028/0001-58, com sede na Rua Padre Elio Baron Toaldo, nº 571, Jardim das Hortência, CEP: 95055-652, Caxias do Sul/RS.';

function buildClausulas(d: ContratoElisaData): Array<{ titulo?: string; texto: string }> {
  return [
    {
      texto:
        `COMPRADOR: ${d.comprador_nome}, CPF/CNPJ: ${d.comprador_documento}, com sede/residência na ${d.comprador_endereco}.`,
    },
    {
      texto:
        'As partes acima identificadas têm entre si justo e acertado o presente Contrato de compra, venda e instalação de porta de enrolar automática, que se regerá pelas cláusulas e condições seguintes:',
    },
    {
      titulo: 'CLÁUSULA PRIMEIRA – DO OBJETO DO CONTRATO',
      texto:
        `1. O presente contrato tem como objeto a venda e instalação de ${d.quantidade_portas} porta(s) de enrolar automática(s), conforme as seguintes especificações:\n\n` +
        `• MATERIAL: ${d.material_detalhado}, dimensionado conforme medidas tiradas em visita técnica realizada com a presença e confirmação do comprador.\n` +
        `• MOTOR: ${d.quantidade_motores}, de 000 kg baixo fluxo (monofásico 220v, 120RPM), freio eletromagnético, fim de curso com limitador de parada automática, acionamento através de botoeira de comando composta por 3 botões (abre, para e fecha) cada motor.\n` +
        `• SISTEMA DE EMERGÊNCIA: Correntes manuais para acionamento na falta de energia elétrica.\n` +
        `• CARACTERÍSTICAS ADICIONAIS: Portas com pintura eletrostática na cor ${d.cor}.\n` +
        `• DIMENSÕES DA PORTA: ${d.dimensoes}.`,
    },
    {
      titulo: 'CLÁUSULA SEGUNDA – DO PREÇO E CONDIÇÕES DE PAGAMENTO',
      texto:
        `1. O COMPRADOR pagará ao VENDEDOR, pela aquisição do objeto deste contrato, a quantia total de ${d.valor_total}, podendo a presente contratação compreender: exclusivamente o fornecimento/fabricação do produto e equipamentos; ou o fornecimento/fabricação do produto e equipamentos com os respectivos serviços de instalação, conforme expressamente especificado neste contrato.\n` +
        '2. O COMPRADOR declara ciência de que os serviços de instalação somente integrarão o objeto contratado quando expressamente previstos neste instrumento contratual.\n' +
        `3. O valor ajustado será pago da seguinte forma:\n${d.condicao_pagamento}\n` +
        '4. O pagamento deverá ser efetuado depósito identificado em qualquer das contas indicadas pelo vendedor, mas que tenha a titularidade de GRUPO ELISA, ELISA PORTAS DE ENROLAR ou ELISA PROJETOS ESPECIAIS.',
    },
    {
      titulo: 'CLÁUSULA TERCEIRA – DAS OBRIGAÇÕES DO VENDEDOR',
      texto:
        '1. O VENDEDOR compromete-se a prestar assistência técnica ao equipamento objeto deste contrato, observadas as condições e prazos abaixo estabelecidos:\n\n' +
        'Os componentes eletrônicos do equipamento, tais como controles remotos, centrais de comando e botoeiras, possuem garantia legal de 90 (noventa) dias, exclusivamente contra defeitos de fabricação, contados da data da entrega do produto ou da conclusão da instalação.\n\n' +
        '2. A instalação da porta de enrolar automática possui garantia de 30 (trinta) dias, limitada exclusivamente a defeitos relacionados à execução dos serviços realizados pelo VENDEDOR.\n\n' +
        '3. As peças mecânicas e estruturais, incluindo meia cana, guias e motor, possuem garantia de 01 (um) ano contra defeitos de fabricação, contados da data da instalação ou entrega do produto.\n\n' +
        '4. A garantia das peças refere-se exclusivamente ao fornecimento e substituição do componente defeituoso na sede do VENDEDOR, não estando incluídos serviços de deslocamento, desmontagem, reinstalação, hospedagem, alimentação, frete, transporte ou despesas operacionais da equipe técnica. Quando o atendimento técnico ocorrer fora do perímetro urbano de Caxias do Sul, poderão ser cobrados custos de deslocamento técnico, hospedagem, alimentação e demais despesas operacionais, previamente informados ao COMPRADOR.\n\n' +
        '5. O COMPRADOR declara ciência de que o motor instalado no equipamento é classificado como motor de baixo fluxo operacional, devendo sua utilização respeitar os limites técnicos recomendados para o modelo contratado, ficando estabelecido o limite máximo de até 6 (seis) ciclos de abertura e fechamento por dia, sob pena de caracterização de uso inadequado do equipamento.\n\n' +
        '6. A garantia não cobre danos decorrentes de utilização inadequada, sobrecarga operacional, uso contínuo excessivo, aquecimento por excesso de acionamentos, quebra de engrenagens, utilização em desacordo com a especificação técnica do equipamento, oscilações elétricas, ausência de manutenção preventiva, infiltrações, oxidação, impactos, intervenção de terceiros ou quaisquer danos externos não relacionados a defeito de fabricação.\n\n' +
        '7. A garantia está condicionada à realização de manutenção preventiva periódica, incluindo lubrificação, alinhamento, regulagem de fim de curso e demais ajustes técnicos recomendados, devendo tais manutenções ser realizadas no prazo máximo de 06 (seis) meses entre cada revisão. A ausência de manutenção preventiva poderá acarretar perda da garantia contratual.\n\n' +
        '8. A assistência técnica não cobre danos causados por acidentes, caso fortuito, força maior, instalações elétricas inadequadas, ausência de aterramento, surtos ou oscilações de energia elétrica.\n\n' +
        '9. A constatação da origem do defeito e da cobertura ou não pela garantia será realizada mediante avaliação técnica do VENDEDOR.\n\n' +
        '10. Somente técnicos autorizados pelo VENDEDOR poderão realizar intervenções, reparos ou manutenção no equipamento, sob pena de perda da garantia contratual.',
    },
    {
      titulo: 'CLÁUSULA QUARTA – ASSISTÊNCIA TÉCNICA',
      texto:
        '1. A assistência técnica será prestada de segunda-feira a sexta-feira, no horário de 8h às 17h e consistirá na reparação de eventuais falhas das portas e na substituição de peças e componentes que se apresentem defeituosos, de acordo com normas técnicas específicas.\n\n' +
        '2. O prazo para atendimento de chamado e devida resolução de problema em produtos e serviços fornecidos é de 20 dias úteis, a partir da comunicação do defeito realizada pelo COMPRADOR ao VENDEDOR, sempre respeitando o que estabelece a cláusula terceira, inclusive com relação aos custos de deslocamento.',
    },
    {
      titulo: 'CLÁUSULA QUINTA – DAS OBRIGAÇÕES DO COMPRADOR',
      texto:
        '1. Preparação do local da instalação: O COMPRADOR é inteiramente responsável por garantir que o local onde a porta será instalada esteja pronto e adequado para a instalação antes da chegada da equipe técnica do VENDEDOR. Isso inclui, mas não se limita a:\n\n' +
        '• PARTE ELÉTRICA: O COMPRADOR deve providenciar o ponto de energia elétrica adequado para o funcionamento do motor da porta (220V) no local da instalação.\n\n' +
        '• OBRAS DE INFRAESTRUTURA: O VENDEDOR não realizará serviços de alvenaria, pintura, gesso, elétrica, acabamento ou quaisquer outros serviços relacionados à construção civil. É de responsabilidade exclusiva do COMPRADOR garantir que a estrutura física do local, incluindo batentes, vãos, pontos elétricos, nivelamento e espaço destinado à instalação, esteja devidamente finalizada, regularizada e apta para a execução dos serviços.\n\n' +
        'O VENDEDOR também não se responsabiliza pela aplicação de PU (poliuretano), silicone, massa, pintura de acabamento, instalação de cantoneiras, arremates ou quaisquer ajustes estéticos e de acabamento no local da instalação. Fica igualmente estabelecido que poderão ocorrer pequenos acabamentos com tinta spray decorrentes do processo de instalação e fixação dos componentes, os quais são inerentes ao serviço executado. Na hipótese de existência de desníveis, irregularidades, paredes fora de esquadro, pisos desnivelados ou quaisquer imperfeições estruturais no local, o VENDEDOR não realizará serviços corretivos ou acabamentos para compensação estética ou técnica dessas condições. As caixas de fechamento, estruturas e componentes fornecidos seguem padrão técnico de fabricação do VENDEDOR, inexistindo projeto especial, personalizado ou sob medida para adaptação estética específica do ambiente, salvo quando expressamente contratado por escrito.\n\n' +
        '• RESPONSABILIDADE POR PREPARAÇÃO INADEQUADA: Caso o VENDEDOR compareça ao local para realização da instalação e constate que o ambiente não se encontra devidamente preparado, apto ou em conformidade com as especificações técnicas previamente informadas, a instalação será suspensa e reagendada para nova data, conforme disponibilidade e cronograma de atividades do VENDEDOR. Nessa hipótese, o COMPRADOR ficará responsável pelo pagamento de taxa correspondente a 5% (cinco por cento) do valor total do contrato, destinada a cobrir os custos operacionais decorrentes do deslocamento improdutivo da equipe técnica, carga e descarga de materiais, logística e impossibilidade de execução de outro serviço na mesma data. Caso o atendimento envolva deslocamento para outra cidade, região ou estado, o COMPRADOR também arcará com eventuais custos adicionais de deslocamento, hospedagem, alimentação e estadia da equipe técnica, quando necessários para a nova execução dos serviços.\n\n' +
        '• GARANTIA E MANUTENÇÃO: O COMPRADOR deverá solicitar a realização de manutenções preventivas de acordo com o estipulado na Cláusula Terceira para manter a garantia do produto. A não realização dessas manutenções dentro do prazo estipulado resultará na perda do direito à garantia.\n\n' +
        '• CUSTOS DE SERVIÇOS NÃO CONTRATADOS: Qualquer solicitação de serviços não previstos neste contrato, como ajustes na estrutura do local de instalação ou trabalhos elétricos adicionais, será considerada um serviço extra e, se aceito pelo VENDEDOR, será cobrado à parte.',
    },
    {
      titulo: 'CLÁUSULA SEXTA – DO PRAZO DE INSTALAÇÃO',
      texto:
        '1. O VENDEDOR terá até 30 dias úteis para concluir a instalação do objeto deste contrato a partir da data de confirmação do pagamento inicial, desde que o local de instalação esteja pronto e disponível em condições adequadas para a instalação.\n\n' +
        '2. Caso o COMPRADOR não disponibilize o local nas condições adequadas e dentro do prazo estipulado para a instalação, o prazo contratual para execução dos serviços ficará automaticamente prorrogado por mais 30 (trinta) dias, contados a partir da efetiva regularização e disponibilização do local em condições apropriadas para a realização da instalação.',
    },
    {
      titulo: 'CLÁUSULA SÉTIMA – DA ARMAZENAGEM E ENTREGA',
      texto:
        '3. O VENDEDOR não se responsabiliza pela guarda ou armazenamento do material após sua fabricação, não sendo obrigada a manter o produto em estoque por prazo indeterminado. Caso o COMPRADOR solicite a permanência do material armazenado após a comunicação de conclusão, o VENDEDOR poderá cobrar taxa de armazenagem proporcional ao período de permanência.\n\n' +
        '4. O pagamento não poderá ser condicionado à instalação quando o material estiver devidamente finalizado, disponível e pendente apenas de liberação ou agendamento para montagem.',
    },
    {
      titulo: 'CLÁUSULA OITAVA – DA ALTERAÇÃO DE COR',
      texto:
        '• A cor da porta de enrolar automática escolhida pelo COMPRADOR no ato da assinatura deste contrato integra as especificações técnicas do produto e o planejamento produtivo do VENDEDOR.\n\n' +
        '• O COMPRADOR declara estar ciente de que o processo produtivo do VENDEDOR opera por escala de pintura eletrostática, com agrupamento de portas por cores previamente programadas, bem como que determinadas cores exigem a aquisição específica de tinta em pó, geralmente fornecida por fabricantes localizados fora do Estado do Rio Grande do Sul.\n\n' +
        '• Caso o COMPRADOR solicite a alteração da cor da porta após a assinatura do presente contrato, tal solicitação dependerá de aceite expresso do VENDEDOR e exigirá formalização de termo aditivo contratual.',
    },
    {
      titulo: 'CLÁUSULA NONA – DAS ALTERAÇÕES DE ESPECIFICAÇÃO',
      texto:
        '1. Após o início da fabricação da porta de enrolar automática, não serão aceitas alterações de especificações técnicas, incluindo cor, medidas, modelo ou acessórios, salvo mediante avaliação técnica expressa do VENDEDOR e formalização de termo aditivo contratual.\n' +
        '2. A eventual aceitação de alterações não obriga o VENDEDOR ao reaproveitamento de materiais já adquiridos ou produzidos, sendo tais custos integralmente suportados pelo COMPRADOR.',
    },
    {
      titulo: 'CLÁUSULA DÉCIMA – DAS PENALIDADES',
      texto:
        '1. Em caso de rescisão imotivada do presente contrato por iniciativa do COMPRADOR, após a confirmação do pedido, início da fabricação, separação de materiais ou agendamento dos serviços, ficará o COMPRADOR obrigado ao pagamento de multa compensatória correspondente a 20% (vinte por cento) do valor total do contrato, sem prejuízo da cobrança de eventuais despesas, materiais já produzidos, personalizados ou adquiridos especificamente para execução do objeto contratado.\n\n' +
        '2. Caso a rescisão ocorra por iniciativa do VENDEDOR, sem justa causa, este restituirá ao COMPRADOR os valores efetivamente pagos até a data da rescisão, acrescidos de multa compensatória correspondente a 20% (vinte por cento) do valor total do contrato.\n\n' +
        '3. Não será considerada rescisão por culpa do VENDEDOR eventual alteração de prazo decorrente de atraso do COMPRADOR, impossibilidade de execução por condições inadequadas do local, caso fortuito, força maior ou fatos alheios à responsabilidade do VENDEDOR.',
    },
    {
      titulo: 'CLÁUSULA DÉCIMA PRIMEIRA – DA APROVAÇÃO FINAL DAS ESPECIFICAÇÕES',
      texto:
        'O COMPRADOR declara que conferiu todas as especificações técnicas, dimensões, cor e demais características do objeto deste contrato, assumindo integral responsabilidade pelas informações fornecidas para a fabricação.',
    },
    {
      titulo: 'CLÁUSULA DÉCIMA SEGUNDA – DA ASSINATURA ELETRÔNICA',
      texto:
        '2. As partes reconhecem a veracidade, autenticidade, integridade, validade e eficácia deste documento, conforme o disposto no art. 219 do Código Civil, em formato eletrônico e/ou assinado por elas por meio de certificados eletrônicos, ainda que sejam certificados eletrônicos não emitidos pelo ICP-Brasil, conforme o disposto no art. 10, §2º, da Medida Provisória nº 2.200-2, de 24 de agosto de 2001, como, por exemplo, por meio do upload deste documento, seus anexos e demais documentos a ele vinculados, bem como a aposição das respectivas assinaturas eletrônicas, em plataformas digitais.\n\n' +
        '3. As partes reconhecem ainda que este documento constitui título executivo extrajudicial independente da assinatura de testemunhas, nos termos do art. 784, §4º, do Código de Processo Civil.',
    },
    {
      titulo: 'CLÁUSULA DÉCIMA TERCEIRA – DO FORO',
      texto:
        'Fica eleito o foro da comarca de Caxias do Sul para dirimir quaisquer controvérsias oriundas do presente contrato, com renúncia expressa de qualquer outro, por mais privilegiado que seja, ressalvadas as hipóteses previstas na legislação aplicável, especialmente no Código de Defesa do Consumidor.\n\n' +
        'E, por estarem justas e contratadas, as partes firmam o presente instrumento em 02 (duas) vias de igual teor e forma, juntamente com as testemunhas abaixo assinadas, para que produza seus jurídicos e legais efeitos.',
    },
  ];
}

export function generateContratoElisaPDF(data: ContratoElisaData): Blob {
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

  const drawParagraph = (text: string, opts?: { bold?: boolean; size?: number; align?: 'left' | 'center' | 'justify'; gap?: number }) => {
    const size = opts?.size ?? 10;
    doc.setFont('helvetica', opts?.bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(40, 40, 40);
    const lines = doc.splitTextToSize(text, maxWidth) as string[];
    const lineHeight = size * 0.45;
    lines.forEach(line => {
      ensureSpace(lineHeight);
      if (opts?.align === 'center') {
        doc.text(line, pageWidth / 2, y, { align: 'center' });
      } else {
        doc.text(line, margin, y);
      }
      y += lineHeight;
    });
    y += opts?.gap ?? 2;
  };

  // Título
  drawParagraph('CONTRATO DE COMPRA E VENDA E INSTALAÇÃO OU NÃO DE PORTA AUTOMÁTICA', {
    bold: true,
    size: 13,
    align: 'center',
    gap: 5,
  });

  drawParagraph(VENDEDOR_LINHA, { bold: true, gap: 3 });

  const clausulas = buildClausulas(data);
  clausulas.forEach(c => {
    if (c.titulo) {
      ensureSpace(8);
      drawParagraph(c.titulo, { bold: true, size: 11, gap: 2 });
    }
    drawParagraph(c.texto, { size: 10, gap: 4 });
  });

  // Assinaturas
  ensureSpace(60);
  y += 6;
  drawParagraph(`${data.cidade_assinatura}, ${data.data_assinatura}.`, { gap: 12 });

  const colWidth = maxWidth / 2 - 5;
  const lineY = y + 10;
  ensureSpace(40);
  doc.setDrawColor(80, 80, 80);
  doc.line(margin, lineY, margin + colWidth, lineY);
  doc.line(margin + colWidth + 10, lineY, pageWidth - margin, lineY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('VENDEDOR', margin + colWidth / 2, lineY + 5, { align: 'center' });
  doc.text('COMPRADOR', margin + colWidth + 10 + colWidth / 2, lineY + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('GRUPO ELISA LTDA', margin + colWidth / 2, lineY + 10, { align: 'center' });
  doc.text(data.comprador_nome, margin + colWidth + 10 + colWidth / 2, lineY + 10, { align: 'center' });

  y = lineY + 25;
  ensureSpace(30);
  drawParagraph('TESTEMUNHAS:', { bold: true, gap: 8 });
  const tLineY1 = y + 4;
  doc.line(margin, tLineY1, margin + colWidth, tLineY1);
  doc.line(margin + colWidth + 10, tLineY1, pageWidth - margin, tLineY1);
  doc.text('1.', margin, tLineY1 - 1);
  doc.text('2.', margin + colWidth + 10, tLineY1 - 1);

  // Footer paginação
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Página ${i} de ${total}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
    doc.text('GRUPO ELISA LTDA — CNPJ 20.462.028/0001-58', margin, pageHeight - 8);
  }

  return doc.output('blob');
}