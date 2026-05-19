## Objetivo

No PDF gerado em `/direcao/dre/:mes`:
- Remover a seção **"6. Despesas Projetadas do Ano"**.
- Adicionar uma nova coluna **"Projetado (Ano)"** nas tabelas de **Despesas Fixas** e **Despesas Variáveis**, ao lado da coluna "Projetado" (mensal).

## Mudanças em `src/pages/direcao/DREMesDirecao.tsx`

### 1. `PrintDespesaTable` (linhas ~638-734)
- Adicionar nova coluna `Projetado (Ano)` no `<thead>`, logo após `Projetado`, somente quando `showProj` for true.
- Para cada linha, renderizar `formatCurrency(tipoRef.valor_maximo_mensal * 12)` ou `—` quando não houver `tipoRef`.
- Calcular `totalProjAno = totalProj * 12` (ou somar `t.valor_maximo_mensal * 12` da mesma forma que `totalProj`) e exibir na linha TOTAL.
- Estilo: mesma formatação numérica usada em `Projetado`, cor neutra `#64748b`, `width: 140`.

### 2. Remover seção 6 (linhas 555-596)
- Excluir todo o bloco `{tiposCustosVariaveis.length > 0 && ( ... )}` que renderiza "6. Despesas Projetadas do Ano".
- Renumerar a seção seguinte: **"7. Estoque" → "6. Estoque"**.

### 3. Limpeza
- A constante `totalProjetadoAnual` (calculada no componente pai) só é usada no bloco removido. Verificar e remover sua declaração e qualquer cálculo associado se ficar órfão.

## Fora de escopo

- A visualização em tela (`DespesaSectionReadOnly`) permanece inalterada — a mudança é apenas no layout de impressão/PDF.
- Não alterar a seção "3. Folha Salarial" (sem projeção).
- Modal de gastos por tipo continua igual.
