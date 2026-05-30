## Objetivo

Destacar a tabela de "Produtos da Venda" em `/direcao/vendas/:id` e garantir que a coluna **Tipo** mostre a mesma categoria de faturamento usada em `/financeiro/faturamento/:id` (Porta de Enrolar, Pintura Epóxi, Instalação, Manutenção, Acessório, Adicional, Serviço, etc.).

## Mudanças (apenas `src/pages/direcao/VendaDetalhesDirecao.tsx`)

### 1. Atualizar o mapa de tipos em `getTipoProdutoBadge`
Hoje o mapa só cobre 5 tipos (`porta_enrolar`, `porta_seccionada`, `porta_rapida`, `servico`, `acessorio`) e cai no fallback genérico para o resto, o que faz itens como `pintura_epoxi`, `instalacao`, `manutencao`, `adicional` aparecerem com o slug cru. Vou alinhar com `formatTipoProduto` da página de faturamento, cobrindo:

- `porta_enrolar` → "Porta de Enrolar" (azul)
- `porta_social` → "Porta Social" (índigo)
- `porta_seccionada` → "Porta Seccionada" (roxo)
- `porta_rapida` → "Porta Rápida" (laranja)
- `pintura_epoxi` → "Pintura Epóxi" (amarelo)
- `instalacao` → "Instalação" (ciano)
- `manutencao` → "Manutenção" (esmeralda)
- `servico` → "Serviço" (verde)
- `acessorio` → "Acessório" (cinza)
- `adicional` → "Adicional" (rosa)

Assim a coluna Tipo passa a representar exatamente a categoria de faturamento do item.

### 2. Destacar visualmente a tabela de Produtos da Venda
- Trocar o `Card` atual (`bg-white/5 border-blue-500/10`) por um container com gradiente sutil + borda mais marcante: `bg-gradient-to-br from-blue-500/10 via-white/5 to-transparent border-blue-400/30 shadow-[0_0_40px_-15px_rgba(59,130,246,0.4)]`.
- Cabeçalho da seção: aumentar tipografia (`text-base` em vez de `text-sm`), ícone `Package` em quadrado destacado (`p-2 rounded-lg bg-blue-500/20`), título com gradiente azul→branco.
- `TableHeader` com `bg-white/[0.04]`, texto em `text-white/80 uppercase tracking-wider font-semibold`.
- Linhas (`TableRow`) com `hover:bg-blue-500/10 transition-colors` e divisor mais visível (`border-white/10`).
- Aumentar densidade tipográfica da tabela de `text-xs` para `text-sm` nas células principais e manter os badges de Tipo com `font-medium`.
- Coluna **Total** em destaque: `text-base font-semibold text-emerald-400`.

### 3. Sem mudanças em dados/lógica
Nenhuma alteração de query, schema, RLS, ou regra de negócio. Apenas mapeamento de labels e estilos Tailwind.

## Fora de escopo
- Página de faturamento permanece intocada.
- Demais tabelas/cards da página de detalhes ficam como estão.
