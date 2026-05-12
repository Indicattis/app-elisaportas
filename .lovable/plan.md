Adicionar flag "Cliente mediu" na seleção de responsável pelas medidas das portas de enrolar em `/fabrica/montagem-pedidos/:id`.

## Contexto
Na página `PedidoViewMinimalista`, o componente `ObservacoesPortaForm` exige o preenchimento de um responsável pelas medidas (interno ou autorizado) para cada porta de enrolar. Quando um cliente mesmo faz a medição, essa seleção deve ser dispensada por meio de uma flag.

## Alterações

### 1. Banco de dados
- Adicionar coluna `cliente_medeu` (boolean, DEFAULT false) na tabela `pedido_porta_observacoes`.

### 2. Tipos (`src/types/pedidoObservacoes.ts`)
- Incluir `cliente_medeu: boolean` na interface `PedidoPortaObservacoes` e no `Insert`/`Update`.

### 3. Formulário de observações (`src/components/pedidos/ObservacoesPortaForm.tsx`)
- Adicionar checkbox "Cliente mediu" junto ao campo "Responsável pelas medidas".
- Quando a flag estiver ativa:
  - O seletor de responsável fica desabilitado/oculto.
  - `responsavel_medidas_id` é resetado para `null`.
  - O card da porta não exibe mais o estado "Pendente" (borda vermelha) apenas por causa do responsável.
- Quando desativada, o comportamento atual se mantem.

### 4. Validação de avanço (`src/hooks/usePedidosEtapas.ts`)
- Na verificação de "responsável pelas medidas preenchido em todas as portas", considerar também `cliente_medeu = true` como válido (linha 610-620).

## Fora de escopo
- Alterar `pedido_porta_social_observacoes` (portas sociais não têm responsável pela medida).
- Criar histórico de quem marcou a flag.
