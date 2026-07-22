## Objetivo
Adicionar em `/direcao/vendas/contratos/historico` a ação **"Retornar para Assinatura"**, que descarta o contrato assinado atual e devolve a venda para a etapa "Pendente de Contrato" / "Assinatura Contrato" nas telas correspondentes.

## Escopo
- Ação disponível apenas em linhas com desfecho **Assinado** (que possuem `contrato_url` real, não legado).
- Bloqueada quando a venda já foi faturada (existe `pedidos_producao` vinculado) — pois nesse caso o pedido já está em produção e reverter destruiria o fluxo. Nessas linhas o botão aparece desabilitado com tooltip "Venda já faturada".
- Vendas dispensadas ou liberadas sem contrato **não** recebem essa ação (fora do fluxo).

## Comportamento
Ao clicar em "Retornar para Assinatura" e confirmar num AlertDialog:

1. Deleta o arquivo atual do bucket `contratos-vendas` (usando o path salvo em `vendas.contrato_url`).
2. Remove os registros correspondentes em `contratos_vendas` para o `venda_id` (apagando também os arquivos vinculados no bucket).
3. Atualiza `vendas` limpando:
   - `contrato_url = null`
   - `contrato_assinado_em = null`
   - `contrato_anexado_por = null`
4. Invalida as queries de contratos, assinatura, faturamento e gestão-fábrica.
5. Toast de sucesso.

Como as telas `/vendas/contratos` (Pendente de Contrato) e `/direcao/gestao-fabrica` (Assinatura Contrato) são derivadas dinamicamente da regra `contrato_url IS NULL` + venda não faturada, limpar esses campos faz a venda reaparecer automaticamente em ambas — sem migração ou nova coluna.

## Arquivos afetados
- `src/lib/reverterContratoAssinado.ts` (novo): função `reverterContratoAssinado(vendaId, contratoPath)` executando storage remove + delete em `contratos_vendas` + update em `vendas`.
- `src/pages/vendas/HistoricoContratos.tsx`:
  - Nova coluna "Ações" (ou botão ao lado de "Ver") com `Undo2` icon.
  - `AlertDialog` de confirmação explicando que o contrato atual será descartado.
  - Verificação prévia de faturamento via query em `pedidos_producao` (batch por `venda_id` no carregamento da lista) para desabilitar o botão quando aplicável.
  - Usa `useMutation` para chamar o helper e invalidar caches.

## Detalhes técnicos
- O `contrato_url` está salvo como path relativo no bucket (mesmo padrão usado em `abrirContrato` com `createSignedUrl`), então `supabase.storage.from('contratos-vendas').remove([path])` funciona diretamente.
- `contratos_vendas.arquivo_url` guarda URL pública — extrair o filename via `split('/').pop()` (mesmo padrão do `useContratosVendas.deleteContrato`) antes de remover do storage.
- Query keys a invalidar: `['historico-contratos']`, `['contratos-venda']`, `['contratos-vendas']`, `['vendas-assinatura-contrato']`, `['vendas-pendente-faturamento']`, `['gestao-fabrica']` (ou equivalentes existentes; farei match pelas keys reais dos hooks ao implementar).

## Fora do escopo
- Não altera vendas já faturadas (com pedido criado). Se no futuro isso for necessário, exigirá exclusão em cascata do pedido e será tratado em separado.
- Não cria coluna de auditoria nova; a reversão fica registrada apenas pela ausência dos campos (compatível com o restante do fluxo).