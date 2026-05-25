## Objetivo

Adicionar um novo botão **"Matéria Prima"** no header da página `/direcao/estrategia/itens` que leva a uma nova rota `/direcao/estrategia/materias-primas` com a gestão completa de matérias-primas vinculadas aos itens do catálogo da Estratégia.

## Conceito

Cada **matéria-prima** é uma "receita de compra" de um item de `/direcao/estrategia/itens`:
- Pertence a um item (`custos_itens`) — o item de referência
- Possui uma **quantidade** expressa na **unidade de medida do próprio item** (ex: 1 bobina = 250 m do item "Chapa", ou 1 galão = 18 L do item "Tinta")
- Possui nome, fornecedor opcional, custo da compra e observações

Assim a matéria-prima vira a unidade de compra real, enquanto o item continua sendo a unidade de consumo na fábrica.

## Importante — distinção em relação à tabela existente

Já existe uma tabela `materias_primas` usada no módulo de **Estoque/Almoxarifado** (com `quantidade em estoque`, `fornecedor_id`, vinculada a `estoque`). Aquela é de controle de estoque e **não** se confunde com este conceito de "interface de compra" da Estratégia.

Para evitar acoplar dois domínios diferentes na mesma tabela, será criada uma nova tabela dedicada: **`estrategia_materias_primas`**, ligada por FK a `custos_itens`.

## Mudanças

### 1. Banco de dados (nova migration)

Criar tabela `estrategia_materias_primas`:

| coluna | tipo | notas |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `custo_item_id` | uuid FK → `custos_itens(id)` ON DELETE CASCADE | item de referência |
| `nome` | text NOT NULL | nome da matéria-prima (ex: "Bobina 250m") |
| `quantidade_item` | numeric NOT NULL DEFAULT 0 | quanto rende na unidade do item |
| `custo_total` | numeric NOT NULL DEFAULT 0 | custo de compra da MP |
| `fornecedor` | text NULL | |
| `observacoes` | text NULL | |
| `ordem` | int NOT NULL DEFAULT 0 | |
| `ativo` | boolean NOT NULL DEFAULT true | soft delete |
| `created_at` / `updated_at` | timestamptz | trigger padrão |

RLS: políticas equivalentes às de `custos_itens` (acesso para admin / direção, via `has_role(...,'admin'::user_role)`).

### 2. Hook novo `useEstrategiaMateriasPrimas.ts`

CRUD com React Query: `list(custoItemId?)`, `criar`, `editar`, `excluir`, `reordenar`. Filtra por `ativo=true` e ordena por `ordem`.

### 3. Header do `EstrategiaItens.tsx`

Adicionar um botão **"Matéria Prima"** (ícone `Boxes` da lucide) na linha de botões do header, no mesmo estilo dos demais (`!h-[50px]`, `variant="outline"`, hover âmbar/ciano). `onClick` → `navigate("/direcao/estrategia/materias-primas")`.

### 4. Nova página `src/pages/direcao/estrategia/EstrategiaMateriasPrimas.tsx`

Estilo visual idêntico ao restante da Estratégia (glassmorphism, `MinimalistLayout`, `backPath="/direcao/estrategia/itens"`).

Layout:
- **Filtro/Seletor de Item** no topo (Select com todos os `custos_itens` agrupados por categoria) — mostra a unidade do item escolhido
- **Card de resumo**: nome do item, unidade, custo unitário atual; mostra "custo unitário calculado" derivado das MPs (média ponderada `Σcusto / Σquantidade_item`)
- **Tabela de matérias-primas** do item selecionado:
  - Colunas: `Nome`, `Qtd (na unidade do item)`, `Custo total (R$)`, `Custo/un (calculado)`, `Fornecedor`, `Observações`, `Ações`
  - Linhas com edição inline + botão "Adicionar matéria-prima"
  - Drag-and-drop de reordenação (mesmo padrão usado em EstrategiaItens)
- Vazio: estado guiando "Selecione um item para gerenciar suas matérias-primas"

### 5. Rota

Em `src/App.tsx` adicionar:
```tsx
import EstrategiaMateriasPrimas from "./pages/direcao/estrategia/EstrategiaMateriasPrimas";
...
<Route path="/direcao/estrategia/materias-primas"
  element={<ProtectedRoute routeKey="direcao_estrategia"><EstrategiaMateriasPrimas /></ProtectedRoute>} />
```

### 6. Hub (opcional, recomendado)

Adicionar entrada em `EstrategiaHub.tsx`:
`{ label: 'Matérias-Primas', icon: Boxes, path: '/direcao/estrategia/materias-primas' }`.

## Fora do escopo (este plano não faz)

- Não altera/usa a tabela `materias_primas` do Estoque
- Não cria fluxo de compra/pedido de compra automático a partir das MPs
- Não recalcula automaticamente `custo_unitario` do item a partir das MPs (apenas exibe o calculado como referência) — pode ser uma evolução futura com 1 clique "aplicar custo calculado ao item"

## Pergunta antes de implementar

Confirma que devo criar uma **tabela nova** `estrategia_materias_primas` (separada da `materias_primas` do Estoque)? Se preferir reaproveitar a tabela existente do Estoque (vinculando ao `custos_itens`), me avisa que ajusto o plano.
