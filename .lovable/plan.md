## Adicionar taxas (%) na página `/direcao/estrategia/itens`

Adicionar 3 campos percentuais editáveis por item que reduzem o lucro: **Impostos**, **Cartão**, **Descontos**. O lucro real passa a considerar essas deduções.

### 1. Banco
Migration adicionando 3 colunas em `public.estoque`:
- `taxa_impostos numeric NOT NULL DEFAULT 0`
- `taxa_cartao numeric NOT NULL DEFAULT 0`
- `taxa_descontos numeric NOT NULL DEFAULT 0`

(percentuais, ex.: `8.5` = 8,5%)

### 2. Hook `useEstoque.ts`
- Incluir `taxa_impostos`, `taxa_cartao`, `taxa_descontos` em `ProdutoEstoque` e `ProdutoEstoqueInput`.

### 3. UI em `ProdutosFabrica.tsx` (somente quando `showPrecoVenda`)
Adicionar 3 novas colunas editáveis (tipo percent) **entre "Preço de Venda" e "Lucro"**:

| Preço/Un | Unidade | Preço de Venda | Impostos % | Cartão % | Descontos % | Lucro |

- Cada coluna usa `EditableCell` salvando o respectivo campo via `onUpdateField`.
- O cálculo do **Lucro** muda para:

```text
deducoes = preco_venda * (taxa_impostos + taxa_cartao + taxa_descontos) / 100
lucro    = preco_venda - deducoes - custo_unitario
```

Mantém estilo verde/vermelho conforme sinal. Colunas só aparecem quando `showPrecoVenda=true` (não afeta `/fabrica/produtos`).

### 4. Página `EstrategiaItens.tsx`
Sem mudanças — já passa `showPrecoVenda`.

### Arquivos afetados
- `supabase/migrations/*_add_taxas_estoque.sql` (novo)
- `src/hooks/useEstoque.ts`
- `src/pages/direcao/estoque/ProdutosFabrica.tsx`
