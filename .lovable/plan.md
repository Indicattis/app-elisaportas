# Cartela de clientes por vendedor na nova venda

## Objetivo
Em `/vendas/minhas-vendas/nova`, o usuário passa a ver e selecionar apenas clientes da sua própria cartela (clientes que ele cadastrou). Clientes novos cadastrados na venda continuam entrando na cartela de quem os cadastrou.

## O que muda

1. **Busca de clientes filtrada pela cartela**
   - A busca por nome ou CPF/CNPJ na seção "Cliente" retorna somente clientes cujo responsável é o usuário logado.
   - Vale para todos os usuários, inclusive gestores (sem exceção por cargo).

2. **Aviso quando o CPF/CNPJ pertence a outro vendedor**
   - Hoje já existe checagem de duplicidade por CPF/CNPJ. Ela continua consultando a base inteira, mas a mensagem passa a distinguir dois casos:
     - Cliente já é da sua cartela: aviso atual, com opção de usar o cliente existente.
     - Cliente é de outro vendedor: bloqueio com aviso "Este CPF/CNPJ já está cadastrado na cartela de outro vendedor", sem expor os dados do cliente e sem permitir selecioná-lo.

3. **Novo cliente entra na cartela do vendedor**
   - Comportamento já existente é mantido e confirmado: o cadastro grava o usuário logado como responsável no momento do insert.

4. **Sem alterações no banco**
   - Nenhuma migração e nenhuma mudança em políticas de acesso (RLS). A restrição é aplicada apenas nesta tela, para não afetar outras páginas que listam clientes (transferência de carteira, direção, etc.).

## Detalhes técnicos
- `src/hooks/useClientes.ts`
  - `useSearchClientes`: obter o usuário atual (`supabase.auth.getUser()`) e adicionar `.eq("created_by", user.id)` à query; sem usuário, retorna lista vazia.
  - `useCheckClienteDuplicado`: passar a retornar também se o registro encontrado pertence ao usuário atual (ex.: campo `mesmaCartela` no resultado), mantendo a query global.
- `src/components/vendas/ClienteVendaSection.tsx`
  - Ajustar mensagens do bloco de duplicidade para os dois casos acima; no caso "outro vendedor", não exibir botão de usar o cliente existente.
  - Manter a hidratação por `initialClienteId` (conversão de rascunho) sem filtro, para não quebrar rascunhos existentes.
