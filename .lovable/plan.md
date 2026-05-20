# Correção da venda 33af14d6 e prevenção

## Problema confirmado
Os 2 itens `pintura_epoxi` da venda têm `valor_produto = 970` **e** `valor_pintura = 970` (mesmo valor duplicado), inflando a base em R$ 1.940 e mascarando o desconto real (~70% efetivo, mostrado como ~49%).

## Etapa 1 — Corrigir os dois itens dessa venda

Migration de dados (UPDATE) zerando `valor_produto` apenas nos itens pintura_epoxi dessa venda:

```sql
UPDATE produtos_vendas
SET valor_produto = 0
WHERE venda_id = '33af14d6-5fe4-4746-9b7c-a95aa9731449'
  AND tipo_produto = 'pintura_epoxi'
  AND valor_produto = valor_pintura;
```

Não altero `desconto_valor` nem `valor_venda` — o desconto absoluto em R$ permanece o mesmo (R$ 3.151). Apenas o **percentual exibido** passa a refletir a realidade (~70% sobre R$ 4.486), tornando visível que esse desconto excede e muito o limite máximo de 13% (8% + 5% master).

## Etapa 2 — Varredura de vendas legadas com o mesmo bug

Antes de aplicar o UPDATE pontual, rodo um SELECT diagnóstico para listar todas as outras vendas afetadas:

```sql
SELECT venda_id, COUNT(*) 
FROM produtos_vendas 
WHERE tipo_produto IN ('pintura_epoxi','instalacao')
  AND valor_produto > 0 
  AND valor_produto = COALESCE(valor_pintura,0) + COALESCE(valor_instalacao,0)
GROUP BY venda_id;
```

Se aparecer um volume pequeno, aplico o mesmo fix em lote. Se for grande, paro e te mostro a lista antes de decidir.

## Etapa 3 — Trigger de validação no banco

Adiciono um trigger `BEFORE INSERT OR UPDATE` em `produtos_vendas` que força:
- `tipo_produto = 'pintura_epoxi'` → `valor_produto = 0`, `valor_instalacao = 0` (só `valor_pintura`)
- `tipo_produto = 'instalacao'` → `valor_produto = 0`, `valor_pintura = 0` (só `valor_instalacao`)

Isso impede que qualquer caminho (UI nova, edição manual, scripts) reintroduza a duplicação.

## Etapa 4 — Auditoria do código

Busco no front os locais que criam itens `pintura_epoxi` / `instalacao` (provavelmente em `useProdutosVenda`, modais de adicionar pintura/instalação e fluxos de criação/edição de venda) para garantir que estão enviando `valor_produto = 0`. Se algum estiver duplicando, ajusto.

## Fora de escopo
- Não recalculo nem reembolso o desconto dessa venda (decisão comercial sua).
- Não toco em `valor_venda`, `custo_total` ou `lucro_total` — esses serão recalculados naturalmente no faturamento.

Confirma para eu rodar?
