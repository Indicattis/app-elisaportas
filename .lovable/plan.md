## Marcar acordo como pago (irreversível) em /autorizados

Hoje em `/autorizados/acordos/:ano/:mes` (contexto `home`) não há ação para marcar pagamento — só existe no contexto `logistica`, via dropdown, e ainda permite "Desmarcar Pago" (que apaga a despesa em `gastos`). A regra muda: marcar como pago deve estar disponível também para `home`, e a operação não pode mais ser revertida em nenhum contexto.

### Mudanças

**`src/pages/direcao/AcordosMesAutorizados.tsx`**
- Mostrar a coluna/ação "Ações" também no contexto `home` (não só `logistica`).
- No dropdown:
  - Manter "Editar" e "Excluir" como já são (só home/logistica).
  - Substituir o item "Marcar como Pago / Desmarcar Pago" por apenas **"Marcar como Pago"**, que:
    - Fica **desabilitado** quando `acordo.pago === true` (rótulo: "Pago — não reversível", em verde/desabilitado).
    - Quando ativo, abre o `ConfirmarPagamentoAcordoDialog` para escolher o banco e gera a despesa via `criarGastoAcordoAutorizado` (fluxo atual já implementado).
- Remover `desmarcarPago` e a chamada a `removerGastoAcordoAutorizado` (mantida a import só se outras telas usarem; nesta tela é removida).
- Em `handleMarcarPago`, se `pagoAtual === true`, apenas exibir um toast informativo ("Pagamento não pode ser revertido") em vez de chamar desmarcar.

### Histórico

O trigger já registra o evento `pago` automaticamente; nenhuma mudança no banco é necessária. O evento `desmarcado_pago` continua existindo no trigger para retrocompatibilidade, mas não será mais disparado por esta tela.

### Arquivos

- (edit) `src/pages/direcao/AcordosMesAutorizados.tsx`
