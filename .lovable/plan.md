## Situação atual

Venda `ffad3c1b-e514-4e0b-988c-d42746b519d2` (WDL Vanderlei da Silva Esquadrias) — pedido `b4a53909-0072-480e-86cb-191762ddda34`:

- `vendas.tipo_entrega` = `instalacao` (deveria ser `entrega`)
- `valor_instalacao` = 0 (confirma que não há instalação)
- Produtos: apenas 38 un. de "Meia cana lisa - 0,70mm" (tipo `adicional`) — nenhum item de instalação
- Etapa atual em `pedidos_etapas`: `instalacoes` (entrada 2026-05-11 13:46:46, sem saída)
- Linha criada em `instalacoes` (id `d609f9dd-e8cb-4819-861d-37ef5392057b`, status `pronta_fabrica`, agendada 2026-05-15 às 08:00 com Equipe 3)
- `ordens_carregamento` id `c1994613-...` status `pronta_fabrica`

Para `tipo_entrega='entrega'`, após `inspecao_qualidade` o fluxo correto é `aguardando_coleta` → `finalizado` (não passa por `instalacoes`).

## Correção (via migration SQL)

1. **Atualizar a venda**: `vendas.tipo_entrega = 'entrega'` onde `id = ffad3c1b-...`.

2. **Remover linha de instalação**: `DELETE FROM instalacoes WHERE id = 'd609f9dd-e8cb-4819-861d-37ef5392057b'` (não está concluída nem carregada, então é seguro). Isso também libera a Equipe 3 da agenda do dia 15/05.

3. **Reverter etapa do pedido**: na tabela `pedidos_etapas` do pedido `b4a53909-...`:
   - Deletar a linha aberta de `instalacoes`.
   - Inserir nova linha em `aguardando_coleta` com `data_entrada = now()` e `data_saida = NULL` (usando UPSERT conforme a integridade já estabelecida das etapas).

4. **Manter `ordens_carregamento`**: a linha já está em `pronta_fabrica`, que é compatível com fluxo de entrega — não precisa alterar.

## Verificação pós-correção

- Listar `vendas.tipo_entrega`, etapa ativa em `pedidos_etapas` e existência em `instalacoes` para confirmar que o pedido aparece em Expedição/Aguardando Coleta e não mais em Instalações.

Nenhuma alteração de código frontend é necessária — é uma correção pontual de dados.
