## Problema

Os filtros de "vendedor/atendente" em `/paineis/metas-vendas` e `/direcao/vendas/todas` filtram `admin_users` por `role IN ('atendente','vendedor')`. Como William Rodrigues é `gerente_instalacoes` (e há outros: Magno = `gerentedevendas`, Paulo/Alana = `gerente_comercial`, Luan = `diretor`), ele — mesmo tendo 5 vendas fechadas — não aparece nas listas.

Confirmado via query: 5 pessoas fora dos dois roles têm vendas reais.

## Solução

Trocar o critério "role fixo" por "usuários que efetivamente têm vendas", unindo com a lista atual de atendentes/vendedores (para manter vendedores novos sem venda ainda visíveis).

### 1. `src/pages/direcao/VendasDirecao.tsx` (linhas ~294–298)
Substituir a query única de `admin_users WHERE role='atendente'` por:
- Buscar todos os `atendente_id` distintos da tabela `vendas` (is_rascunho=false).
- Buscar `admin_users` ativos com role em `('atendente','vendedor')`.
- Unir os `user_id` dos dois conjuntos e carregar `nome/foto_perfil_url` de todos.

### 2. `src/hooks/useProgressoMetasVendas.ts` (função `useProgressoMetasVendas`, linhas ~46–56 e `useVendedoresElegiveis`)
Aplicar a mesma união: elegíveis = ativos com role vendedor/atendente ∪ quem já tem venda registrada. Assim William e demais gerentes com vendas aparecem no painel de metas.

### 3. Manter compatibilidade
- Não alterar schema, nem roles no banco.
- Preservar ordenação por nome.
- Continuar usando `foto_perfil_url` e `nome` como antes.

### Fora do escopo
- Não mexer em regras de bonificação/tiers.
- Não alterar RLS.
