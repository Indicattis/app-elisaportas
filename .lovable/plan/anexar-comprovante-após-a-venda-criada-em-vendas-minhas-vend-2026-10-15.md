# Anexar comprovante após a venda criada em /vendas/minhas-vendas

## Objetivo
Permitir anexar (ou substituir/remover) o comprovante de pagamento de uma venda já criada, direto da lista "Minhas Vendas" e da página de detalhes da venda — hoje isso só é possível na tela de edição.

## O que será feito

### 1. Lista "Minhas Vendas" (`src/pages/vendas/MinhasVendas.tsx`)
- Adicionar uma coluna de ações com um botão de clipe (Paperclip) em cada linha da tabela.
- O ícone muda de aparência conforme a venda já tenha comprovante anexado (preenchido/destaque) ou não.
- Clicar abre o modal `ComprovanteUploadModal` já existente (upload PNG/JPG/PDF até 10 MB, com visualizar, substituir e remover).
- O clique no botão não navega para a página da venda (stopPropagation).
- Após salvar/remover, a lista é atualizada automaticamente (invalidação do cache `minhas-vendas`).

### 2. Detalhes da venda (`src/pages/vendas/VendaDetalhesMinimalista.tsx`)
- Adicionar um bloco "Comprovante de Pagamento" mostrando o comprovante atual (se houver) com botões para visualizar, substituir e remover, reutilizando o mesmo `ComprovanteUploadModal`.

## Detalhes técnicos
- Reutiliza o componente existente `src/components/vendas/ComprovanteUploadModal.tsx`, que já faz upload no bucket `comprovantes-pagamento` e grava `comprovante_url`/`comprovante_nome` na tabela `vendas`.
- Nenhuma mudança de banco de dados ou permissão é necessária — as colunas e o bucket já existem e são usados hoje na tela de edição.
- Em `MinhasVendas.tsx`: novo estado `vendaComprovante` (venda selecionada para o modal), inclusão de `comprovante_nome` no select da query e invalidação de `['minhas-vendas']` ao fechar o modal com sucesso.

## Verificação
- Typecheck limpo (`tsgo --noEmit`).
- Teste no preview: abrir /vendas/minhas-vendas, clicar no clipe de uma venda, anexar um PDF, confirmar que o ícone muda e o comprovante abre.
