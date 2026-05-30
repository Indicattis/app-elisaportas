## Diagnóstico

Confirmado: `gastos.tipo_custo_id` tem FK para `tipos_custos` sem `ON DELETE`, então qualquer tentativa de excluir um tipo de custo com gastos vinculados retorna 409 (`23503`).

## Solução

Antes de excluir, verificar se existem gastos vinculados. Se houver, abrir um diálogo de **realocação** onde o usuário escolhe outro tipo de custo de destino (do mesmo `tipo` — fixa/variavel/imposto), reatribuir todos os gastos e então excluir o tipo original.

## Mudanças

**`src/hooks/useTiposCustos.ts`**
- Nova função `deleteTipoCustoComRealocacao(id, novoTipoId?)`:
  - `SELECT count` em `gastos` filtrado por `tipo_custo_id = id`.
  - Se `count > 0` e `novoTipoId` ausente → retorna `{ needsRealocacao: true, count }` sem excluir.
  - Se `novoTipoId` informado → `UPDATE gastos SET tipo_custo_id = novoTipoId WHERE tipo_custo_id = id`, depois `DELETE`.
  - Se `count === 0` → `DELETE` direto.
- Manter `deleteTipoCusto` atual para chamadas legadas, ou substituir por essa nova implementação.

**`src/pages/direcao/estrategia/EstrategiaDespesasConfiguracoes.tsx`**
- Novo estado local `realocacaoDialog: { tipo: TipoCusto; count: number } | null` no nível do componente da página (ou no `TiposCustoBlock`).
- Ao clicar no botão de excluir de uma linha de tipo de custo:
  1. Chamar a verificação. Se `needsRealocacao`, abrir o diálogo; senão excluir direto.
- Diálogo (usando `Dialog` do shadcn já presente no projeto):
  - Título: "Realocar gastos antes de excluir".
  - Texto: "Existem N gasto(s) vinculados a '{nome}'. Escolha outro tipo de custo para receber esses gastos."
  - `Select` com tipos do mesmo `tipo` (fixa/variavel/imposto), excluindo o atual.
  - Botões: Cancelar / Realocar e excluir (desabilitado até escolher destino).

**Sem mudanças no banco** — apenas no app.

## Resultado

A exclusão de um tipo de custo com gastos vinculados abre um diálogo para escolher o tipo de destino; após realocação automática (`UPDATE` em `gastos`), o tipo original é excluído sem violar a FK. Tipos sem gastos continuam sendo excluídos direto.
