## Showcase abaixo do controlador de abas em `/direcao/estrategia/kits`

Adicionar, em cada aba, um cartão showcase logo abaixo do TabsBar (e acima do conteúdo principal), respeitando a largura atual do conteúdo e o estilo glassmorphism.

### Aba Portas — média entre todos os kits ativos
- Fonte: `tabela_precos_portas` (apenas `ativo = true`).
- Para cada kit: `lucro_pct = lucro / valor_porta * 100`, `custo_pct = 100 - lucro_pct`. Ignorar linhas com `valor_porta <= 0`.
- Mostrar:
  - Ícone `Package` + título "Média dos kits de portas".
  - Subtítulo: "Baseado em N kits ativos".
  - Dois blocos lado a lado (mesmo padrão do preview do `ConfigLucroEstatico`):
    - "Custo médio" — `XX,X%`
    - "Lucro médio" — `XX,X%` (verde)

### Abas Instalações e Pinturas — config atual + exemplo R$ 1.000
- Fonte: `config_lucro` via `useConfigLucro(tipo)` (já usado pelo `ConfigLucroEstatico`).
- Mostrar:
  - Ícone `Wrench` / `Paintbrush` + título "Configuração ativa — Instalação" / "Pintura epóxi".
  - Subtítulo curto: "Aplicado no faturamento das vendas vinculadas".
  - Quatro blocos compactos:
    - Custo% (config), Lucro% (config), Custo de exemplo (R$ 1.000 × custo%), Lucro de exemplo.
- Para pintura no modo `formula_dimensao`: mostrar a fórmula "lucro = altura × largura × R$ X,XX" e usar 3,00 × 2,50 m como exemplo (mesmas constantes do preview), ao invés dos cálculos por percentual.

### Estrutura técnica
- Novo componente `src/components/direcao/KitsShowcaseCard.tsx` com props `{ tab: 'portas' | 'instalacoes' | 'pinturas' }`.
  - Internamente:
    - `portas`: query `useQuery(['kits-showcase-medias'], …)` lendo `tabela_precos_portas` (id, valor_porta, lucro, ativo).
    - `instalacoes`: `useConfigLucro('instalacao')`.
    - `pinturas`: `useConfigLucro('pintura_epoxi')`.
  - Estados loading com skeleton suave (mesmo padrão de bg-white/5 com pulse).
- Em `EstrategiaKits.tsx`:
  - Renderizar `<KitsShowcaseCard tab={active} />` logo após o `tabsBar`.
  - Na aba Portas: passar via nova prop `afterTabsBar` (ou reaproveitar `beforeContent` adicionando o showcase junto do TabsBar) para o `TabelaPrecos`.
  - Nas abas Instalações/Pinturas: inserir entre `{tabsBar}` e o bloco `key={active}` existente, dentro do mesmo `animate-fade-in` (anima junto com a troca).
- Estilo: cartão único `rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-4` com mini-blocos internos `rounded-lg border border-white/10 bg-black/30 p-3`, e variante esmeralda para lucro (igual ao preview existente). Sem novas cores fora do design system.

### Fora do escopo
- Nenhuma alteração na regra de negócio de cálculo de lucro/custo no faturamento.
- Sem mudanças no header, breadcrumb ou largura do conteúdo.
- Sem novas tabelas/migrations.