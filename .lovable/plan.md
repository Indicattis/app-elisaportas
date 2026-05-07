## Objetivo

Permitir, na tela `/direcao/vendas/clientes`, transferir em lote os clientes de um vendedor desativado para outro vendedor ativo.

## Como funciona hoje

- `clientes.created_by` armazena o `user_id` (auth) do vendedor que cadastrou o cliente.
- O hook `useClientes` já mapeia `vendedor` a partir de `admin_users.user_id`.
- Hoje não há UI para reatribuir clientes quando um vendedor é desativado — eles ficam órfãos visualmente vinculados ao usuário inativo.

## Plano

### 1. Novo botão no header da página
- Em `src/pages/direcao/ClientesDirecao.tsx`, adicionar botão **"Transferir Clientes"** ao lado do `ColumnManager` em `headerActions`.
- Ícone: `ArrowRightLeft` (lucide-react). Estilo glassmorphism consistente com a página.

### 2. Novo modal `TransferirClientesModal`
Criar `src/components/clientes/TransferirClientesModal.tsx` com:

- **Select "Vendedor de origem (desativado)"**: lista apenas vendedores **inativos** (`admin_users.ativo = false`) que possuam ao menos 1 cliente em `clientes.created_by`. Mostrar nome + contador `(N clientes)`.
- **Select "Vendedor de destino"**: lista vendedores **ativos** (`admin_users.ativo = true`) do tipo `colaborador`/`metamorfo`, excluindo o vendedor de origem.
- **Resumo**: "Você está transferindo X clientes de [Origem] para [Destino]".
- **Botão "Transferir"**: dispara mutação. Confirmação inline via `AlertDialog` antes de executar.
- Estados de loading e toasts de sucesso/erro.

### 3. Novo hook `useTransferirClientes`
Em `src/hooks/useClientes.ts` (ou arquivo próprio):

- Mutação que executa:
  ```ts
  supabase
    .from('clientes')
    .update({ created_by: novoVendedorUserId })
    .eq('created_by', vendedorOrigemUserId)
  ```
- Em `onSuccess`, invalidar `['clientes']` e `['clientes-search']`, e mostrar toast com a contagem transferida.

### 4. Hook auxiliar para listar vendedores (ativos + inativos)
Adicionar `useVendedoresParaTransferencia` que busca `admin_users` (sem filtro `ativo`), tipo `colaborador`/`metamorfo`, e cruza com a contagem de clientes por `created_by` (já disponível em `clientes`).

- Retorna duas listas: `inativosComClientes` e `ativos`.

### 5. RLS / Permissões
A tabela `clientes` já permite update via hook `useUpdateCliente`. A nova mutação usa o mesmo padrão (sem alterações de schema/RLS necessárias). Caso o update em lote retorne `0 rows` por RLS, exibir o erro real do Supabase no toast (mesmo padrão usado em outros hooks recentes).

## Arquivos previstos

- `src/components/clientes/TransferirClientesModal.tsx` (novo)
- `src/hooks/useClientes.ts` (adicionar `useTransferirClientes` e `useVendedoresParaTransferencia`)
- `src/pages/direcao/ClientesDirecao.tsx` (botão + integração com modal)

## Resultado esperado

Diretor abre `/direcao/vendas/clientes`, clica em **"Transferir Clientes"**, escolhe um vendedor desativado como origem e um vendedor ativo como destino, confirma, e todos os clientes do vendedor desativado passam a aparecer sob o vendedor escolhido — refletindo imediatamente nos cards de meta CR e na coluna "Vendedor".
