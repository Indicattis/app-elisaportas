## Objetivo

Na tela `/direcao/vendas/todas`, inverter a exibição da coluna **Temperatura** para que:
- `temperatura = true` → **Fria** (azul, ❄️)
- `temperatura = false` → **Quente** (laranja, 🔥)

Os valores no banco **não serão alterados** — só muda o que aparece na tela e no toggle desta página.

## Alterações

Arquivo: `src/pages/direcao/VendasDirecao.tsx`

1. **Renderização da célula (linhas ~771-774)** — trocar as condições:
   - `isFrio = venda.temperatura === true` (antes: `=== false`)
   - `isQuente = venda.temperatura === false` (antes: `=== true`)
   - Labels e cores seguem esses novos flags.

2. **Toast do toggle (linha ~159)** — inverter mensagem:
   - `novo ? 'Marcada como Fria' : 'Marcada como Quente'`

3. **Ordenação da coluna (linha ~415)** — sem mudança funcional necessária; a ordenação continua agrupando por valor booleano.

4. **`aptoFrio` (linha ~99)** — manter como está (`temperatura === false`) **ou** inverter? Preciso confirmar isto no próximo passo — essa variável parece controlar cálculo de desconto, não é exibição. **Vou deixar como está**, pois o usuário pediu apenas correção da exibição da coluna.

## Fora do escopo

- Não altero outras telas (faturamento, vendas novas, edição, etc.).
- Não altero migração ou dados no banco.
- Não altero lógica de desconto de venda fria.
