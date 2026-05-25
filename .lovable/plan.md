## Objetivo

Adicionar colunas de cálculo de custo por colaborador no bloco "Folha Salarial" em `/direcao/estrategia/despesas`, com edição inline e somando ao custo mensal exibido.

## Novas colunas

| Coluna | Tipo | Regra |
|---|---|---|
| Auxílio Combustível | Valor R$ manual | input numérico |
| Insalubridade | % manual + valor calculado | valor = salário × % |
| FGTS | % manual (padrão 8%) | valor = salário × % |
| Previsão 13º | Valor R$ manual | input numérico |
| Previsão Férias | Calculado automático | (salário ÷ 3) + (salário × FGTS%) |

Base de % (insalubridade e FGTS) = `custo_colaborador` (salário base atual).

**Custo total mensal exibido** = salário + combustível + insalubridade + FGTS + 13º + férias.

## Banco de dados

Migration adicionando colunas em `admin_users`:
- `aux_combustivel numeric default 0`
- `insalubridade_pct numeric default 0`
- `fgts_pct numeric default 8`
- `previsao_13_valor numeric default 0`

Previsão Férias é derivada — não persiste.

## UI

Refatorar `DespesasResumoTopo.tsx` — bloco "Folha Salarial" passa a renderizar tabela com colunas:

```text
Colaborador | Salário | Combustível | Insalub % / R$ | FGTS % / R$ | 13º | Férias | Total mensal | Total anual
```

- Campos editáveis: inputs inline (`bg-white/5`, glassmorphism) com debounce ~600ms salvando em `admin_users`.
- Linha do total e total geral somam o "Total mensal" calculado.
- Blocos "Despesas Fixas" e "Despesas Variáveis" permanecem inalterados.
- Quando `mes` está selecionado (snapshot histórico via `custos_folha_mensais`), mantém comportamento atual (somente leitura, sem nova tabela).

## Detalhes técnicos

- Helper `calcularCustoColaborador(c)` retorna `{ insalubValor, fgtsValor, ferias, totalMensal }`.
- Persistência: `supabase.from('admin_users').update({...}).eq('id', ...)` com toast de erro.
- Atualiza `onMediaMensalChange` somando o novo total.
- Layout responsivo: tabela com `overflow-x-auto` para caber as colunas no card.
