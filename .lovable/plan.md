## Contexto

Na venda `12bda7ce-...` a tabela de produtos do `/financeiro/faturamento/...` mostra dois valores na coluna **Desconto** (R$ 189,65 e R$ 1.014,35). Investiguei o banco:

- `produtos_vendas.desconto_valor` está **positivo** nas duas linhas (somam R$ 1.204).
- `valor_total = base − desconto_valor` → soma 3.240 = `vendas.valor_venda` − frete. Ou seja, no banco, esta venda está gravada como **desconto** de ~27%, não acréscimo.
- O fluxo de venda (`VendaNovaMinimalista.tsx → portasComAjusteGlobal`) salva acréscimo como `desconto_valor` **negativo** (sinal = −1). Não há coluna separada de acréscimo em `produtos_vendas`.

Conclusão: hoje a coluna "Desconto" do `FaturamentoProdutosTable` exibe `desconto_valor` independente do sinal. Quando o vendedor aplica acréscimo (negativo) ele apareceria como "−R$ X" rotulado como Desconto — confuso. E quando é desconto real (como nesta venda), aparece como desconto mesmo.

## O que o plano vai fazer

### 1. `src/components/vendas/FaturamentoProdutosTable.tsx`
- Renomear o header da coluna para **"Desc. / Acrésc."**.
- Detectar sinal de `desconto_valor` (ou `desconto_percentual`):
  - `> 0` → "Desconto" em vermelho/laranja com prefixo `−`.
  - `< 0` → "Acréscimo" em âmbar com prefixo `+` (mostrando valor absoluto).
  - `= 0` → `−`.
- Exibir badge pequeno ("Desc." / "Acrésc.") junto do valor para deixar a natureza do ajuste explícita.

### 2. Verificação dos dados desta venda
Após o ajuste visual, esta venda continuará mostrando **Desconto** porque é o que está gravado no banco. Antes de eu codar, preciso confirmar com você:

## Pergunta para você

Você tem certeza de que o vendedor aplicou **Acréscimo** nesta venda específica? Pelos dados gravados (`desconto_valor` positivo, `valor_venda` = base − 1.204), o sistema salvou como **Desconto** de 27%.

- **Se o vendedor realmente aplicou acréscimo** → existe bug na hora de salvar (sinal invertido) e o plano precisa incluir investigação/correção do fluxo de criação da venda.
- **Se foi mesmo desconto** → só faço o ajuste da tabela (rótulo "Desc. / Acrésc." com sinais corretos) para evitar confusões em vendas futuras com acréscimo.

Me confirme qual cenário antes de eu implementar.
