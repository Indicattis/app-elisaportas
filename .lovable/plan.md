## Objetivo

Refatorar a exportação de PDF em `/direcao/caixa-elisa/capital-giro` e `/direcao/caixa-elisa/planejamento` para que o resultado seja visualmente fiel às telas, porém com fundo branco (versão "modo claro" das mesmas telas).

## Abordagem

Substituir a geração baseada em `jspdf-autotable` (tabelas genéricas) por captura de HTML renderizado usando `html2canvas` + `jsPDF`. Renderizo, fora do fluxo visível, um container clone das telas com a mesma estrutura (cards, indicadores, lista de obrigações/itens) porém com paleta invertida para impressão (fundo branco, textos escuros, bordas cinza claro, mantendo o verde esmeralda como cor de destaque nos ícones/badges).

`html2canvas` já é usada em outras exportações do projeto — reutilizo o mesmo padrão.

## Capital de Giro (PDF)

Conteúdo replicado, na ordem:
1. Header com ícone Wallet, título "2 Milhões Capital de Giro" e subtítulo, mais data/hora de geração à direita.
2. Grid 2 colunas com os cards "Capital de Giro" e "Saldo Disponível" (com "X pendentes" abaixo), exatamente como na tela.
3. Card contendo a lista de obrigações — cada linha com checkbox visual (quadrado marcado/desmarcado), nome (line-through se pago), data pequena abaixo do nome, valor à direita.
4. Rodapé com totais (Total, Pago, Pendente) e paginação.

## Planejamento (PDF)

Conteúdo replicado:
1. Header com ícone CalendarRange, título "Planejamento 2 Milhões de Giro", data/hora.
2. Barra de indicadores: Total Acumulado, Total Pago, Total Pendente.
3. Para cada mês:
   - Cabeçalho do card com label do mês (capitalizado, pt-BR) e subtotal à direita.
   - Lista de itens no mesmo layout visual da tela (checkbox, nome, data, valor).
4. Paginação no rodapé.

## Paleta de impressão (modo claro fiel)

- Fundo: `#ffffff`
- Card surface: `#ffffff` com borda `#e5e7eb`
- Texto primário: `#111827`
- Texto secundário: `#6b7280`
- Destaque emerald (ícones, header do card, subtotal, saldo positivo): `#059669`
- Saldo negativo: `#e11d48`
- Line-through (pago): texto `#9ca3af`

## Detalhes técnicos

- Adicionar `html2canvas` como dependência (verificar se já existe; caso sim, apenas importar).
- Criar helper `src/pages/direcao/caixa-elisa/pdfExport.tsx` exportando dois componentes React puros: `<CapitalGiroPDFDoc />` e `<PlanejamentoPDFDoc />` que recebem os dados via props e renderizam o layout no formato A4 (largura fixa ~794px = 210mm @ 96dpi).
- Função `exportarPDF` cria um `div` off-screen (`position: fixed; left: -10000px; top: 0`), monta o React node com `createRoot`, chama `html2canvas` com `backgroundColor: '#ffffff'` e `scale: 2`, adiciona a imagem no `jsPDF` (A4) fatiando em múltiplas páginas se necessário, e por fim desmonta e salva.
- Substituir `exportarPDF` atual em `CapitalGiroPage.tsx` e `PlanejamentoPage.tsx` pela nova versão. Remover imports de `jspdf-autotable` nesses arquivos (jsPDF continua).
- Nome do arquivo mantido: `capital-giro-YYYY-MM-DD.pdf` e `planejamento-caixa-elisa-YYYY-MM-DD.pdf`.

## Fora de escopo

- Não altero a UI das telas em si (permanecem escuras/glassmorphism).
- Não altero dados nem regras de negócio.
