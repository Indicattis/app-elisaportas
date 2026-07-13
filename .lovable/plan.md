## Objetivo
Formalizar as regras de boleto na página `/direcao/estrategia/precos/regras-vendas`, torná-las configuráveis, e garantir que `/vendas/minhas-vendas/nova` respeite as regras carregadas do banco.

## Regras a implementar

1. **Boleto libera 3% à vista** — já funciona no código (`descontoVendasRules.ts` inclui `boleto` no limite base). Apenas documentar/adicionar texto na página de regras.
2. **Intervalos por valor da venda** — venda ≤ R$ 60.000 permite escolher entre `21, 36 ou 42` dias; venda > R$ 60.000 fica travada em `21` dias.
3. **Split obrigatório** — havendo boleto em qualquer método, força `usar_dois_metodos=true`, Método 1 = À Vista com **mínimo 50%** do total, Método 2 = Boleto com o restante.
4. **Máximo 3 parcelas** no boleto.

Todos os parâmetros (percentual mínimo de entrada, valor limite de flexibilização, intervalos permitidos, parcelas máximas) ficam **editáveis** na página de regras.

## Banco (migration em `regras_vendas`)

Adicionar colunas com defaults:
- `boleto_entrada_percentual_min numeric NOT NULL DEFAULT 50`
- `boleto_valor_limite_flex numeric NOT NULL DEFAULT 60000`
- `boleto_intervalos_flex integer[] NOT NULL DEFAULT '{21,36,42}'`
- `boleto_intervalo_padrao integer NOT NULL DEFAULT 21`
- `boleto_parcelas_max integer NOT NULL DEFAULT 3`

## Frontend

### `src/hooks/useRegrasVendas.ts`
- Adicionar os 5 novos campos ao tipo `RegrasVendas` e expor via `limites.boleto` (`entradaMinPct`, `valorLimiteFlex`, `intervalosFlex`, `intervaloPadrao`, `parcelasMax`).

### `src/utils/boletoRegra.ts`
- Reativar `pagamentoTemBoleto` (hoje retorna `false` fixo) para detectar boleto em qualquer método.
- Trocar constantes hard-coded por parâmetros vindos das regras: assinaturas passam a receber um objeto `config` com os 5 valores.
- `calcularEntradaBoleto(total, config)` → entrada = `total * (entradaMinPct/100)` (piso).
- `getIntervalosBoletoPermitidos(total, config)` → `total <= valorLimiteFlex ? intervalosFlex : [intervaloPadrao]` (inverte a regra atual).
- `aplicarRegraBoleto(p, total, config)` — força split, seta tipo `a_vista` no M1 e `boleto` no M2, ajusta valor entrada, clampa `parcelas_boleto` a `parcelasMax`, ajusta intervalo para valor permitido.
- `validarRegraBoleto` idem — valida com base no `config`.

### `src/components/vendas/PagamentoSection.tsx`
- Consumir `useRegrasVendas()` (ou receber `config` via prop) e passar `config` para `aplicarRegraBoleto`, `pagamentoTemBoleto`, `getIntervalosBoletoPermitidos` e mensagens (banner com "50% mínimo", "até 3 parcelas", intervalos).

### `src/components/vendas/MetodoPagamentoCard.tsx`
- Aceitar prop `parcelasBoletoMax` (default 12 para retrocompatibilidade); usada para limitar o `Select` de parcelas do boleto quando repassada por `PagamentoSection`.

### `src/pages/vendas/VendaNovaMinimalista.tsx`
- `validarRegraBoleto` já é chamado no submit — passar `config` das regras.

### `src/pages/direcao/RegrasVendasDirecao.tsx`
- Na seção "Formas de Pagamento" → acordeão "Boleto": substituir o conteúdo estático por controles editáveis (usar `draftRegras`/`setRegra` já existentes) para:
  - `boleto_entrada_percentual_min` (Input % 0–100)
  - `boleto_valor_limite_flex` (Input R$)
  - `boleto_intervalos_flex` (chips add/remove; padrão 21/36/42)
  - `boleto_intervalo_padrao` (Input dias)
  - `boleto_parcelas_max` (Input inteiro)
- Adicionar textos explicativos: "Boleto também adiciona +3% de desconto por pagamento à vista", "Força split em 2 métodos (M1 à vista ≥ X%, M2 boleto)", "Máx N parcelas", "≤ R$ Y: intervalos flexíveis; > R$ Y: só padrão".
- Botão "Salvar" já existente (`salvarRegrasGerais`) cobre os novos campos automaticamente.

## Memória
Atualizar `mem://business-rules/sales/boleto-70-30-21d` refletindo: 50% mínimo (não 70% fixo), até 3 parcelas, intervalos por valor (≤60k flex, >60k travado 21d), tudo configurável em `regras_vendas`.

## Fora de escopo
- Nenhuma mudança em cálculo de desconto (regra dos 3% já funciona hoje via `descontoVendasRules.ts`).
- Nenhuma mudança em edição/faturamento de venda existente.