## Nova linha "Desconto Excedido" na tabela do DRE

Adicionar uma linha entre "Faturamento" e "Lucro" na tabela principal do DRE (`/direcao/estrategia/dre/:mes`) mostrando o desconto que ultrapassou os limites configurados de cada venda. O valor é debitado do Lucro.

### Cálculo (reusa lógica já existente do modal Portas)

Para cada venda do mês:
1. Soma base (`valor_produto + valor_pintura + valor_instalacao`) × quantidade de todos os itens.
2. Soma desconto de todos os itens.
3. `pctDado = totalDesconto / totalBase * 100`.
4. Limite permitido = `limite_desconto_avista` (se À Vista/não-cartão) + `limite_desconto_presencial` (se `temperatura=false`) + `limite_adicional_responsavel` (se ultrapassou limite base).
5. Excedido da venda = `max(0, pctDado − limite) / 100 × totalBase`.

O excedido de cada venda é rateado entre seus itens proporcionalmente ao valor bruto do item, e cada item contribui para a coluna correspondente ao seu `tipo_produto`:
- `porta_enrolar`, `porta_social` → coluna **Portas**
- `pintura` → coluna **Pintura**
- `instalacao` → coluna **Instalações**
- demais → coluna **Itens Avulsos**
- Fretes: coluna não recebe excedido (frete é rateado à parte).
- Total: soma das colunas.

### Alterações

**`src/pages/direcao/DREMesDirecao.tsx`** (única mudança):

1. Ampliar a query já feita para o modal Portas para trazer TODOS os produtos das vendas do mês (não só portas), com `tipo_produto` e vinculado a `vendas.data_venda` no período. Reaproveitar `configuracoes_vendas` e a mesma fórmula de excedido por venda.
2. Calcular um objeto `descontoExcedido = { portas, pintura, instalacoes, fretes: 0, avulsos, total }` no mesmo bloco onde `faturamento` e `lucro` são montados.
3. Renderizar nova linha `<tr>` na tabela (linha ~1845, antes da linha "Lucro"):
   - Label: "Desconto Excedido" (mesmo estilo das outras labels).
   - Cada coluna mostra `formatCurrency(descontoExcedido[col.key])` em vermelho (`text-red-400`); mostra "—" se zero.
4. Subtrair `descontoExcedido[col.key]` do cálculo do Lucro em cada coluna (linhas 1847–1861) e da Margem % (linhas 1863–1882).
5. Ajustar também `lucroLiquidoFinal` para descontar `descontoExcedido.total` (linhas 1750–1761), mantendo consistência no resumo final e no PDF.
6. Refletir a nova linha no `PrintReport` (PDF do DRE) espelhando a mesma linha/coluna e valores.

### Fora do escopo

- Sem alterações no modal de Portas (já mostra "Excedido" por item).
- Sem alterações em `dre_realizados` (o valor é calculado, não persistido).
- Sem mudanças em outras páginas (`/direcao/vendas/…`).

### Verificação

- Somatório de "Desconto Excedido" na coluna Total deve bater com a soma de `excedido` do modal de Portas + equivalentes dos outros tipos.
- Lucro de cada coluna após a mudança = Lucro antigo − Desconto Excedido dessa coluna.
