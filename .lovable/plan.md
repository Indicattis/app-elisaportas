## Plano

Adicionar uma nova área de aprovação de **Requisições de Compra**, no mesmo padrão visual das demais páginas de `/direcao/aprovacoes`.

### 1. Nova página `src/pages/direcao/aprovacoes/AprovacoesCompras.tsx`
- Layout idêntico a `AprovacoesPedidos.tsx` (header sticky com `ArrowLeft` voltando para `/direcao/aprovacoes`, botão de refresh, lista colapsável de cards).
- Ícone: `ShoppingCart` (laranja como o restante).
- Lista as `requisicoes_compra` com `status = 'pendente_aprovacao'`, ordenadas por `created_at desc`.
- Cada card mostra: `numero_requisicao`, fornecedor (nome + cidade/UF), solicitante, data, valor total, badge com nº de itens.
- Ao expandir: tabela de itens (descrição, un, qtd, valor unit., IPI%, total) reaproveitando o cálculo já usado em `RequisicoesMinimalista` e bloco de observações.
- Ações:
  - **Aprovar** → `update requisicoes_compra` `{ status: 'aprovada', aprovado_por: auth.uid(), data_aprovacao: now() }`.
  - **Reprovar** → abre `AlertDialog` com `Textarea` para motivo; `update` `{ status: 'rejeitada', motivo_rejeicao, aprovado_por, data_aprovacao }`.
- Toasts de sucesso/erro e invalidação de queries (`['aprovacoes-compras']` + `['requisicoes-compra']`).

### 2. Hub `DirecaoAprovacoesHub.tsx`
- Adicionar item ao `menuItems`:
  ```ts
  { label: 'Aprovações Compras', icon: ShoppingBag, path: '/direcao/aprovacoes/compras' }
  ```
  (usar ícone diferente de Vendas para evitar duplicar `ShoppingCart`, ex.: `ShoppingBag` ou `Package`).
- Adicionar `useQuery` `aprovacoes-compras-count` contando `requisicoes_compra` com `status = 'pendente_aprovacao'` e expor no `countsMap`.

### 3. Roteamento `src/App.tsx`
- Importar `AprovacoesCompras`.
- Registrar rota:
  ```tsx
  <Route path="/direcao/aprovacoes/compras"
    element={<ProtectedRoute routeKey="direcao_aprovacoes"><AprovacoesCompras /></ProtectedRoute>} />
  ```

### Observações
- Sem mudanças de schema: a tabela `requisicoes_compra` já tem `status`, `aprovado_por`, `data_aprovacao`, `motivo_rejeicao`.
- RLS já permite `UPDATE` para autenticados (vide histórico da feature).
- Não criar nova rota no `app_routes` agora — reaproveita `direcao_aprovacoes` como as outras filhas (fábrica, vendas, autorizados).
