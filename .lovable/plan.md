
## Objetivo

Permitir que o vendedor cadastre um novo Representante direto na página `/vendas/meus-parceiros`, já vinculado a ele como atendente responsável.

## Contexto atual

- Representantes no sistema são armazenados na tabela `autorizados` com `tipo_parceiro='representante'` (a tabela `representantes` existe mas é usada por outro fluxo de acesso, não pela lista de parceiros do vendedor).
- Hoje só existe cadastro de parceiro em `/direcao/autorizados/novo` (`NovoAutorizadoDirecao.tsx`), fixado em `tipo_parceiro='autorizado'` e restrito à Direção/Logística.
- A RLS de `autorizados` permite qualquer usuário autenticado inserir, então o vendedor já tem permissão no banco.
- `MeusParceiros.tsx` filtra por `vendedor_id = admin_user.id` do usuário logado, então basta o novo registro nascer com esse `vendedor_id` para aparecer imediatamente na lista.

## O que será feito

### 1. Novo botão em `src/pages/vendas/MeusParceiros.tsx`
- Botão "Cadastrar Representante" no cabeçalho (ao lado do filtro por tipo), com ícone `Plus` e estilo consistente com o restante da página (glassmorphism roxo, coerente com a cor do tipo Representante).
- Ao clicar, abre um dialog modal (`RepresentanteFormDialog`) — sem sair da rota — mantendo a UX rápida esperada pelo vendedor.

### 2. Novo componente `src/components/parceiros/RepresentanteFormDialog.tsx`
Formulário enxuto (só o essencial que faz sentido para representante):
- Nome * 
- Responsável * 
- Telefone * 
- WhatsApp * 
- E-mail (opcional)
- CPF/CNPJ (opcional)
- Chave Pix (opcional)
- Estado * (select com `ESTADOS_BRASIL`)
- Cidade * (select dependente via `getCidadesPorEstado`)
- CEP *

Regras:
- `tipo_parceiro = 'representante'` fixo.
- `vendedor_id` = `admin_users.id` do usuário logado (resolvido via `user.id`).
- `representante_etapa` = primeira etapa do fluxo de representante (`getEtapasByTipo('representante').order[0]`).
- `ativo = true`.
- `created_by` = `admin_users.id` do usuário logado.
- Após insert bem-sucedido: dispara `geocode-nominatim` (best-effort, igual `NovoAutorizadoDirecao`), invalida a query `['meus-parceiros', user?.id]`, fecha o dialog e mostra toast.

### 3. Sem mudanças no banco
- Schema, GRANTs e RLS já cobrem o cenário (`Authenticated users can manage autorizados`).
- Sem migração.

## Fora de escopo
- Cadastro de Autorizados/Franqueados pelo vendedor (o pedido é específico para Representantes).
- Cidades secundárias, logo, vendedor responsável adicional — mantidos apenas no fluxo da Direção para não poluir o form do vendedor.
- Fluxo de aprovação: o representante já nasce ativo e vinculado ao vendedor (mesmo comportamento do cadastro atual de autorizado).

## Detalhes técnicos

- Arquivos alterados: `src/pages/vendas/MeusParceiros.tsx` (adiciona botão + estado do dialog).
- Arquivos novos: `src/components/parceiros/RepresentanteFormDialog.tsx`.
- Reaproveita: `ESTADOS_BRASIL`, `getCidadesPorEstado` (`@/utils/estadosCidades`), `getEtapasByTipo` (`@/utils/parceiros`), `useAuth`, componentes shadcn (`Dialog`, `Input`, `Label`, `Select`, `Button`).
- Invalidação: `queryClient.invalidateQueries({ queryKey: ['meus-parceiros'] })` após insert.
