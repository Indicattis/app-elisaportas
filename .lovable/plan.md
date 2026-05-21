# Corrigir cadastro de produto em `/vendas/minhas-vendas/editar/:id`

## Problemas reportados

1. **Não é possível adicionar observação por produto** na tabela de produtos. A página `/nova` permite (lápis/popover na coluna "Observação"), a `/editar` não.
2. **Valores calculados diferem** entre as duas páginas para o mesmo conjunto de produtos.

## Causas

Em `src/pages/vendas/MinhasVendasEditar.tsx`:

- O `<ProdutosVendaTable>` (linha ~1139) **não recebe** a prop `onUpdateObservacao`, então o componente esconde o popover de edição e mostra apenas texto somente leitura. Em `/nova` essa prop é passada (linha 699 de `VendaNovaMinimalista.tsx`).
- O mapeamento `produtosFormatados` (linhas 187–205) **descarta campos** que o `ProdutosVendaTable` e o `VendaResumo` usam para identificar tipo/unidade/observação:
  - `observacao_item` (não é copiado → coluna sempre vazia mesmo quando há observação salva no banco)
  - `vendas_catalogo_id` e `valor_credito` (afeta agrupamento e exibição de crédito por item no resumo)
  - `tipo_produto` é cast para `'porta' | 'acessorio' | 'adicional'`, perdendo `porta_enrolar`, `porta_social`, `pintura_epoxi`, `manutencao`, `instalacao` → o `Badge` cai no `default` e a coluna "Detalhes" não reconhece as portas novas, que dependem de `'porta_enrolar'`/`'porta_social'` para mostrar `largura x altura`. Isso explica a divergência visual nos valores e detalhes versus `/nova`, onde os tipos são preservados.
  - `unidade` recebe fallback `'Unitário'` em vez do valor real vindo do catálogo (já carregado pelo hook `useProdutosVenda` via join `vendas_catalogo`), o que altera o cálculo de "valor unitário" para itens decimais (metro/kg/litro) na coluna `Valor Unit.`.

A fórmula em si (`(valor_produto + valor_pintura + valor_instalacao) * quantidade − desconto`) é idêntica entre `/nova`, `ProdutosVendaTable` e `VendaResumo`; a divergência percebida vem desses campos perdidos no mapeamento.

## Mudanças propostas (apenas `src/pages/vendas/MinhasVendasEditar.tsx`)

1. **Atualizar `produtosFormatados`** para preservar todos os campos relevantes vindos do hook `useProdutosVenda`:
   - Manter `tipo_produto` como veio do banco (tipo `ProdutoVenda['tipo_produto']`), sem cast restritivo.
   - Adicionar: `observacao_item`, `vendas_catalogo_id`, `valor_credito`, `valor_frete`, `descricao_manutencao` (quando existir).
   - Trocar `unidade: (p as any).unidade || 'Unitário'` por `unidade: (p as any).unidade ?? null` para que o `ProdutosVendaTable` detecte corretamente `metro/kg/litro` (`isCatalogoDecimal`).

2. **Adicionar handler `handleUpdateObservacao`** que persiste no banco:
   ```ts
   const handleUpdateObservacao = async (index, observacao) => {
     const produto = produtos?.[index];
     if (!produto?.id) return;
     await updateProduto({ produtoId: produto.id, updates: { observacao_item: observacao || null } });
   };
   ```

3. **Passar a prop** `onUpdateObservacao={handleUpdateObservacao}` para `<ProdutosVendaTable>` (linha ~1139).

## Fora do escopo

- Hooks, regras de negócio, fórmulas de cálculo (já são as mesmas).
- Layout, persistência, validações.
- Outras páginas (`VendaNovaMinimalista.tsx`, `VendaEditarMinimalista.tsx`).

## Arquivo

- `src/pages/vendas/MinhasVendasEditar.tsx` — única edição.
