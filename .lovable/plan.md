## Objetivo

Em `/vendas/minhas-vendas/nova`, quando o vendedor adiciona um item do catálogo, a **quantidade** deve ser expressa na **unidade cadastrada do item** (igual ao custo/lucro). Ex: "Meia cana lisa 0,70mm" está em metro → o vendedor digita `2,5` (metros), e o sistema calcula `valor_total = preço_venda × 2,5`. Sem campo "Tamanho" separado.

## Comportamento

- Itens com unidade **decimal** (m, m², cm, kg, g, l, ml): campo "Qtd" aceita decimais (`step=0,01`), mostra a abreviação da unidade ao lado, e remove o campo "Tamanho".
- Itens com unidade **discreta** (un, rolo, cx, pç, bobina): permanece inteiro (`step=1`, mín 1).
- `valor_produto` armazenado = `preço_venda` (unitário puro, sem multiplicar por tamanho). `quantidade` carrega o número real (decimal quando aplicável). O total continua sendo `valor_produto × quantidade`.

## Mudanças de UI

### `src/components/vendas/SelecionarAcessoriosModal.tsx`
- Remover a coluna **Tamanho** e os estados `tamanhos` / validações `temItemDecimalSemTamanho` / `semTamanho`.
- Campo "Qtd" passa a usar `step`/`min` baseados em `getUnidade(item.unidade).discreta` (decimal → `0.01`, inteiro → `1`), com `parseFloat` no onChange.
- Mostrar a abreviação da unidade (m, kg, L…) ao lado do input de qtd quando decimal.
- Ao confirmar: `valor_produto = item.preco` (sem multiplicar por tamanho); `quantidade = qtd` (decimal); `tamanho = ''`.

### `src/components/vendas/ProdutosVendaTable.tsx`
- No input de quantidade da linha, quando `isCatalogoDecimal`, usar `step="0.01"`, `min="0.01"` e `parseFloat`; caso contrário manter `step=1`/`parseInt`.
- Remover a célula "Tamanho" especial para itens de catálogo decimal (passa a mostrar `—`) — a quantidade já carrega o valor na unidade.
- `valorUnitDisplay` passa a ser sempre `valor_produto + valor_pintura + valor_instalacao` (não dividir por `tamanho`). Mantém o sufixo `/m`, `/kg`, `/L` quando decimal.
- `valorBase` continua `(valor_produto + valor_pintura + valor_instalacao) * quantidade`.

### `src/components/vendas/ProdutoVendaForm.tsx`
- Em `handleAcessorioChange` / `handleAdicionalChange`: manter `valor_produto = preco_venda` (já é assim) e setar `unidade`.
- Adicionar campo "Quantidade" no formulário com `step` dinâmico conforme a unidade (decimal vs inteiro), exibindo a abreviação ao lado.

## Pontos preservados

- `useVendas.ts`: itens não-porta já salvam 1 linha com `quantidade` real — funciona para decimais (coluna numérica). Sem mudança.
- Recalcular total (`recalcularValorTotal`, `subtotalProdutosMemo`, etc.) já usa `valor_produto * quantidade` — sem mudança.
- Pintura, porta enrolar, porta social, instalação e manutenção: sem mudança.
- Não alterar página de orçamentos nem demais telas (`VendaEditarMinimalista`, `MinhasVendasEditar`, etc.) nesta entrega — escopo é `/vendas/minhas-vendas/nova`.

## Compatibilidade com vendas antigas

Vendas legadas gravaram `valor_produto = preço × tamanho` e `quantidade` inteira. Como esta mudança é só na criação, não há migração de dados. A `ProdutosVendaTable` é compartilhada com edição, então o cálculo de `valorUnitDisplay` precisa de fallback: se houver `tamanho` numérico > 0 **e** `quantidade` for inteira, manter divisão atual (legado); caso contrário usar o novo cálculo direto.
