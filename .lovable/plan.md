# Despesas mensais como clone das Configurações padrão

## Objetivo

A página `/direcao/estrategia/despesas/2026-05` (e qualquer mês) terá a mesma UI rica de `/direcao/estrategia/despesas/configuracoes`, com a diferença de que:

- Os valores editados ficam **apenas no mês** (override) — Configurações padrão continuam intactas.
- Não há criar/excluir colaborador ou tipo de custo no mês: a tela mensal herda automaticamente tudo do padrão.
- Cada colaborador/tipo pode ter seus valores ajustados, **inclusive zerados**.
- Gastos continuam usando a tabela `gastos` (igual hoje).

## Modelo de dados (novo, recomeçando a folha mensal)

Criar duas tabelas de override por mês. Toda linha representa "este campo deste item, neste mês, vale X" — quando não existir override, a tela usa o valor de `despesas_padrao` / `tipos_custos`.

```text
despesas_mes_folha_override
  id, mes_referencia (date, dia 01), despesa_padrao_id (fk),
  salario, salario_minimo, aux_combustivel,
  insalubridade_pct, fgts_pct, previsao_13_valor, ferias_valor,
  em_folha (bool, override opcional),
  UNIQUE (mes_referencia, despesa_padrao_id)

despesas_mes_tipo_custo_override
  id, mes_referencia (date, dia 01), tipo_custo_id (fk),
  valor_maximo_mensal,
  UNIQUE (mes_referencia, tipo_custo_id)
```

Tabela legada `despesas_manuais_folha` deixa de ser usada pelos novos componentes (mantida no banco por enquanto para não quebrar histórico). `despesas_manuais_lancamentos` continua sendo usada só para o caso de impostos avulsos já existentes — não vamos remover.

Migration inclui `GRANT SELECT, INSERT, UPDATE, DELETE` para `authenticated`, `GRANT ALL` para `service_role`, RLS ligado e policies permitindo leitura/escrita para autenticados (mesmo padrão das tabelas atuais de despesas).

## UI

### Refator dos componentes

Extrair de `EstrategiaDespesasConfiguracoes.tsx` os blocos `FolhaBlock` e `TiposCustoBlock` para arquivos reutilizáveis:

```text
src/components/direcao/estrategia/despesas/FolhaBlock.tsx
src/components/direcao/estrategia/despesas/TiposCustoBlock.tsx
```

Cada bloco ganha uma prop `mode: 'config' | 'mes'` e (quando `mes`) `mesReferencia: string`.

### Diferenças quando `mode === 'mes'`

Folha:
- Lista vem 100% de `despesas_padrao` (`tipo='folha'`), mesclada com overrides do mês.
- Botões "Novo colaborador", "Gerenciar setores", drag-and-drop de setores e exclusão **ficam ocultos**.
- Edição inline dos campos numéricos (salário, aux, %, etc.) grava em `despesas_mes_folha_override` via upsert pela chave `(mes_referencia, despesa_padrao_id)`.
- Permite zerar qualquer campo (valor 0 é um override válido).
- Botão "Restaurar padrão" por linha (ícone discreto) que apaga o override daquele colaborador no mês.

Tipos de Custos (Fixas / Variáveis / Impostos):
- Lista vem de `tipos_custos` ativos, mesclada com override de `valor_maximo_mensal`.
- Sem criar/excluir/reordenar tipos no modo mês.
- Edição do "valor mensal" grava em `despesas_mes_tipo_custo_override`.
- Botão "Restaurar padrão" por linha.
- Coluna de gastos do mês (somatório de `gastos` com `tipo_custo_id` e `data` no mês) fica visível, com botão "+ Novo gasto" abrindo `GastoFormDialog` já existente.

### Página `EstrategiaDespesasMes.tsx`

Substitui o uso atual de `DespesasResumoTopo` pelos novos blocos:

```text
<FolhaBlock mode="mes" mesReferencia={mes} />
<TiposCustoBlock mode="mes" mesReferencia={mes} tipo="fixa" />
<TiposCustoBlock mode="mes" mesReferencia={mes} tipo="variavel" />
<TiposCustoBlock mode="mes" mesReferencia={mes} tipo="imposto" />
```

Mantém: botão de status (Pendente/Alana/Luan), breadcrumb, `MinimalistLayout`, totalização do mês (calculada a partir dos blocos via callback).

`DespesasResumoTopo.tsx` deixa de ser usado por essa página (mantido caso outras telas usem, mas se nenhuma usar é removido).

## Hooks novos

```text
src/hooks/useDespesasMesFolhaOverrides.ts
src/hooks/useDespesasMesTipoCustoOverrides.ts
```

Cada um faz fetch dos overrides do mês, expõe `upsert(campo, valor)` e `clear(itemId)` (restaurar padrão).

## Cálculo do total do mês

`FolhaBlock` em modo mês emite o total efetivo (após overrides) via callback. `TiposCustoBlock` idem para gastos reais do mês (não a previsão). A página soma e exibe no subtítulo do `MinimalistLayout` e atualiza o cartão do mês na listagem anual.

## Fora de escopo

- Não vamos alterar `EstrategiaDespesasConfiguracoes.tsx` em comportamento, apenas extrair os blocos reutilizáveis.
- Migração de dados de `despesas_manuais_folha` para o novo modelo não é necessária — meses antigos passam a exibir o padrão atual; se precisar resgatar, fazemos depois.
- Sem mudanças no DRE, faturamento ou outros consumidores das tabelas existentes.
