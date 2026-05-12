## Objetivo

Tornar "Código do fornecedor" um identificador numérico sequencial do **próprio fornecedor** (não do item no fornecedor). Ele é gerado uma única vez por fornecedor, fica visível no cadastro e é puxado automaticamente — em modo somente leitura — para cada linha de item da requisição.

## Mudanças

### 1. Banco de dados
- Adicionar `fornecedores.codigo` como `integer`, único, com sequência dedicada `fornecedores_codigo_seq` e default `nextval(...)`.
- Backfill: preencher `codigo` dos fornecedores já existentes em ordem de `created_at` (1, 2, 3...).
- Reposicionar a sequência para o próximo valor após o backfill.

### 2. Cadastro de fornecedor
- Em `FornecedoresMinimalista` exibir o `codigo` em modo leitura (badge no topo do card / lista). Sem campo editável — é gerado pelo banco no insert.
- Tipos `Fornecedor` (`useFornecedores`) ganham `codigo: number`.

### 3. Cadastro de item (estoque)
- Remover os campos "Código no Fornecedor" do `EstoqueMinimalista` e `EditarProdutoModal` adicionados na rodada anterior. Manter apenas IPI (%).
- Migration adicional dropa `estoque.codigo_fornecedor` (não é mais usado por item; o código vive no fornecedor).

### 4. Página `NovaRequisicaoCompra`
- Ao selecionar um fornecedor, derivar `codigo_fornecedor = fornecedor.codigo` (string) e aplicar a todos os itens já presentes.
- Ao adicionar/alterar produto numa linha, o campo `Cód. fornec.` é preenchido com `fornecedor.codigo` automaticamente.
- O input do `Cód. fornec.` na tabela fica `readOnly` + `disabled`-look (cursor padrão, sem foco) e mostra o código.
- Salvar continua persistindo `codigo_fornecedor` em cada item (string), assim o PDF não muda de schema.

### 5. PDF
- `pedidoCompraPDF` já imprime `codigo_fornecedor` na coluna correspondente — sem alteração de código, só passa a vir o número do fornecedor.

## Detalhes técnicos
- Migration 1: `ADD COLUMN codigo`, criar sequence, backfill via CTE com `row_number() OVER (ORDER BY created_at)`, set `DEFAULT nextval`, `NOT NULL`, `UNIQUE`.
- Migration 2: `ALTER TABLE estoque DROP COLUMN IF EXISTS codigo_fornecedor`.
- Arquivos editados: `useFornecedores.ts` (tipo + select inclui `codigo`), `FornecedoresMinimalista.tsx` (exibir código), `EstoqueMinimalista.tsx` e `EditarProdutoModal.tsx` (remover input código fornecedor), `NovaRequisicaoCompra.tsx` (auto-fill + readOnly), `useRequisicoesCompra.ts` (remover `codigo_fornecedor` do select de `estoque`, manter na linha).

## Fora de escopo
- Editar manualmente o código do fornecedor.
- Recalcular código de fornecedores antigos depois de criados (sequência só avança).