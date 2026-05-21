## Mudanças em `/direcao`

### 1. `src/pages/direcao/DirecaoHub.tsx`
- Renomear label "Caixa Elisa" → **"Capital de Giro Elisa"**.
- Remover item **CRM**.
- Remover itens **Faturamento** e **Metas** (vão para o novo hub Financeiro).
- Remover item **Autorizados** (vai para o hub Aprovações).
- Adicionar item **Financeiro** (ícone `Wallet` ou `Banknote`) apontando para `/direcao/financeiro`, routePrefix `direcao_financeiro` (com fallback de acesso aberto).
- Adicionar suporte a uma variante visual "dourado fraco" no `renderButton`: aplicar a Estratégia e Capital de Giro Elisa um gradiente sutil dourado, ex.: `from-amber-700/70 to-yellow-800/70 border-amber-500/30 shadow-amber-600/20 hover:from-amber-600/70 hover:to-yellow-700/70`.

Ordem final dos botões:
1. Estratégia (dourado fraco)
2. Capital de Giro Elisa (dourado fraco)
3. Vendas
4. DRE
5. Financeiro (novo)
6. Checklist Liderança
7. Gestão de Fábrica
8. Gestão de Instalações
9. Gestão de Frotas
10. Estoque
11. Aprovações
12. Organograma RH

### 2. Novo arquivo `src/pages/direcao/financeiro/DirecaoFinanceiroHub.tsx`
- Hub no mesmo padrão visual do `DirecaoAprovacoesHub` (fundo preto, partículas, breadcrumb, botão voltar, FloatingProfileMenu, botões azuis em gradiente).
- Header com ícone `Wallet` e título "Financeiro".
- Breadcrumb: Home › Direção › Financeiro.
- Itens:
  - **Faturamento** (`DollarSign`) → `/direcao/faturamento`
  - **Metas** (`Target`) → `/direcao/metas`

### 3. `src/App.tsx`
- Importar `DirecaoFinanceiroHub`.
- Adicionar rota `/direcao/financeiro` protegida com `routeKey="direcao_hub"` (mantendo o mesmo padrão dos demais).

### 4. `src/pages/direcao/aprovacoes/DirecaoAprovacoesHub.tsx`
- Adicionar novo item **Autorizados** (ícone `Users`, sem badge de contagem) apontando para `/direcao/autorizados`, mantendo o item existente **Aprovações Autorizados** intacto.

### Observações
- As rotas `/direcao/faturamento`, `/direcao/metas` e `/direcao/autorizados` continuam funcionando — apenas mudam os pontos de entrada no hub.
- Não há alteração de lógica de negócio nem de permissões existentes.
