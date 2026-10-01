# Sinalizar modalidade "Autorizado" no Carregamento

## Objetivo
Na tela de carregamento da produção (`/producao/carregamento`), os pedidos de vendas com modalidade de entrega **Autorizado** devem aparecer na contagem/filtro de "Entrega" e ser claramente sinalizados como Autorizado, com o nome do autorizado responsável.

## Mudanças

### 1. Dados — `src/hooks/useOrdensCarregamentoUnificadas.ts`
- Estender o tipo `tipo_entrega` da interface `OrdemCarregamentoUnificada` para incluir `'autorizado'` (hoje a união só tem `'entrega' | 'instalacao' | 'manutencao'` — foi essa a causa do erro de tipo anterior).
- Adicionar campo `autorizado_nome?: string | null` na interface.
- Nas queries de `ordens_carregamento` e de pedidos órfãos, incluir o join `autorizado:autorizados!vendas_autorizado_instalacao_id_fkey(nome)` no select da venda e popular `autorizado_nome` na normalização.

### 2. Filtros e contagem — `src/pages/ProducaoCarregamento.tsx`
- Aba "Entrega": contagem e filtro passam a incluir `tipo_entrega === 'autorizado'` (além de `'entrega'`), mantendo a exclusão de correções.
- Aba "Todos" já cobre automaticamente.

### 3. Cartão da ordem — `src/components/carregamento/CarregamentoKanban.tsx`
- Quando `tipo_entrega === 'autorizado'`, exibir badge azul "Autorizado" (ícone Handshake) ao lado dos badges existentes.
- Quando houver `autorizado_nome`, exibir o nome do autorizado no cartão (linha "Autorizado: {nome}").

### 4. Painel de conclusão — `src/components/carregamento/CarregamentoDownbar.tsx`
- Quando `tipo_entrega === 'autorizado'`, o título passa a ser "Carregamento — Autorizado" e exibe o nome do autorizado responsável pela instalação.

## Validação
- `tsgo` sem erros de tipo.
- Pedido com venda Autorizado aparece na aba Entrega com badge azul "Autorizado" e nome do autorizado.
- Pedidos Entrega/Instalação/Correções inalterados.

## Fora de escopo
- Edição de venda salva (trocar autorizado/valor/observação) — pendência separada.
- Pré-definir o autorizado como responsável na expedição — pendência separada.
