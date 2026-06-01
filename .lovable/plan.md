## Problema

Em `/vendas/minhas-vendas/nova`, ao adicionar um item de catálogo como **Meia cana lisa - 0,70mm** (cadastrado em `custos_itens.unidade = 'M'` com `preco_venda = 11,00/m`), o sistema trata o item como unitário e cobra R$ 11,00 por peça, ignorando o tamanho real. O custo e o lucro do item são calculados por metro na Estratégia, então a venda precisa usar a mesma base.

Causa: em `src/components/vendas/SelecionarAcessoriosModal.tsx` a checagem é literal:

```ts
['metro', 'kg', 'litro'].includes((item.unidade || '').toLowerCase())
```

As unidades reais no banco são `'M'`, `'Un'`, `'UN'` (e o utilitário `utils/unidadesMedida.ts` já normaliza `m`, `kg`, `l`, `m2`, `g`, `ml`, `cm` como decimais via `discreta=false`). Como `'m'` ≠ `'metro'`, o item cai no ramo "unitário" e perde o campo Tamanho.

## Solução

Trocar a heurística literal pelo helper já existente `getUnidade(unidade).discreta` de `src/utils/unidadesMedida.ts`, que cobre todas as variações (`M`, `metro`, `m²`, `kg`, `l`, etc.) e devolve a abreviação correta.

### Alterações em `src/components/vendas/SelecionarAcessoriosModal.tsx`

1. Importar `getUnidade` de `@/utils/unidadesMedida`.
2. Substituir todas as 4 ocorrências de `['metro','kg','litro'].includes(...)` por `!getUnidade(item.unidade).discreta` (item decimal = não discreto e diferente de `un`/`pc`/`rolo`/`cx`/`bobina`).
3. Substituir o bloco manual de `unidadeLabel` (`metro→m`, `kg→kg`, `litro→L`) por `getUnidade(item.unidade).abreviacao`.
4. Manter a fórmula `valorUnitario = preco * tamanho` quando decimal — agora `preco_venda` (R$/m) × tamanho (m) gera o valor correto da linha, igual ao usado para custo/lucro na Estratégia.

Nenhuma mudança em hooks, banco ou no `ProdutoVendaForm`/`TabelaProdutosVendidos` — eles já recebem `unidade` no payload e renderizam via os mesmos helpers.

## Validação

- Selecionar **Meia cana lisa - 0,70mm** (unidade `M`, R$ 11,00/m) no modal → deve exibir campo Tamanho obrigatório com sufixo `m`, e a linha gravada deve ter `valor_produto = 11 × tamanho` e `valor_total = valor_produto × quantidade`.
- Itens com unidade `Un`/`UN` continuam sem campo Tamanho (comportamento atual preservado).
- `bunx tsc --noEmit` limpo.
