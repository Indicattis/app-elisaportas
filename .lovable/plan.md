## Problema
Ao usar "Retornar para Assinatura" em `/direcao/vendas/contratos/historico`, a venda reaparece como **"Liberado sem contrato"** em vez de **"Pendente de Contrato"**.

## Causa
`reverterContratoAssinado` limpa `contrato_url`, `contrato_assinado_em` e `contrato_anexado_por`, mas não reseta `contrato_liberado_faturamento`. Se a venda foi liberada sem contrato em algum momento (ou o flag ficou `true` por outro motivo), o hook `useVendasAssinaturaContrato` a classifica como `liberado` no `contrato_status` — daí o rótulo "Liberado sem contrato".

## Correção
Em `src/lib/reverterContratoAssinado.ts`, incluir no `update` de `vendas`:

- `contrato_liberado_faturamento = false`
- `contrato_dispensado = false` (garantia extra, caso tenha sido dispensado antes)

Assim a venda volta ao estado limpo de "Pendente de Contrato / Assinatura Contrato" nas duas telas.

## Fora do escopo
Sem mudanças de UI, migrações ou novas colunas.
