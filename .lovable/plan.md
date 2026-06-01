
## Objetivo

Em `/direcao/estrategia/despesas/:mes`, restringir os campos editáveis (a configuração global continua intocada) e permitir abrir cada tipo de custo para ver/cadastrar os gastos vinculados àquele mês.

Tudo continua em `src/pages/direcao/estrategia/EstrategiaDespesasConfiguracoes.tsx` (compartilhado via `mode="mes"`). Nenhuma mudança em banco ou regras de negócio.

## Folha (colaboradores) — `FolhaRowCells`

Quando `readOnly` (mode='mes'):
- **Colaborador (nome)** — já é texto estático. Manter.
- **Em folha (Switch)** — adicionar `disabled={readOnly}` para travar.
- **Setor (select)** — já está `disabled={readOnly}`. Manter.
- Campos numéricos (Salário, Salário mín., Combustível, Insalub %, FGTS %) continuam editáveis (override do mês).
- Botão "Restaurar padrão" continua.

## Despesas (tipos de custo) — `SortableTipoRow` + `CategoriaGroup`

Propagar `readOnly` de `TiposCustoBlock` → `CategoriaGroup` → `SortableTipoRow`.

Quando `readOnly`:
- **Nome** — texto estático (sem `InlineText`).
- **Descrição** — botão do popover desabilitado / só leitura (mostra conteúdo se houver, sem permitir editar).
- **Categoria** — `<select disabled>` (mantém visual de chip).
- **Valor projetado** — texto estático com `formatCurrency`.
- **DRE (Switch)** — `disabled`.
- **Eliminar (AlertTriangle button)** — `disabled`, sem `onClick`.
- **Drag handle** e **Trash** — ocultos (já há `!readOnly` no bloco para "Nova despesa" e "Gerenciar categorias", aplicar mesma lógica nas linhas).
- **Linha torna-se clicável** (cursor-pointer) para expandir e mostrar os gastos vinculados ao tipo dentro do mês atual.
  - Adicionar botão chevron (>) à esquerda do nome ou tornar o nome clicável.
  - Estado local de expansão por id em `CategoriaGroup`.

### Sub-bloco de gastos expandido (apenas em `readOnly`)

Ao expandir um tipo, renderizar uma linha extra (`<tr>` com `colSpan`) contendo:
- Lista dos `gastos` do mês daquele `tipo_custo_id` (colunas: data, descrição, valor, ações).
- Botão **"+ Novo gasto"** que abre dialog simples (data, descrição, valor) e insere em `gastos` com `data_pagamento` no mês corrente.
- Botão de excluir gasto por linha.
- Total dos gastos do mês para esse tipo.

Implementação:
- Novo hook `useGastosPorTipoMes(tipoCustoId, mes)` em `src/hooks/` (ou usar `useGastos` existente já filtrado): faz `SELECT id, data_pagamento, descricao, valor FROM gastos WHERE tipo_custo_id = $1 AND data_pagamento BETWEEN start AND end ORDER BY data_pagamento DESC`. Inclui `insert` e `delete`.
- Novo componente `GastosDoTipoExpand` colocado no mesmo arquivo (perto de `SortableTipoRow`) para evitar nova explosão de arquivos.

## Passagem de props

- `TiposCustoBlock` já recebe `readOnly`. Passar para `<CategoriaGroup readOnly={readOnly} mesReferencia={mesReferencia} />`.
- `CategoriaGroup` recebe `readOnly` + `mesReferencia` e propaga para `SortableTipoRow`.
- `DespesasGridContent` passa `mesReferencia` para `TiposCustoBlock` (hoje só passa para Folha indiretamente via hook).

## Fora de escopo

- Nenhuma alteração na página de Configurações (`mode="config"` continua igual).
- Nenhuma migração ou mudança em RLS — usa tabela `gastos` existente.
- Nenhuma mudança no botão de status, breadcrumb ou totalização superior.
