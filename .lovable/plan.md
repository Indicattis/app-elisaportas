## Objetivo

Como o botão "Financeiro" agora vive em `/home` (fora do Administrativo), mover todas as rotas e breadcrumbs do Financeiro de `/administrativo/financeiro/*` para `/financeiro/*`, mantendo redirects para não quebrar links antigos.

## Escopo

Somente as 14 rotas ativas registradas em `src/App.tsx` sob `/administrativo/financeiro`. Rotas legadas com prefixo `/dashboard/administrativo/financeiro/*` (em `Sidebar.tsx`, `ContasPagar.tsx`, `Faturamento.tsx`, `FinanceiroHome.tsx`, `NotasFiscais.tsx`, `EmitirNfe.tsx`, `EmitirNfse.tsx`, `ConfiguracoesFiscais.tsx`) ficam fora — não estão registradas no App e não são alcançáveis pela navegação atual.

## Mapeamento de rotas

```text
/administrativo/financeiro                          → /financeiro
/administrativo/financeiro/faturamento              → /financeiro/faturamento
/administrativo/financeiro/faturamento/vendas       → /financeiro/faturamento/vendas
/administrativo/financeiro/faturamento/produtos     → /financeiro/faturamento/produtos
/administrativo/financeiro/faturamento/:id          → /financeiro/faturamento/:id
/administrativo/financeiro/custos                   → /financeiro/custos
/administrativo/financeiro/custos/:mes              → /financeiro/custos/:mes
/administrativo/financeiro/gastos                   → /financeiro/gastos
/administrativo/financeiro/custo-folha              → /financeiro/custo-folha
/administrativo/financeiro/bancos                   → /financeiro/bancos
/administrativo/financeiro/caixa                    → /financeiro/caixa
/administrativo/financeiro/caixa/gestao             → /financeiro/caixa/gestao
/administrativo/financeiro/caixa/contas-a-receber   → /financeiro/caixa/contas-a-receber
/administrativo/financeiro/caixa/contas-a-pagar     → /financeiro/caixa/contas-a-pagar
```

## Mudanças

**1. `src/App.tsx`**
- Reapontar as 14 `<Route>` acima para o novo prefixo `/financeiro`.
- Adicionar uma rota catch-all de compatibilidade:
  `<Route path="/administrativo/financeiro/*" element={<Navigate to="/financeiro/..." replace />} />`
  implementada via wrapper que pega `useLocation()` e substitui o prefixo, preservando o resto do path e a query string.

**2. `src/pages/Home.tsx`**
- Item "Financeiro" passa a apontar para `/financeiro`.

**3. Hubs e páginas (atualizar `path:` dos cards e itens do `AnimatedBreadcrumb`):**
- `src/pages/administrativo/FinanceiroHub.tsx` — paths dos 8 cards + breadcrumb `{ label: "Financeiro" }` direto (remove o crumb "Administrativo"); botão voltar passa a navegar para `/home`.
- `src/pages/administrativo/FaturamentoHub.tsx` — paths internos + breadcrumb `Financeiro → Faturamento` (sem "Administrativo").
- `src/pages/administrativo/CaixaHub.tsx` — idem.
- `src/pages/administrativo/FaturamentoVendasMinimalista.tsx`
- `src/pages/administrativo/FaturamentoProdutosMinimalista.tsx`
- `src/pages/administrativo/FaturamentoVendaMinimalista.tsx`
- `src/pages/administrativo/CustosGridMinimalista.tsx`
- `src/pages/administrativo/CustosMesMinimalista.tsx`
- `src/pages/administrativo/CustosMinimalista.tsx`
- `src/pages/administrativo/GastosPage.tsx`
- `src/pages/administrativo/CustoFolhaMensal.tsx`
- `src/pages/administrativo/BancosPage.tsx`
- `src/pages/administrativo/GestaoCaixaMinimalista.tsx`
- `src/pages/administrativo/ContasReceberMinimalista.tsx`
- `src/pages/administrativo/ContasPagarMinimalista.tsx`

Em cada uma:
- Substituir literais `'/administrativo/financeiro...'` por `'/financeiro...'` em `navigate(...)`, `to=`, e arrays de menu.
- No `AnimatedBreadcrumb`, remover o item `{ label: "Administrativo", path: "/administrativo" }` e iniciar o trail em `{ label: "Financeiro", path: "/financeiro" }`, mantendo os demais níveis.

**4. Consumidores fora de `/financeiro`** (atualizar literais para o novo prefixo, sem outra mudança):
- `src/components/faturamento/VendasNaoFaturadasHistorico.tsx`
- `src/components/pedidos/VendaPendentePedidoCard.tsx`
- `src/components/pedidos/VendaPendenteFaturamentoCard.tsx`
- `src/components/pedidos/VendaPendenteDetalhesSheet.tsx`

**5. Comentário em `src/components/direcao/estrategia/DespesasResumoTopo.tsx`** — atualizar texto do comentário para "/financeiro/gastos" (sem mudança funcional).

## Fora de escopo

- `routeKey` em `ProtectedRoute` permanece igual (`administrativo_hub`, `admin_gastos`, `admin_bancos`) — sistema de permissões não muda.
- Arquivos não permanecem em `src/pages/administrativo/` (sem renomear/mover arquivos) — só os paths das URLs mudam.
- Nada no banco, nas sidebars legadas ou nas páginas com prefixo `/dashboard/...` muda.

## Verificação

- Build limpa.
- Navegar `/home → Financeiro` chega em `/financeiro` e cada subpágina abre sem 404.
- Abrir `/administrativo/financeiro/caixa/gestao` redireciona para `/financeiro/caixa/gestao`.
- Breadcrumbs nunca mostram "Administrativo" dentro de Financeiro.
