## Objetivo

Transformar o cadastro de requisição de compra em uma página dedicada e tornar a seleção de itens dependente do fornecedor escolhido, puxando automaticamente do cadastro do item o **código do fornecedor** e o **IPI**.

## Mudanças

### 1. Banco de dados
A tabela `estoque` hoje tem `fornecedor_id`, mas não armazena `codigo_fornecedor` nem `ipi_percent` por item. Migration para adicionar:
- `estoque.codigo_fornecedor` (text, nullable)
- `estoque.ipi_percent` (numeric, default 0)

### 2. Cadastro do item (estoque)
No formulário de cadastro/edição de item em `/administrativo/compras/estoque` adicionar dois campos:
- "Código no fornecedor"
- "IPI (%)"

Ambos opcionais, agrupados perto do campo Fornecedor já existente.

### 3. Nova página dedicada de requisição
- Criar rota `/administrativo/compras/requisicoes/nova` (e `/:id/editar` para edição) com a página `NovaRequisicaoCompra.tsx`.
- Em `RequisicoesMinimalista.tsx`, o botão "Nova Requisição" passa a navegar para essa rota em vez de abrir o `Dialog`. Os botões de editar nos cards também navegam.
- Remover o `RequisicaoCompraForm` em modal; mover seu conteúdo para a nova página, mantendo o mesmo estilo glass/dark, agora com layout em largura total (header com ações Salvar/Cancelar fixas no topo, seções "Dados gerais", "Itens", "Totais").

### 4. Vínculo fornecedor → itens
Na nova página:
- O seletor de "Item" em cada linha só lista itens de `estoque` cujo `fornecedor_id` = fornecedor selecionado.
- Se nenhum fornecedor estiver selecionado, o botão "Adicionar item" fica desabilitado com hint "Selecione um fornecedor primeiro".
- Trocar de fornecedor com itens já adicionados: confirmar com o usuário e limpar a lista de itens (evita inconsistência).
- Ao escolher um item:
  - `codigo_fornecedor` ← `estoque.codigo_fornecedor`
  - `ipi_percent` ← `estoque.ipi_percent`
  - `valor_unitario` ← `estoque.custo_unitario` (mantido como hoje)
  - `sku`, `unidade`, `localizacao` (se houver) ← cadastro
- Esses campos continuam editáveis na linha (sobrescrita manual permitida), mas pré-preenchidos.

### 5. Hook `useEstoque` / consulta
Adicionar uma query auxiliar `useEstoqueByFornecedor(fornecedorId)` que retorna itens ativos filtrados por `fornecedor_id`, usada apenas pela nova página.

## Detalhes técnicos

- Arquivos novos: `src/pages/administrativo/NovaRequisicaoCompra.tsx`, migration SQL.
- Arquivos editados: `src/App.tsx` (rotas), `RequisicoesMinimalista.tsx` (navegação, remover Dialog), formulário/modal de cadastro de item em estoque, `useEstoque.ts` (campos novos no tipo + query por fornecedor), `useRequisicoesCompra.ts` (enriquecimento dos itens já passa a incluir `codigo_fornecedor` e `ipi_percent` do estoque como fallback).
- `RequisicaoCompraForm.tsx` é descontinuado (deletar) ou convertido em componente interno da nova página.
- PDF e cálculos de totais permanecem inalterados.

## Fora de escopo

- Mudanças no fluxo de aprovação/status.
- Multi-fornecedor por item (continua 1:1).
- Histórico de preços.