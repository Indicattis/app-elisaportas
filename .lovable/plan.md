## Objetivo

Em `/direcao/estrategia/despesas/:mes`, nos blocos **Despesas Fixas** e **Despesas Variáveis**, adicionar uma coluna **"Valor projetado"** alimentada por `tipos_custos.valor_maximo_mensal` (o mesmo campo configurado em `/financeiro/custos` e em `/direcao/estrategia/despesas/configuracoes`).

O bloco **Impostos** já tem coluna "Previsão" e não muda.

## Mudanças

Arquivo único: `src/components/direcao/estrategia/DespesasResumoTopo.tsx`

1. **Carregamento dos tipos** (efeito de carga do mês, por volta da linha 200):
   - Ao buscar `tipos_custos`, incluir `valor_maximo_mensal` no `select`.
   - Estender `tiposMap[t.id]` para guardar `valor_maximo_mensal`.

2. **Agrupamento `agruparPor`** (linhas 233–265):
   - Incluir `valor_projetado: Number(t.valor_maximo_mensal || 0)` ao montar cada `GastoAgrupado`.
   - Adicionar campo `valor_projetado: number` no tipo `GastoAgrupado`.

3. **Componente `BlocoGastosReadonly`** (linhas 1200–1303):
   - Novo `<th>` "Valor projetado" entre "Lançamentos" e "Valor pago no mês".
   - Nova célula por linha exibindo `formatCurrency(r.valor_projetado)` em tom suave (`text-white/60`).
   - Ampliar `colSpan` dos estados `Carregando...` e "Nenhum gasto..." de 3 para 4.
   - No rodapé, manter o "Total" atual (pago) e adicionar um segundo bloco "Total projetado" = soma de `valor_projetado` das linhas exibidas, no mesmo estilo do "Total de salários" do bloco Folha.

## Fora de escopo

- Não criar linhas para tipos de custo que tenham projeção mas nenhum lançamento no mês (mantém o comportamento atual de só listar tipos com gastos). Caso queira esse comportamento, peço para incluir num próximo passo.
- Nenhuma alteração de banco de dados, hook ou outras páginas.
