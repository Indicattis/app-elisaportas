## Sistema de Matérias-Primas (Fase 1)

Esta fase cria apenas o cadastro de matérias-primas e o vínculo com itens do estoque. A coluna na geração de lista de material em `/direcao/gestao-fabrica` fica para a fase 2.

### 1. Banco de dados

Nova tabela `materias_primas` (cadastro básico, controle de estoque manual):

- `nome` (texto, obrigatório)
- `unidade` (texto, ex.: "bobina", "kg", "rolo")
- `quantidade` (numérico, estoque atual editado manualmente)
- `custo_unitario` (numérico)
- `fornecedor_id` (referência a `fornecedores`, opcional)
- `ativo` (booleano, padrão true)
- `ordem` (inteiro, para ordenação)
- campos padrão (id, created_at, updated_at, created_by)

RLS: leitura/escrita para usuários autenticados (mesmo padrão da tabela `estoque`).

Novas colunas em `estoque` (vínculo 1 → 1):

- `materia_prima_id` (uuid, FK para `materias_primas`, opcional)
- `materia_prima_conversao` (numérico, opcional) — quanto da unidade do item é obtido a partir de **1 unidade** da matéria-prima. Ex.: meia cana → bobina, conversão = 300 (300 m de meia cana por bobina).

### 2. UI — `/fabrica/produtos`

**Botão no header**: "Matérias-Primas" (ao lado do botão "Categorias" já existente). Abre um Dialog com:

- Lista das matérias-primas cadastradas (nome, unidade, quantidade em estoque, custo, fornecedor, qtd. de itens vinculados).
- Botão "Nova matéria-prima" → formulário com os campos básicos.
- Ações por linha: editar, excluir (soft delete via `ativo=false`; bloqueia exclusão se houver itens vinculados, com aviso).
- Edição inline da `quantidade` (estoque manual).

**Edição/criação de produto do estoque**: adicionar uma seção "Matéria-prima vinculada" com:

- Select de matéria-prima (com opção "Nenhuma").
- Campo numérico "Quantos `<unidade do item>` por 1 `<unidade da matéria-prima>`" (= `materia_prima_conversao`).
- Texto auxiliar mostrando exemplo: "Ex.: 1 bobina = 300 m de meia cana".

### 3. Hook + tipos

Novo `src/hooks/useMateriasPrimas.ts` no padrão de `useEstoque`:

- `listar`, `criar`, `editar`, `excluir`, `ajustarQuantidade` (entrada/saída manual).
- Query key `["materias-primas"]`.

Atualizar `ProdutoEstoque` / `ProdutoEstoqueInput` em `useEstoque.ts` com os dois novos campos e join opcional `materia_prima:materias_primas(id, nome, unidade)`.

### 4. Fora do escopo desta fase

- Coluna nova no PDF de lista de material em `/direcao/gestao-fabrica` (será a fase 2, depois que os vínculos estiverem cadastrados).
- Cálculo automático do estoque da matéria-prima a partir dos itens vinculados.
- Movimentações históricas da matéria-prima (entrada/saída logada). Por enquanto, edição direta da quantidade.

### Arquivos afetados

- Migration: nova tabela `materias_primas` + colunas em `estoque` + RLS.
- `src/hooks/useEstoque.ts` — novos campos no tipo e no select.
- `src/hooks/useMateriasPrimas.ts` — novo.
- `src/pages/direcao/estoque/ProdutosFabrica.tsx` — botão "Matérias-Primas" no header.
- `src/components/estoque/MateriasPrimasDialog.tsx` — novo, lista + CRUD.
- `src/components/estoque/MateriaPrimaForm.tsx` — novo, formulário criar/editar.
- Form de produto do estoque (onde edita item de `/fabrica/produtos`) — nova seção de vínculo.
