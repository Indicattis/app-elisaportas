## Objetivo

Inserir uma nova etapa de pedido chamada **Pós-Vendas** após **Finalizado**. O botão de arquivar deixa de existir em Finalizado e passa a existir apenas em Pós-Vendas. A transição Finalizado → Pós-Vendas é manual (botão).

## Mudanças

### 1. Banco (migration)
- Adicionar `'pos_vendas'` ao enum/tipo de etapas usado em `pedidos_producao.etapa_atual` e `pedidos_etapas.etapa` (se for enum Postgres, `ALTER TYPE ... ADD VALUE`; se for `text`, apenas garantir que dados antigos continuam válidos).
- Permitir que `etapa_responsaveis` aceite a chave `pos_vendas` (sem mudança estrutural se a coluna já é `text`).
- Não migrar dados existentes: pedidos hoje em `finalizado` permanecem em `finalizado` até o usuário avançá-los manualmente.

### 2. Tipos/constantes (`src/types/pedidoEtapa.ts`)
- Adicionar `pos_vendas` em `EtapaPedido`, `ETAPAS_CONFIG` (label "Pós-Vendas", cor `bg-emerald-500`, ícone `Headset` ou `LifeBuoy`, sem checkboxes), `ORDEM_ETAPAS` (logo após `finalizado`) e `LIMITES_ETAPA_SEGUNDOS` (`Infinity`).

### 3. Fluxograma (`src/utils/pedidoFluxograma.ts`)
- Adicionar `pos_vendas` em `FLUXOGRAMA_ETAPAS`.
- Em `determinarFluxograma`, inserir `pos_vendas` logo após `finalizado` em todos os caminhos (inclusive manutenção).

### 4. UI – Gestão da Fábrica (`src/pages/direcao/GestaoFabricaDirecao.tsx`)
- Renderizar nova `TabsTrigger` `pos_vendas` no grupo verde, posicionada entre Finalizado e Arquivo Morto, com avatar de responsável (mesmo padrão das outras).
- Atualizar os arrays `(['finalizado'] as const)`, contadores, `hideOrdensStatus`, e `Select` de etapas para incluir `pos_vendas`.
- Mostrar mesmas listas/colunas que Finalizado (reaproveitar o bloco de render).

### 5. Botão de avançar / arquivar (`src/components/pedidos/PedidoCard.tsx`)
- Substituir, na etapa `finalizado`, o botão "Arquivar" por "Enviar para Pós-Vendas" (ícone `ArrowRight`/`Headset`), que move o pedido para `pos_vendas` via `avancarEtapa`/UPSERT em `pedidos_etapas` (seguindo o padrão já existente).
- Mover o botão "Arquivar Pedido" (com `ArquivarPedidoModal`) para aparecer apenas quando `etapaAtual === 'pos_vendas'`.

### 6. Outras telas que listam etapas
- `src/pages/administrativo/PedidosAdminMinimalista.tsx`: adicionar opção "Pós-Vendas" no `Select` e nas tabs, entre Finalizado e Arquivo Morto.
- `src/hooks/useItensNaoConcluidosPorEtapa.ts`: incluir `pos_vendas` no filtro de exclusão (junto a `finalizado` e `arquivo_morto`), pois não é uma etapa "em produção".
- Demais lugares onde `'finalizado'` é citado como etapa terminal (contadores, fluxograma do `PedidoFluxogramaMap`, hooks de etapas) — incluir `pos_vendas` quando fizer sentido (apenas como passagem visual, sem alterar regras de produção).

### 7. Retrocesso e avanço
- `useGestaoOrdensProducao` / `usePedidosEtapas`: garantir que `avancarEtapa` reconhece `finalizado → pos_vendas` e que o retrocesso de `pos_vendas → finalizado` funciona com a mesma lógica unificada de UPSERT já em uso.

## Notas

- A etapa **não** está no fluxo de produção (não gera ordens, não pausa metas).
- Pedidos já arquivados permanecem em Arquivo Morto.
- Não há automação de tempo — somente botão manual.

## Observação técnica

Antes de codar, vou verificar se `pedidos_producao.etapa_atual` é `text` ou enum Postgres para escolher entre `ALTER TYPE` ou nenhuma migration. Se for enum, a migration é obrigatória e roda antes das mudanças de código.
