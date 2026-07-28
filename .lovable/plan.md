## Objetivo

Em `/fabrica/ordens-pedidos`, permitir que o usuário avance manualmente o pedido de etapa quando todas as ordens necessárias da etapa atual já estiverem concluídas — reutilizando o fluxo existente de auto-avanço.

## Escopo

Um botão "Avançar Etapa" no card do pedido (`PedidoOrdemCard`) que:
- Só aparece quando a etapa atual do pedido é uma das que possuem verificação (`em_producao`, `inspecao_qualidade`, `aguardando_pintura`, `embalagem`) E todas as ordens existentes exibidas no card estão com `status === 'concluido'`.
- Ao clicar, dispara `verificarEAvancarManual(pedidoId)` do hook `usePedidoAutoAvanco`, reaproveitando o mesmo `ProcessoAvancoAutomaticoModal` já usado em produção.
- Mostra toast de sucesso/erro com o motivo retornado pelo hook (ex.: "Ordem X não está concluída").

## Alterações

1. **`src/pages/fabrica/OrdensPorPedido.tsx`**
   - Instanciar `usePedidoAutoAvanco()` → obter `verificarEAvancarManual`, `processos`, `modalOpen`.
   - Renderizar `<ProcessoAvancoAutomaticoModal open={modalOpen} processos={processos} />`.
   - Passar handler `onAvancarEtapa(pedidoId)` para `PedidoOrdemCard` que chama `verificarEAvancarManual` e exibe toast conforme resultado.

2. **`src/components/fabrica/PedidoOrdemCard.tsx`**
   - Aceitar nova prop opcional `onAvancarEtapa?: (pedidoId: string) => Promise<void>` e `etapaAtual: EtapaPedido` (já disponível pelo tab ativo — passar do pai).
   - Calcular `podeAvancar = etapaAtual ∈ {em_producao, inspecao_qualidade, aguardando_pintura, embalagem}` e todas as `ordensExistentes` (filtradas pela etapa relevante) com `status === 'concluido'`.
   - Renderizar botão discreto "Avançar Etapa" (ícone `ArrowRight`) no header do card (ao lado do contador `x/y`) apenas quando `podeAvancar`; com estado `disabled` durante o processamento.

3. Não são necessárias mudanças de banco nem de RLS.

### Detalhes técnicos

- Reutilização total do hook `usePedidoAutoAvanco`, que já implementa `verificarEAvancarManual` para as etapas alvo (linhas 300–321 do hook), executa `executarAvanco` (mesmo pipeline usado pelas telas de produção) e retorna `{ avancou, motivo }`.
- O botão fica visível apenas quando a heurística local do card indica que faz sentido tentar — mas a decisão real permanece no hook (que consulta o DB), garantindo consistência.
- Etapas fora do conjunto suportado não exibem o botão (evita clique inválido em `aberto`, `aprovacao_ceo`, `aguardando_coleta`, `instalacoes`, `correcoes`, `pos_vendas`).