## Objetivo

Mudar a orientação dos PDFs exportados em `/direcao/estrategia/despesas/configuracoes` (Folha Salarial e Tipos de Custos — Fixas/Variáveis/Impostos) de **paisagem (`l`) para retrato (`p`)** e reajustar as larguras de coluna/fontes para caberem na largura útil A4 retrato (~190 mm).

## Mudanças

### `src/utils/folhaSalarialPDFGenerator.ts`
- `new jsPDF('l', 'mm', 'a4')` → `new jsPDF('p', 'mm', 'a4')`.
- Reduzir font da tabela de 7.5 → 6.8 pt e `cellPadding` de 1.8 → 1.4.
- Reajustar `columnStyles` das 11 colunas para somar ~190 mm (Colaborador 36, Em folha 11, Salário 17, Sal.Mín 17, Combustível 15, Insalub 16, FGTS 16, Prev 13° 16, FGTS 13° 16, Férias 16, Total 18).
- Encolher cabeçalhos longos via `headStyles.fontSize` 6.8 e abreviar rótulos quando necessário ("Combustível" → "Comb.", "Insalub valor" → "Insalub.", "FGTS valor" → "FGTS", "Previsão 13°" → "Prev. 13°", "Férias + 1/3" → "Férias").
- Posição do bloco de endereço no topo recalculada com base no novo `pageWidth` (já usa `pageWidth - margin - 60`, mantém).
- Linha de totais inferiores: continuar usando `pageWidth - margin` (auto-ajusta).

### `src/utils/tiposCustosPDFGenerator.ts`
- `new jsPDF("l", "mm", "a4")` → `new jsPDF("p", "mm", "a4")`.
- Reajustar `columnStyles`: Nome 55, Descrição `auto`, Valor projetado 32, DRE 16, Ativo 16 (totais fixos = 119, sobra ~71 para Descrição).
- Reduzir `cellPadding` 2 → 1.6 para folga.
- Atualizar o `colSpan` do subtotal e células vazias seguintes — quantidade de colunas não muda (5), apenas larguras, então o array de subtotal permanece igual.

### Notas
- Lógica de paginação (`y + 25 > pageHeight - 20`) continua funcionando porque lê `pageHeight` dinamicamente — só haverá mais quebras de página, o que é esperado em retrato.
- Cabeçalho (logo + endereço + título) e rodapé não mudam de estrutura; apenas o canvas fica mais estreito e mais alto.

## Arquivos afetados
- `src/utils/folhaSalarialPDFGenerator.ts`
- `src/utils/tiposCustosPDFGenerator.ts`
