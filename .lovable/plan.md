## Adicionar botão "Parceiros" no hub /direcao/vendas

### 1. Novo botão no hub
- Em `src/pages/direcao/VendasHubDirecao.tsx`, adicionar item **Parceiros** (ícone `Handshake`) apontando para `/direcao/vendas/parceiros`, usando o mesmo `routePrefix: 'direcao_vendas'`.

### 2. Nova página `src/pages/direcao/ParceirosDirecao.tsx`
Inspirada no print anexado: fundo preto, breadcrumb + botão voltar no topo (estilo glassmorphism do projeto), título "Parceiros", e abaixo um **pill tab nav** centralizado (formato cápsula `rounded-full` em `bg-white/5` com `backdrop-blur`), onde a aba ativa é uma pílula azul (gradient blue 500→700) e as inativas são texto cinza.

Três abas:
- **Autorizados** — lista todos de `autorizados` (todos os `tipo_parceiro`, default ativos+inativos com filtro), ordenados por nome.
- **Representantes** — lista todos de `representantes` (ativos e inativos).
- **Franqueados** — lista de `autorizados` com `tipo_parceiro = 'franqueado'`. Mostra empty state amigável se vazio (atualmente sem registros).

Cada aba renderiza um grid de cards (estilo glassmorphism: `bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4`) com:
- Avatar (logo_url / foto_perfil_url) ou inicial
- Nome
- Cidade/Estado (autorizados/franqueados) ou e-mail (representantes)
- Telefone/WhatsApp
- Badge de status (ativo/inativo; representantes inativos com `reprovado=true` aparecem como "Reprovado")

Loading state mostra "Carregando..." centralizado, igual ao print.

Esta página é apenas leitura/visualização — nenhuma edição, criação ou exclusão.

### 3. Rota em `src/App.tsx`
Adicionar:
```
<Route path="/direcao/vendas/parceiros"
       element={<ProtectedRoute routeKey="direcao_vendas"><ParceirosDirecao /></ProtectedRoute>} />
```

### Detalhes técnicos
- Fonte de dados: queries diretas via `supabase.from('autorizados')` e `supabase.from('representantes')` dentro do componente (`useQuery`). Sem novo hook compartilhado para manter o escopo enxuto.
- Sem alterações de schema/RLS — as policies de leitura dessas tabelas já existem (usadas pelas páginas atuais de autorizados e aprovações).
