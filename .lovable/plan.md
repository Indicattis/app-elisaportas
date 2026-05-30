## Objetivo

Permitir marcar uma despesa como "a eliminar" em `/direcao/estrategia/despesas/configuracoes`. Quando marcada, o valor projetado aparece em vermelho na tabela, sinalizando que existe intenção de cortar essa despesa.

## Mudanças

### 1. Banco de dados
- Adicionar coluna `marcada_para_eliminar boolean NOT NULL DEFAULT false` na tabela `public.tipos_custos` (via migration).

### 2. Hook `useTiposCustos`
- Incluir `marcada_para_eliminar` na interface `TipoCusto` e no `select` do fetch.

### 3. Página `EstrategiaDespesasConfiguracoes.tsx`
- Nova coluna na tabela (ao lado do toggle DRE) com um pequeno toggle/flag rotulada como "Eliminar" (ícone alvo/AlertTriangle + tooltip "Marcar para eliminar essa despesa"), persistindo via `update(id, { marcada_para_eliminar })`.
- Quando `marcada_para_eliminar = true`:
  - O valor projetado da linha é exibido em vermelho (`text-red-400`) com leve `line-through` opcional.
  - Indicador visual sutil na linha (borda esquerda vermelha fina) para chamar atenção.
- No total mensal estimado do bloco, os valores marcados continuam somando (não muda o cálculo), apenas o estilo da linha muda. Confirmar essa premissa abaixo.

## Detalhes técnicos

- Tabela alvo: `public.tipos_custos` — campo novo persistido por linha.
- UI: `SortableTipoRow` recebe a flag e aplica classe condicional no `<td>` do valor.
- Sem mudanças em `gastos`/DRE — é apenas um marcador estratégico de intenção.

## Pergunta antes de implementar

O valor marcado para eliminar deve:
- (A) Continuar somando no "Total mensal estimado (ativos)" — apenas estilo vermelho, ou
- (B) Ser descontado/subtotal separado mostrando "economia potencial ao eliminar"?
