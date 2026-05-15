## Objetivo
Em `/administrativo/compras/requisicoes/nova`:
- Remover a obrigatoriedade de escolher um fornecedor antes de adicionar itens.
- Tornar o campo de **inserção rápida** o primeiro elemento da página (logo após o cabeçalho).
- Permitir buscar e adicionar produtos de **qualquer fornecedor** (mostrando o nome do fornecedor em cada sugestão).
- Na listagem de requisições, exibir os fornecedores **derivados dos itens** adicionados.

## Mudanças em `src/pages/administrativo/NovaRequisicaoCompra.tsx`
1. **Reordenar layout:** mover o bloco de "Inserção rápida" para o topo, antes de "Dados gerais". "Dados gerais" passa a ter apenas Data de Necessidade + Observações (remover o `Select` de Fornecedor).
2. **Quick search global:** trocar `itensDoFornecedor` por filtragem em todo `estoque` ativo. Cada sugestão exibe `nome_produto` + `SKU` + **nome do fornecedor** (`p.fornecedor?.nome`).
3. **Adicionar item:** ao adicionar, gravar `codigo_fornecedor` a partir do fornecedor do próprio produto (buscar em `fornecedores` pelo `produto.fornecedor_id`), não mais do fornecedor da requisição.
4. **Linha da tabela de itens:** adicionar coluna "Fornecedor" exibindo `produto.fornecedor?.nome`. Remover o `Select` de produto por linha (toda inserção passa a ser pelo quick-add) — manter só visualização do nome do produto + SKU.
5. **Remover** estados/funções não utilizados: `pendingFornecedorChange`, `handleSelectFornecedor`, `confirmFornecedorChange`, `handleAdicionarLinha`, AlertDialog de troca de fornecedor.
6. **Salvar:** remover validação `if (!formData.fornecedor_id)`. Enviar `fornecedor_id: undefined` (campo já é opcional no hook).

## Mudanças em `src/hooks/useRequisicoesCompra.ts`
- Nenhuma alteração de schema. `fornecedor_id` já é opcional no insert.
- Já carrega `estoque(...)` por item; expandir o `select` de itens para incluir `fornecedores(nome)` via `estoque(fornecedor:fornecedores(nome))` para que a listagem tenha acesso ao nome do fornecedor de cada item.
- Adicionar campo derivado `fornecedores_itens: string[]` (lista única de nomes) em cada requisição, para uso na listagem.

## Mudanças em `src/pages/administrativo/RequisicoesMinimalista.tsx`
- Coluna "Fornecedor" passa a renderizar `requisicao.fornecedores_itens?.join(", ") || requisicao.fornecedor_nome || "-"` (mantém retrocompatibilidade com requisições antigas que tinham fornecedor único).
- Mesma troca no painel de detalhes (linha 345).
- Atualizar busca para considerar `fornecedores_itens`.

## Sem mudanças de banco
Modelo continua aceitando `fornecedor_id` nulo na requisição; o vínculo do fornecedor por item já existe através do `produto_id → estoque.fornecedor_id`.