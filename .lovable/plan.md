## Pagamento parcial de acordos de autorizados

Adicionar suporte a pagamentos parciais no /autorizados/acordos/2026/4, com cada pagamento gerando uma despesa separada referente ao valor pago no momento.

### 1. Banco de dados (migração)

Tabela `acordos_instalacao_autorizados`:
- Adicionar coluna `valor_pago numeric NOT NULL DEFAULT 0` — soma acumulada já paga.

Status de pagamento será derivado em runtime (não armazenado):
- `valor_pago = 0` → "Pendente"
- `0 < valor_pago < valor_acordado` → "Parcial"
- `valor_pago >= valor_acordado` (ou `pago = true`) → "Pago"

A coluna existente `pago boolean` continua sendo a marca de quitação total e permanece irreversível.

### 2. Dialog `ConfirmarPagamentoAcordoDialog`

Estender props:
- `valorTotal: number` — valor acordado.
- `valorJaPago: number` — soma já paga.

Conteúdo:
- Mostrar Valor total, Já pago, Saldo devedor.
- Campo numérico "Valor a pagar agora" pré-preenchido com o saldo devedor; validado: `> 0` e `<= saldo`.
- Atalho rápido "Quitar saldo" preenchendo o input.
- `onConfirm(bancoId, valorPagamento)`.

### 3. Página `AcordosMesAutorizados.tsx`

- `handleMarcarPago`: bloqueia somente quando o acordo já está totalmente pago (`pago = true`). Caso contrário abre o dialog passando valor total e valor já pago.
- `confirmarPagamento(bancoId, valorPagamento)`:
  1. Cria um registro em `gastos` via `criarGastoAcordoAutorizado` com `valor = valorPagamento` e descrição incluindo "(parcial)" quando não quita o saldo.
  2. Atualiza `valor_pago = valor_pago + valorPagamento` no acordo.
  3. Se `valor_pago + valorPagamento >= valor_acordado` (com tolerância de centavos) marca `pago = true`, `pago_em`, `pago_por`.
- Badge na tabela:
  - "Pago" (verde) quando `pago`.
  - "Parcial — R$ X de R$ Y" (âmbar) quando `valor_pago > 0` e não pago.
  - "Pendente" caso contrário.
- Botão de ação:
  - Acordo pago: desabilitado, texto "Pago — não reversível".
  - Pagamento parcial pendente: "Continuar pagamento".
  - Sem pagamento: "Registrar pagamento".

### 4. Hook de listagem

`useAcordosAutorizadosMes` (ou equivalente) passa a expor `valor_pago` em cada item.

### Arquivos afetados
- (nova migração) adicionar `valor_pago` em `acordos_instalacao_autorizados`.
- `src/components/autorizados/ConfirmarPagamentoAcordoDialog.tsx` — novo campo "valor a pagar".
- `src/pages/direcao/AcordosMesAutorizados.tsx` — lógica de pagamento parcial, badges e botões.
- `src/hooks/useAcordosAutorizadosMes.ts` (ou onde os acordos são carregados) — incluir `valor_pago`.

### Fora de escopo
- Não altera o histórico (`HistoricoAcordoDialog`); cada pagamento aparece em `gastos` como linha independente, ligada via `acordo_autorizado_id`.
- Não há reversão de pagamentos parciais (mesma regra do pagamento total).
