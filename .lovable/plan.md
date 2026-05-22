# Página dedicada de Montagem do Kit

Substituir o `KitMontagemDialog` (modal) por uma rota dedicada em `/direcao/estrategia/kits/:kitId/montagem`, mantendo o mesmo comportamento (adicionar/remover itens, editar quantidade) e adicionando a coluna **Custo unitário** e **Subtotal custo**.

## Mudanças

### 1. Nova rota e página
- Criar `src/pages/direcao/estrategia/EstrategiaKitMontagem.tsx`.
- Registrar rota `/direcao/estrategia/kits/:kitId/montagem` em `src/App.tsx` (mesmo guard das outras rotas de estratégia).
- Layout via `MinimalistLayout` com breadcrumb: Home › Direção › Estratégia › Tabela de Kits › Montagem do {kit}.

### 2. Estrutura da página (Cabeçalho + Tabela + Resumo lateral)

```text
┌───────────────────────────────────────────────────────────┐
│ Cabeçalho do kit (descrição, dimensões, badge ativo)      │
├──────────────────────────────────────┬────────────────────┤
│ Toolbar: + Adicionar item            │  Resumo lateral    │
│                                      │  • Itens: N        │
│ Tabela de itens:                     │  • Custo total     │
│  Item | Categoria | Unidade |        │  • Venda total     │
│  Custo un. | Qtd | Subtotal custo |  │  • Lucro total     │
│  Lucro un. | Subtotal lucro | 🗑     │  • Margem %        │
│                                      │                    │
└──────────────────────────────────────┴────────────────────┘
```

Grid: `lg:grid-cols-3` com tabela em `lg:col-span-2` e resumo em `lg:col-span-1` (sticky `top-4`).

### 3. Dados
- Reaproveitar `useKitMontagem(kitId)` (já expõe items, addItem, updateQuantidade, removeItem, computeLucroUnit).
- Carregar o kit em si via `useTabelaPrecos` (filtrar pelo id) para mostrar descrição/dimensões no cabeçalho.
- Picker de itens reaproveita `useCustosItens` + `Popover/Command` igual ao modal atual.

### 4. Coluna nova: Custo
- `custo_unitario` já vem em `MontagemItem.custo_item.custo_unitario`.
- Exibir `Custo un.` e `Subtotal custo = qtd × custo_unitario`.
- Manter `Lucro un.` e `Subtotal lucro` (via `computeLucroUnit`).

### 5. Remoção do modal
- Em `src/pages/TabelaPrecos.tsx`:
  - Remover import e uso de `KitMontagemDialog`, estado `montagemKit`.
  - Trocar `onClick={() => setMontagemKit(item)}` (linhas 486 e 497) por `navigate(\`/direcao/estrategia/kits/\${item.id}/montagem\`)` usando `useNavigate`.
- Manter o componente `KitMontagemDialog.tsx` por ora não é necessário — pode ser deletado, já que só é usado aqui.

### 6. Estilo
Seguir glassmorphism do projeto: `bg-white/5`, `backdrop-blur-xl`, `border-white/10`, paleta azul/branco, igual ao modal atual.

## Detalhes técnicos
- Hook reutilizado: `useKitMontagem` em `src/hooks/useKitMontagem.ts`.
- Tipo `MontagemItem.custo_item.custo_unitario` já disponível — sem mudanças no hook nem migration.
- Sem mudanças no banco.
- Sem mudanças no `MultasMinimalista.tsx` (escopo separado).
