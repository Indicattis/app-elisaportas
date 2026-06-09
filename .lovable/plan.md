## Diagnóstico

Em junho/2026 existem 8 vendas com desconto acima do limite (precisaram passar pelo modal de senha de Gerente/Diretor), porém **nenhum registro** foi gravado em `vendas_autorizacoes_desconto` desde 20/03/2026.

Verifiquei:
- Limites em `configuracoes_vendas` e `regras_vendas` estão corretos (3 / 5 / +7).
- Os autorizadores configurados (`responsavel_senha_*_id`) existem em `admin_users` → FK passa.
- Atendentes das vendas existem em `admin_users` → FK em `solicitado_por` passa.
- RLS de `vendas_autorizacoes_desconto` permite INSERT para qualquer usuário autenticado.
- Trigger `trigger_autorizacao_recalcula_lucro` não tem efeito colateral que rejeite o INSERT.
- Validação anti-bypass em `useVendas.ts` exigiria `autorizacaoDesconto.tipo_autorizacao='master'` — caso contrário lançaria erro e a venda nem seria salva. Como as vendas existem com 27–30% de desconto, o front-end **enviou** a autorização. O INSERT entrou no `if`, mas o `error` foi engolido por um `console.error` sem `throw` (linhas `useVendas.ts:544-546` e `MinhasVendasEditar.tsx:580-582`).

## Causa-raiz provável

O INSERT em `vendas_autorizacoes_desconto` está falhando silenciosamente em runtime (provável violação de RLS para a sessão atual, ou erro de payload), mas o código apenas faz `console.error` e segue salvando a venda. Sem o erro visível, ninguém percebe — e o `Balanço de Descontos` exibe "-" na coluna Gerente porque o registro nunca chegou.

## Correção

### 1. Fail-loud (parar de engolir o erro)
- `src/hooks/useVendas.ts` (linhas 531-547): se o INSERT em `vendas_autorizacoes_desconto` falhar, lançar `Error` com a mensagem do Postgres (a venda inteira faz rollback / aborta) e mostrar `toast` com instrução para reenviar. Isso garante que **nunca** mais haverá venda salva sem o registro de auditoria correspondente.
- `src/pages/vendas/MinhasVendasEditar.tsx` (linhas 569-584): mesmo tratamento — se a auditoria falhar, lançar erro e exibir toast destrutivo. Considerar reverter `is_rascunho=true` na venda recém-convertida para manter consistência.

### 2. Diagnóstico extra
Adicionar `console.warn` com o payload exato sendo enviado ao INSERT, antes da chamada, em ambos os arquivos. Assim, no próximo teste, capturamos o motivo real (mensagem PostgREST) no console.

### 3. Backfill manual das vendas de abr/mai/jun
Após confirmar o fix, criar uma migração `INSERT ... SELECT` que registre uma autorização "histórica" para as 8 vendas listadas (com `senha_usada='[BACKFILL]'`, `autorizado_por` = responsável master configurado, `tipo_autorizacao` derivado da relação entre `pct_desconto_dado` e `pct_limite_permitido` em `vendas_balanco_desconto`). Confirmar com o usuário antes de aplicar — alguns podem ter sido aprovados sem registro intencional.

### 4. Verificação
Após o fix, criar uma venda de teste com 20% de desconto. Confirmar via SQL que o registro aparece em `vendas_autorizacoes_desconto`. Verificar que o `Balanço de Descontos` exibe a coluna Gerente preenchida.

## Detalhes técnicos

- Arquivos alterados: `src/hooks/useVendas.ts`, `src/pages/vendas/MinhasVendasEditar.tsx`.
- Sem alteração de schema, RLS ou triggers — somente tratamento de erro no cliente.
- Backfill (passo 3) opcional, depende da decisão do usuário.
