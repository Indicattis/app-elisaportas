## Adicionar página read-only de Regras de Vendas no hub /direcao/vendas

### 1. Novo item no menu do hub
Arquivo: `src/pages/direcao/VendasHubDirecao.tsx`
- Adicionar item em `menuItems`:
  - label: "Regras de Vendas"
  - icon: `BookOpen` (lucide-react)
  - path: `/direcao/vendas/regras`
  - routePrefix: `direcao_vendas`
- Posicionar antes de "CRM".

### 2. Nova página read-only
Arquivo novo: `src/pages/direcao/RegrasVendasView.tsx`
- Reaproveita `useRegrasVendas()` para ler os valores atuais.
- Layout no padrão `MinimalistLayout` com breadcrumbs Home › Direção › Vendas › Regras de Vendas e `backPath="/direcao/vendas"`.
- Renderiza todas as regras em cards/acordeões seguindo a mesma estrutura visual de `RegrasVendasDirecao.tsx`, mas:
  - Sem inputs editáveis, sem `draftRegras`, sem botão salvar.
  - Cada valor exibido como texto/label (ex.: "Limite desconto à vista: 3%").
  - Blocos: Descontos, Acréscimo, Boleto (inclui regra dos 60k invertida, entrada mínima, parcelas máx, intervalos), Cartão, À vista, Data de Pagamento (janela ±N dias), Campos obrigatórios, Formas de pagamento.
- Se `isLoading`, mostra skeleton simples; se sem dados, mensagem "Nenhuma regra configurada".

### 3. Rota
Arquivo: `src/App.tsx` (ou onde estão as rotas de direção)
- Registrar `<Route path="/direcao/vendas/regras" element={<RegrasVendasView />} />` dentro do mesmo wrapper de proteção usado pelas demais rotas `/direcao/vendas/*`.

### Fora de escopo
- Não alterar a página editável existente (`/direcao/estrategia/precos/regras-vendas`).
- Nenhuma mudança de regra de negócio ou schema.
