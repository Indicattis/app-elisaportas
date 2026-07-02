Adicionar três índices visíveis na `/home` (página inicial central com os botões de módulos): **Faturamento atual do mês**, **Autorizados com contratos** e **Autorizados sem contratos**.

### O que será feito

1. **Novo hook de dados** — criar `src/hooks/useHomeIndices.ts` com três consultas agregadas (ou uma única queryFn paralela):
   - **Faturamento do mês:** reutilizar a fórmula canônica `calcularFaturamentoLiquido` e o filtro `isVendaValida` (vendas >= R$ 500, excluindo rascunhos/testes). Buscar vendas do mês atual (`data_venda` entre início e fim do mês), somar `valor_venda + valor_credito - valor_frete`.
   - **Autorizados com contratos:** contar `autorizados` ativos (`ativo = true`) onde `contrato_url IS NOT NULL`.
   - **Autorizados sem contratos:** contar `autorizados` ativos (`ativo = true`) onde `contrato_url IS NULL`.

2. **Integrar em `src/pages/Home.tsx`** — exibir os três índices como cards estilizados logo acima da lista de botões de módulos (ou dentro da seção "Acesso Rápido", a depender do encaixe visual). Os cards seguirão o design glassmorphism já existente na página: `bg-white/5`, `backdrop-blur-xl`, `border-white/10`, texto branco/azul.

3. **Ícones e layout** — usar ícones do lucide-react (ex.: `TrendingUp`, `FileCheck`, `FileX`) em cards de 3 colunas no desktop, empilhados no mobile, respeitando a responsividade atual da página.

4. **Verificação de permissões** — antes de implementar, confirmar se as RLS policies de `vendas` e `autorizados` permitem leitura para todos os usuários autenticados. Caso contrário, propor ajuste mínimo de políticas (sem abrir dados sensíveis) ou exibir os cards apenas para perfis com acesso, conforme a preferência do usuário.

### Arquivos afetados

- `src/hooks/useHomeIndices.ts` (novo)
- `src/pages/Home.tsx` (edição)
- `src/utils/faturamentoCalc.ts` (já existente, apenas reutilizado)

### Critério de aceitação

- Na `/home`, o usuário vê três cards com os valores atualizados: faturamento líquido do mês, total de autorizados com contrato e total de autorizados sem contrato.
- Os números utilizam os cálculos e filtros já consolidados no projeto (sem criar lógica divergente).
- O layout mantém a estética atual da página inicial (escura, glassmorphism) e funciona em mobile.