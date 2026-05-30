## Objetivo

Em `/direcao/estrategia/despesas/configuracoes`, substituir os blocos **"Despesas Fixas padrão"** e **"Despesas Variáveis padrão"** (que hoje usam a tabela `despesas_padrao`) por uma gestão de **tipos de custos** (`tipos_custos`) igual à de `/financeiro/custos`, separados em duas sessões por `tipo` (fixa / variável).

Os blocos **Folha Salarial padrão** e **Despesas de Imposto padrão** permanecem inalterados (continuam em `despesas_padrao`).

## Origem dos dados

- `useTiposCustos` (`src/hooks/useTiposCustos.ts`) já fornece `tiposCustos`, `saveTipoCusto`, `updateTipoCusto`, `deleteTipoCusto`.
- Cada `TipoCusto` tem: `nome`, `descricao`, `valor_maximo_mensal`, `tipo` ('fixa' | 'variavel'), `aparece_no_dre`, `ativo`.

## Mudanças (somente `src/pages/direcao/estrategia/EstrategiaDespesasConfiguracoes.tsx`)

1. Remover as duas chamadas `<SimpleBlock tipo="fixa" />` e `<SimpleBlock tipo="variavel" />`.
2. Importar `useTiposCustos` e adicionar dois novos blocos:
   - **"Tipos de Custos — Fixas"** (filtrando `tipo === 'fixa'`)
   - **"Tipos de Custos — Variáveis"** (filtrando `tipo === 'variavel'`)
3. Criar componente local `TiposCustoBlock` reaproveitável (recebe `tipo`, `titulo`, `icon`, lista filtrada + handlers do hook). Estilo glassmorphism igual aos demais blocos.

### Colunas da tabela em cada bloco

| Coluna | Edição |
|---|---|
| Nome | inline (text) |
| Descrição | inline (text) |
| Valor máximo mensal | inline (currency) |
| Aparece no DRE | switch |
| Ativo | switch |
| Ações | excluir |

Linha de inserção no rodapé (mesmo padrão visual atual): inputs para Nome / Descrição / Valor + botão `+` que chama `saveTipoCusto({ nome, descricao, valor_maximo_mensal, tipo, aparece_no_dre: true })`. O `tipo` é fixo pela sessão do bloco.

Rodapé do bloco: "Total mensal estimado" = soma de `valor_maximo_mensal` dos itens **ativos** do tipo (espelha o cálculo atual e o de `/financeiro/custos`).

Itens inativos aparecem na lista (com switch desligado) mas não contam no total — igual ao comportamento de `/financeiro/custos`.

4. Manter `FolhaBlock` (Folha) e `SimpleBlock tipo="imposto"` (Impostos) como estão hoje.
5. Limpar imports não usados (`Receipt`, `TrendingDown` se ainda fizerem sentido; usar `Receipt`/`TrendingDown` nos novos blocos para manter os mesmos ícones).

## Sem mudanças
- Banco de dados.
- Hooks `useDespesasPadrao` e `useTiposCustos`.
- Página `/financeiro/custos` e a página mensal de despesas.

## Observação sobre dados existentes

Os registros atuais em `despesas_padrao` com `tipo IN ('fixa','variavel')` deixarão de aparecer nesta página (mas continuam no banco). Esses padrões já não influenciam diretamente o resumo mensal de Fixas/Variáveis (que se baseia em `gastos` agrupados por `tipos_custos`), então não há perda funcional. Caso queira limpar esses registros legados depois, faço em separado.
