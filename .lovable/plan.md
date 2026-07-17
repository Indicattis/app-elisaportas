## Problema
Em `/vendas/minhas-vendas/nova`, o campo **Público Alvo** não persiste no cadastro do cliente — a cada nova venda o vendedor precisa selecioná-lo novamente, mesmo escolhendo um cliente já existente. Mesmo comportamento que havia com o "Número" do endereço.

## Causa
A tabela `clientes` **não possui** a coluna `publico_alvo` (verificado no schema). O valor existe apenas no formulário da venda e não é lido/gravado no cadastro do cliente.

## Plano

### 1. Migration (banco)
Adicionar coluna em `public.clientes`:
- `publico_alvo text` (nullable, sem default).

Sem alterações de RLS/GRANTs (a tabela já é acessível).

### 2. `src/hooks/useVendas.ts`
Ao criar/atualizar cliente durante a venda, incluir `publico_alvo: vendaData.publico_alvo || null`:
- No `update` do cliente existente (bloco `if (vendaData.cliente_id)`).
- Nos dois `insert` de novo cliente (com CPF e sem CPF).

### 3. `src/components/vendas/ClienteVendaSection.tsx`
- No `handleSelectCliente`, hidratar `publico_alvo` a partir de `cliente.publico_alvo` (fallback para `''`) junto com os demais campos.
- Ampliar a interface local `Cliente` para incluir `publico_alvo?: string | null`.

Nenhuma alteração de UI: os selects existentes (linhas 552/779) já leem/gravam `dados.publico_alvo`.

### 4. Verificação
- Selecionar cliente existente que já tenha `publico_alvo` gravado → campo deve vir preenchido.
- Alterar público alvo em uma venda → próxima venda do mesmo cliente já traz o valor atualizado.
- Cliente novo criado pela venda → registro em `clientes` deve conter `publico_alvo`.

Sem impacto em rascunhos (o campo continua no snapshot da venda) nem em telas de faturamento/edição (elas já leem de `vendas.publico_alvo`).