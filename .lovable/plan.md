## Objetivo

Em `/vendas/contratos`, adicionar um botão **Dispensar Contrato** na coluna "Ações" da aba **Pendente de Contrato**. Ao confirmar, a venda é marcada como `contrato_dispensado=true` e some da lista — o que automaticamente a coloca em **Pend. Faturamento** (regra existente `aguardandoContrato = !faturada && !contrato_url && !contrato_dispensado`, já consumida pelo hook `useVendasPendenteFaturamento`).

## Mudanças (apenas `src/pages/vendas/ContratosVendas.tsx`)

1. Estado novo: `dispensarVenda: VendaRow | null` e `dispensandoId: string | null`.
2. No `TableView` da aba `pendentes` (`actionLabel="Gerar Contrato"`), passar `extraRow` que renderiza um botão `FileX` (vermelho/âmbar discreto) com tooltip "Dispensar Contrato" — abre `AlertDialog`.
3. `AlertDialog` reutilizando o mesmo padrão visual de `FaturamentoVendasMinimalista`: título "Dispensar contrato?", descrição explicando que a venda irá para Pendente de Faturamento sem contrato e a ação não pode ser desfeita aqui.
4. Ao confirmar:
   - `update vendas set contrato_dispensado=true, contrato_dispensado_em=now(), contrato_dispensado_por=user.id where id=...`.
   - Remover a venda do `vendas` state local (a query já filtra `contrato_dispensado=false`, então um refresh também funciona).
   - Toast de sucesso "Contrato dispensado. Venda enviada para Pendente de Faturamento."
5. Imports: adicionar `FileX` de `lucide-react` e `AlertDialog`/parts de `@/components/ui/alert-dialog`.

## Fora de escopo

- Nenhuma migration (colunas e regras já existem).
- Aba "Gerados"/"Assinados" não recebem o botão (contrato já existe).
- Nenhuma alteração em Gestão da Fábrica — Pend. Faturamento já reflete automaticamente.
