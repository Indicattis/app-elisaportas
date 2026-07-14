## Diagnóstico

A convenção da coluna `vendas.temperatura` no restante do app é:

- `true` → **Quente**  (ex.: `PagamentoSection.tsx` linha 421: `vendaPresencial ? 'quente' : 'frio'`, `VendaEditarMinimalista.tsx` linha 374: `venda.temperatura ? 'Quente' : 'Fria'`, cálculo de tiers em várias telas usa `venda.temperatura === false` para dizer "apto Frio").
- `false` → **Fria**

Na venda `111ad4b2…` o banco tem `temperatura = true`, então ela é **Quente** — e por isso o cálculo de descontos (tanto o `calcDescontoTiersAplicados` quanto `calcularExcedidoDesconto`, ambos usando `temperatura === false`) corretamente não libera a faixa "Frio".

O problema está **apenas na exibição** em `src/pages/direcao/VendasDirecao.tsx`, que está com o rótulo invertido em dois lugares:

1. **Linhas 980-981** — a célula da coluna Temperatura mostra:
   ```ts
   const isFrio = venda.temperatura === true;   // ❌ invertido
   const isQuente = venda.temperatura === false; // ❌ invertido
   ```
   → uma venda Quente aparece rotulada como "Frio", provocando a impressão de que os descontos deveriam entrar no tier Frio.

2. **Linha 220** — o toast do toggle diz `novo ? 'Marcada como Fria' : 'Marcada como Quente'`, mas `novo` é o valor booleano gravado em `temperatura`, então também está invertido.

Nenhuma outra parte da página nem outras vendas têm bug real de cálculo — a coluna "Excedido" e o tier "Frio" já usam `temperatura === false` (correto). A percepção de "excesso indevido em vendas frias" vem do rótulo trocado.

## Alterações

Arquivo único: `src/pages/direcao/VendasDirecao.tsx`

1. Inverter o mapeamento no `case 'temperatura'` (linhas 980-981):
   ```ts
   const isQuente = venda.temperatura === true;
   const isFrio   = venda.temperatura === false;
   ```
   Mantendo o restante do bloco igual (label, cores, toggle).

2. Corrigir o toast em `toggleTemperatura` (linha 220):
   ```ts
   toast({ title: novo ? 'Marcada como Quente' : 'Marcada como Fria' });
   ```

Depois disso, a venda `111ad4b2…` passa a aparecer como **Quente** na tabela, o excedido/tiers continuam calculados como já estão, e a lista fica consistente com todo o resto do app. Não há necessidade de migração de dados nem de recomputar valores existentes.
