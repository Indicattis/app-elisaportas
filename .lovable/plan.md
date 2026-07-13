## Correções nas regras de venda

### 1. Inverter regra do intervalo de boleto por valor

Estado atual: `total <= valorLimiteFlex` libera `[21,36,42]`, `> valorLimiteFlex` trava em `[21]`.

Novo comportamento: `total > valorLimiteFlex` libera flex, `<= valorLimiteFlex` trava em padrão.

- `src/utils/boletoRegra.ts` — `getIntervalosBoletoPermitidos`: trocar comparador para `valorTotal > config.valorLimiteFlex ? intervalosFlex : [intervaloPadrao]`.
- `validarRegraBoleto` — inverter a mensagem: "Vendas até R$ X exigem intervalo de N dias".
- `src/pages/direcao/RegrasVendasDirecao.tsx` — atualizar texto explicativo do acordeão Boleto ("> R$ X: intervalos flexíveis; ≤ R$ X: só padrão").
- `src/components/vendas/PagamentoSection.tsx` — se houver texto/banner descrevendo a regra, inverter.

### 2. Janela de ±N dias para data de pagamento

Nova regra aplicada a todo `data_pagamento` (À Vista, Boleto, Cartão, Dinheiro): a data deve estar entre `hoje - N` e `hoje + N`. Padrão N=5, configurável.

**Banco** (`regras_vendas`):
- `pagamento_data_janela_dias integer NOT NULL DEFAULT 5`

**Hook** `src/hooks/useRegrasVendas.ts`:
- Adicionar campo ao tipo e expor em `limites.pagamentoDataJanelaDias`.

**Validação** — criar helper `src/utils/dataPagamentoRegra.ts` com:
- `getJanelaDataPagamento(janelaDias)` → `{ min: Date, max: Date }` (usando padrão de fuso T12:00:00 do projeto).
- `validarDataPagamento(dataISO, janelaDias)` → `{ ok } | { ok:false, mensagem }`.
- `validarDatasPagamento(pagamento, janelaDias)` percorre os métodos e o campo global.

**Consumo no cadastro** `src/pages/vendas/VendaNovaMinimalista.tsx`:
- Antes de submeter, chamar `validarDatasPagamento` com `limites.pagamentoDataJanelaDias`. Bloquear com toast.

**UI** `src/components/vendas/MetodoPagamentoCard.tsx` e `PagamentoSection.tsx`:
- Aceitar prop opcional `dataPagamentoJanelaDias` e aplicar `min` / `max` no `<Input type="date">` de data de pagamento em cada método.
- Texto auxiliar: "Somente entre {min} e {max}".

**Página de regras** `src/pages/direcao/RegrasVendasDirecao.tsx`:
- Adicionar campo numérico "Janela de data de pagamento (± dias)" no bloco de Formas de Pagamento (ou criar seção "Datas") ligado a `draftRegras.pagamento_data_janela_dias`. Texto: "Permite lançar pagamentos até N dias antes ou depois de hoje".

### Fora de escopo
- Nenhuma mudança em vendas já cadastradas / edição de venda existente.
- Nenhuma outra alteração de desconto ou split.

### Memória
Atualizar `mem://business-rules/sales/boleto-70-30-21d`: inverter direção da regra dos 60k (`>60k` libera flex). Adicionar nota curta sobre janela ±5 dias configurável em `regras_vendas.pagamento_data_janela_dias`.
