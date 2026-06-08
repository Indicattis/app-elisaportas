## Objetivo

Adicionar uma nova tabela chamada **"Despesa projetada"** ao lado das tabelas existentes (Fixas, Variáveis, Impostos), tanto em:
- `/direcao/estrategia/despesas/configuracoes`
- `/direcao/estrategia/despesas/2026-05` (e demais meses)

Comportamento idêntico às outras tabelas de tipos de custos: CRUD, override por mês, aparece no resumo, exportação, etc.

## Mudanças

### 1. Banco de dados (migration)
Atualizar o `CHECK` da coluna `tipos_custos.tipo` para aceitar o novo valor `'projetada'`:
- Drop do constraint `tipos_custos_tipo_check`
- Recriar permitindo `'fixa' | 'variavel' | 'imposto' | 'projetada'`

Nenhuma alteração de schema adicional — a estrutura existente já suporta o novo tipo (incluindo `useTiposCustosMes`, override por mês e contagem de gastos).

### 2. Frontend — `EstrategiaDespesasConfiguracoes.tsx`
- Filtrar `tiposProjetadas = tiposCustos.filter(t => t.tipo === 'projetada')`
- Adicionar 4º `<TiposCustoBlock>` com:
  - `titulo="Tipos de Custos — Despesa projetada"`
  - `icon={<TrendingUp />}` (ou similar)
  - `tipo="projetada"`
  - Demais props idênticas aos outros blocos

### 3. Tipagens (`useTiposCustos` / `useTiposCustosMes` / `TipoCustoBlock`)
- Ampliar a união `'fixa' | 'variavel' | 'imposto'` para incluir `'projetada'` onde aparecer (props do bloco, formulários internos, selects de "mover para outro tipo" na exclusão, etc.).
- Garantir que o select de tipo no formulário interno do `TipoCustoBlock` (se exibir tipos) inclua a nova opção; caso o formulário use o `tipo` fixo via prop, nenhuma mudança extra é necessária.

### 4. Itens NÃO afetados
- DRE e demais consumidores de `tipos_custos` continuam funcionando normalmente — a flag `aparece_no_dre` já controla a visibilidade.
- Página `/direcao/estrategia/despesas/{mes}` exibe a nova tabela automaticamente, pois compartilha `DespesasGridContent`.

## Pergunta aberta

O novo tipo deve aparecer no DRE por padrão (`aparece_no_dre = true`) como as outras, ou já vir desmarcado? Vou assumir o padrão atual (`true`, controlável por linha) salvo orientação em contrário.
