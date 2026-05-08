## Objetivo

Em `/fabrica/produtos`:
1. Tabela com largura quase total da tela (apenas 100px de espaçamento lateral).
2. Edição inline ao clicar nas células: Nome, Descrição, Fornecedor, Categoria, Estoque Mín/Máx/Atual e Custo Unitário.
3. Nova coluna **Categoria** visível com badge colorido, editável.

## Mudanças

### 1. Largura da tabela (`ProdutosFabrica.tsx`)
- Passar `fullWidth` ao `MinimalistLayout` (já suportado: troca `max-w-7xl` por `w-full`).
- Envolver o conteúdo principal num wrapper `px-[100px]` para garantir 100px de padding lateral em qualquer resolução.

### 2. Nova coluna "Categoria"
- Adicionar `<TableHead>` "Categoria" entre **Fornecedor** e **Est. Mín**.
- Em `SortableProductRow`, renderizar um `Badge` com a cor da categoria (`getCategoriaColor` já existe). Quando vazia, mostrar "—".
- Ajustar `colSpan` dos estados vazio/loading (de 11 para 12).
- Ajustar `<TableFooter>` adicionando uma `<TableCell />` para a nova coluna.

### 3. Edição inline
Criar um pequeno componente interno `EditableCell` que alterna entre exibição e input ao clicar:
- **Texto** (Nome, Descrição): `<Input>` que salva no `onBlur` / `Enter`.
- **Número** (Est. Mín, Est. Máx, Atual, Custo): `<Input type="number">` formatando moeda quando aplicável.
- **Select** (Fornecedor, Categoria): `<Select>` aberto automaticamente, salva ao escolher.

Comportamento:
- Clique simples ativa edição apenas naquela célula.
- `Enter` ou `blur` confirma; `Escape` cancela.
- Salvar via `supabase.from("estoque").update({...}).eq("id", produtoId)` e invalidar a query `["estoque"]`.
- Mostrar `toast.success` / `toast.error`.
- O duplo-clique para ir à página de edição completa permanece, mas é detectado no `<TableRow>` apenas em áreas não-editáveis (clicar nas células editáveis não navega; o duplo-clique na linha em áreas neutras como o ícone de drag continua funcional). Manter a dica atual.

Campos atualizados na tabela `estoque`:
- `nome_produto`, `descricao_produto`
- `fornecedor_id`, `categoria` (UUID da categoria — formato já em uso)
- `quantidade_ideal`, `quantidade_maxima`, `quantidade`, `custo_unitario`

### 4. Itens fora de escopo
- Sem mudanças no banco de dados (colunas já existem).
- Sem mudanças em outras rotas (a página `/direcao/estoque/configuracoes/produtos/fabrica` reutiliza o mesmo componente e herdará o mesmo comportamento — esperado).
- Drag-and-drop e demais ações (excluir, conferir) permanecem intactos.

## Arquivos afetados
- `src/pages/direcao/estoque/ProdutosFabrica.tsx` (única edição)
