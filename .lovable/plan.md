## Objetivo

No PDF do DRE (`/direcao/dre/:mes`), nas seções **4. Despesas Fixas** e **5. Despesas Variáveis**, exibir cada tipo de custo como um cabeçalho de agrupamento e listar abaixo cada gasto individual cadastrado naquele tipo (descrição + data + valor).

Exemplo:

```text
Energia Elétrica                            R$ 2.300,00   R$ 2.500,00   R$ 30.000,00
  └ 05/04  Conta CPFL — matriz                R$ 1.500,00
  └ 18/04  Conta CPFL — galpão 2                R$ 800,00
```

A seção **3. Folha Salarial** continua igual (já lista colaborador por linha, não há sub-agrupamento).

## Mudanças em `src/pages/direcao/DREMesDirecao.tsx`

### 1. Tipo `DespesaAgrupada`
Adicionar campo opcional `gastos?: { id: string; descricao: string | null; data: string; valor: number }[]`.

### 2. `fetchDespesasFromGastos`
- Incluir `id, descricao, data` no `select` de `gastos`.
- Ao agrupar por `tipo_custo_id`, além de somar `valor`, acumular os gastos individuais em um array ordenado por `data` ascendente.
- Passar esse array no campo `gastos` de cada item.

### 3. `PrintDespesaTable`
- Após cada `<tr>` do tipo (linha já existente do agrupamento), renderizar uma `<tr>` filha por gasto:
  - Coluna **Descrição**: indentada (`paddingLeft: 22`), prefixo `└`, fonte menor (`8.5pt`), cor `#64748b`, mostrando `dd/MM` + `descricao` (ou `—` se nula).
  - Coluna **Valor**: `formatCurrency(g.valor)`, mesma cor neutra, sem comparação com projetado.
  - Colunas **Projetado** e **Projetado (Ano)**: vazias (`—` discreto) quando `showProj`.
  - `colSpan` mantido — todas as colunas existem, apenas as de projetado ficam em branco.
- Estilo: linha filha sem zebra forte, fundo `#fcfdfe`, borda inferior `#f1f5f9` mais clara, `pageBreakInside: avoid` no par tipo+filhos via wrapper `<tbody>` por tipo (cada tipo em seu próprio `<tbody>`).
- TOTAL no final permanece igual.

### 4. Fora de escopo
- Visualização em tela (`DespesaSectionReadOnly`) não muda.
- Modal de gastos por tipo continua igual.
- Folha Salarial (seção 3) sem mudança.
- Despesas sem `descricao` nem `data` (caso raro): exibir apenas valor.

## Observação

Se um tipo tiver muitos gastos (>15), o agrupamento pode estourar a página. O `pageBreakInside: avoid` por `<tbody>` permite quebra entre tipos mas mantém cada grupo inteiro quando couber; tipos muito grandes serão quebrados naturalmente pelo navegador.
