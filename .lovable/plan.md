## Objetivo

Quando um acordo de autorizado for marcado como **Pago**, gerar automaticamente um lançamento na tabela `gastos`, categorizado em **"Pagamento - Autorizados"** (tipo de custo já existente, id `55302712-8a2b-4fb4-b579-91921f4abc41`). Esse gasto aparece no mês correspondente em `/direcao/estrategia/despesas/2026-05`. Se o pagamento for desmarcado, o gasto é removido.

## Mudança no banco

Adicionar coluna nullable `acordo_autorizado_id uuid` em `public.gastos`, com FK para `acordos_instalacao_autorizados(id) ON DELETE CASCADE` e índice. Permite vincular cada gasto ao acordo de origem e localizar/remover o registro ao desmarcar o pagamento.

## Mudança no código

Em `handleMarcarPago` de:
- `src/pages/direcao/AcordosMesAutorizados.tsx`
- `src/pages/direcao/AutorizadosPrecosDirecao.tsx`

Após o `update` em `acordos_instalacao_autorizados`:

- **Ao marcar como pago** → `insert` em `gastos`:
  - `tipo_custo_id`: id fixo de "Pagamento - Autorizados"
  - `valor`: `acordo.valor_acordado`
  - `data`: data do pagamento (hoje, em formato `YYYY-MM-DD`) — define o mês em que aparece em `/despesas/<ano-mes>`
  - `descricao`: `Acordo autorizado — <cliente_nome> (<autorizado_nome>)`
  - `status`: `pago`
  - `responsavel_id`: `user.id` (quem clicou)
  - `banco_id`: banco padrão (ver pergunta abaixo)
  - `acordo_autorizado_id`: id do acordo
- **Ao desmarcar pago** → `delete from gastos where acordo_autorizado_id = <id>`.

Tratamento simples de erro com toast; a operação do gasto é encadeada após o update e qualquer falha exibe mensagem, sem reverter o update do acordo (consistente com o padrão atual).

## Pergunta

`gastos.banco_id` é obrigatório. Como o acordo de autorizado não registra qual banco foi usado no pagamento, preciso de um padrão. Quer que eu:

1. use sempre um banco específico (qual?); ou
2. acrescente um seletor de banco no momento de marcar como pago (abre um pequeno diálogo)?
