# Corrigir ordens pendentes no carregamento

## Diagnóstico confirmado

A tela mostra **227 ordens**, mas a composição atual inclui registros que não estão mais pendentes de carregamento:

- **212** pedidos já estão em **Pós-vendas**;
- **1** pedido está em **Aguardando cliente**;
- **3** instalações já carregadas reaparecem como pedidos sem ordem pendente;
- permanecem aproximadamente **21 ordens válidas**: 4 entregas em Aguardando coleta, 12 instalações e 5 correções.

## Alterações

1. Restringir ordens comuns à etapa **Aguardando coleta**, impedindo pedidos de Pós-vendas e outras etapas de aparecerem.
2. Considerar todo o histórico de instalações ao identificar pedidos sem registro, para não recriar visualmente instalações cujo carregamento já foi concluído.
3. Deduplicar instalações por pedido, mantendo somente o registro pendente mais relevante.
4. Preservar as regras atuais para instalações e correções realmente pendentes.
5. Validar a contagem final por origem e confirmar que pedidos já carregados não reaparecem.

## Arquivo principal

- `src/hooks/useOrdensCarregamentoUnificadas.ts`
