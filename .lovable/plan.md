## Objetivo

1. Adicionar uma nova coluna **"Matéria-prima"** na tabela de `/fabrica/produtos`, editável inline (igual às outras colunas), para vincular o item a uma matéria-prima sem precisar abrir a tela de edição.
2. Confirmar como o cálculo está modelado hoje (campo `materia_prima_conversao`) e garantir que a conta para a fase 2 (lista de compras) faça sentido.

---

## 1. Nova coluna na tabela

Posição: entre **"Fornecedor"** e **"Categoria"** (mantém Categoria/Unidade/Estoque agrupadas).

Conteúdo da célula (1 célula só, com 2 controles):

- **Select** com as matérias-primas ativas + opção "Nenhuma".
- Quando houver matéria-prima vinculada, mostra abaixo (ou ao lado, em fonte menor) um **input numérico** com a conversão, no formato:
  - `1 <unidade da MP> = [____] <unidade do item>`
  - Ex.: `1 bobina = 300 m`

Exibição quando não há vínculo: `—` (clicável para abrir o select, mesmo padrão do `EditableSelectCell` atual).

Comportamento:

- Trocar a matéria-prima salva `estoque.materia_prima_id` (mantém conversão atual ou zera se for "Nenhuma").
- Editar o número salva `estoque.materia_prima_conversao`.
- Ambos via `handleUpdateField` que já existe (faz update direto na tabela `estoque`).

Header da tabela ganha a coluna "Matéria-prima" e o `colSpan` dos estados de loading/vazio passa de 13 para 14. O footer ganha mais um `<TableCell />` vazio.

A seção atual em `/fabrica/produtos/editar/:id` continua existindo (já implementada na fase 1) — a coluna inline é só um atalho rápido, ambas escrevem nos mesmos campos.

---

## 2. Verificação do fluxo de cálculo

Modelagem atual (fase 1):

- `materias_primas.unidade` — unidade da MP comprada (ex.: `bobina`).
- `estoque.materia_prima_id` — FK para a MP.
- `estoque.materia_prima_conversao` — **quantos `estoque.unidade` se obtém a partir de 1 unidade da MP**. Ex.: meia cana → bobina, conversão = `300` (1 bobina rende 300 m de meia cana).

Conta da lista de compras (fase 2, ainda não implementada):

```text
necessario_item       = quanto da meia cana é preciso (em metros)
conversao             = 300 (m por bobina)
mp_a_comprar          = ceil(necessario_item / conversao)
```

Isso bate com o exemplo do usuário ("a cada bobina conseguimos 300m de meia cana"). A direção da conversão está correta — não precisa inverter.

Pontos para confirmar / ajustar agora, antes da fase 2:

- A conversão é **sempre** "unidade do item por 1 da MP" (nunca o inverso). O label da coluna e do form de edição já segue isso; vamos manter.
- Vários itens podem apontar para a mesma MP (ex.: meia cana 50mm e meia cana 80mm → mesma bobina). A fase 2 vai precisar **agrupar por `materia_prima_id`** e somar `necessario_item / conversao` antes do `ceil`, para não comprar bobina a mais. Isso fica registrado aqui mas não é implementado nesta etapa.
- Estoque atual da MP (`materias_primas.quantidade`) deve ser **descontado** do total antes do `ceil` na fase 2. Também só registrado, não implementado agora.

---

## Detalhes técnicos

Arquivos afetados:

- `src/pages/direcao/estoque/ProdutosFabrica.tsx`
  - `SortableProductRow`: nova prop `materiasPrimas` e nova `<TableCell>` com select + input.
  - Header: novo `<TableHead>` "Matéria-prima".
  - `colSpan` das linhas placeholder: 13 → 14.
  - `<TableFooter>`: novo `<TableCell />` para alinhar.
  - Importar `useMateriasPrimas` e passar a lista para a row.
- `src/hooks/useEstoque.ts`
  - Incluir `materia_prima_id`, `materia_prima_conversao` e join `materia_prima:materias_primas(id, nome, unidade)` no select da query, para a célula exibir a unidade da MP corretamente.
  - Tipo `ProdutoEstoque` ganha o campo opcional `materia_prima?: { id; nome; unidade } | null` (os dois campos planos já existem na tabela).

Sem mudanças de banco. Sem mudança no PDF de lista de compras nesta etapa (fase 2 fica para depois, conforme acordado).
