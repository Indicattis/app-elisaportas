## Transformar /direcao/vendas em hub

### Mudanças

**1. Novo arquivo `src/pages/direcao/VendasHubDirecao.tsx`**
Hub no estilo do `DirecaoHub.tsx` (mesma estética glassmorphism, breadcrumb, partículas, animações), com 5 botões:
- **Todas as Vendas** (ícone `ShoppingCart`) → `/direcao/vendas/todas`
- **Tabela de Preços** (ícone `DollarSign`) → `/direcao/vendas/tabela-precos`
- **Regras de Vendas** (ícone `BookOpen`) → `/direcao/vendas/regras-vendas`
- **Clientes** (ícone `Users`) → `/direcao/vendas/clientes`
- **CRM** (ícone `ExternalLink`) → abre `https://crm.elisaportas.com` em nova aba (`external: true`, variant `slate`)

Breadcrumb: Home › Direção › Vendas.

**2. `src/App.tsx`**
- Importar `VendasHubDirecao`.
- Trocar a rota `/direcao/vendas` para renderizar `VendasHubDirecao`.
- Adicionar nova rota `/direcao/vendas/todas` renderizando `VendasDirecao` (conteúdo atual preservado).
- Manter inalteradas as rotas `/direcao/vendas/regras-vendas`, `/direcao/vendas/clientes`, `/direcao/vendas/tabela-precos`, `/direcao/vendas/:id` e `/direcao/vendas/:id/editar`.
  - Observação: como `/direcao/vendas/:id` segue existindo, "todas" funciona como segmento literal e não conflita.

**3. `src/pages/direcao/VendasDirecao.tsx` (página "Todas as Vendas")**
- Remover do `headerActions` os botões Tabela de Preços, Regras de Vendas, Clientes e CRM (agora estão no hub). Manter o botão de exportação (PDF/Excel).
- Ajustar navegação de "voltar" / breadcrumb para retornar ao novo hub `/direcao/vendas`.

Nenhuma lógica de negócio é alterada — apenas reorganização de navegação/UI.
