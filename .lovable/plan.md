## Problema

A validação de desconto em `/vendas/minhas-vendas/nova` (`VendaNovaMinimalista.tsx`) só acontece no frontend, em `handleSubmit` via `validarDesconto` + `getTipoAutorizacaoNecessaria`. O hook `useVendas.createVenda` recebe `autorizacaoDesconto` como opcional, **sem nenhuma checagem**: insere a venda direto e só grava a autorização se vier. Isso permite que vendas com 28% (ou qualquer %) sejam salvas se:

- o frontend for contornado (DevTools, payload manual),
- estado de React divergir (ex.: produtos mudados após validação),
- ou um fluxo legado/edição chamar `createVenda` sem passar pela validação.

Além disso, mesmo quando `autorizacaoDesconto` é enviado, a senha não é re-validada no servidor — basta enviar qualquer string em `senha_usada` para o INSERT passar.

## Solução

Adicionar uma camada de validação **dentro de `useVendas.createVendaMutation`**, antes de qualquer insert em `vendas`, replicando exatamente as regras do frontend mas autoritativa.

### Mudanças

**`src/hooks/useVendas.ts` — `createVendaMutation.mutationFn`**

1. Após validar usuário (passo 2) e antes de calcular totais (passo 3), buscar os limites atuais via:
   ```ts
   const { data: cfg } = await supabase
     .from('configuracoes_vendas')
     .select('limite_desconto_avista, limite_desconto_presencial, limite_adicional_responsavel')
     .limit(1).maybeSingle();
   ```
2. Calcular `percentualDesconto` reaproveitando `validarDesconto(portas, vendaData.forma_pagamento, vendaData.venda_presencial, { avista, presencial, adicionalResponsavel })` de `@/utils/descontoVendasRules`.
3. Aplicar regras (lançar `Error` com mensagem clara em cada caso):
   - Se `dentroDoLimite` → seguir normalmente, ignorar `autorizacaoDesconto`.
   - Se `requerSenha` (acima do limite, dentro do máximo do responsável):
     - exigir `autorizacaoDesconto` presente,
     - exigir `tipo_autorizacao` ∈ {`responsavel_setor`, `master`},
     - re-validar a senha chamando `supabase.rpc('verificar_senha_vendas', { p_senha: autorizacaoDesconto.senha_usada, p_tipo: autorizacaoDesconto.tipo_autorizacao === 'master' ? 'master' : 'responsavel' })`. Se `!== true` → throw "Senha de autorização inválida".
   - Se `excedeLimiteMaximo` (acima do máximo do responsável, ex.: 28%):
     - exigir `autorizacaoDesconto.tipo_autorizacao === 'master'`,
     - re-validar senha master via mesma RPC. Falhou → throw "Desconto acima do limite exige senha master válida".
4. Garantir que `autorizacaoDesconto.percentual_desconto` salvo seja o `percentualDesconto` recalculado no servidor (não o enviado pelo cliente), evitando divergência de auditoria.

### Por que aqui

- Centraliza no único caminho de criação (`createVenda`) → protege também `MinhasVendasEditar.tsx` e `VendasNova.tsx` que reusam o mesmo hook.
- Usa o RPC `verificar_senha_vendas` que já existe (SECURITY DEFINER), então o cliente nunca vê/manipula a senha real.
- Não muda UI: o fluxo legítimo continua passando pelo `AutorizacaoDescontoModal` e funciona idêntico. Apenas bloqueia o bypass.

### Fora de escopo

- Não mexer no `AutorizacaoDescontoModal` nem no `VendaNovaMinimalista.tsx` (UI já está correta).
- Não criar trigger no banco (a RPC já encapsula a senha; uma policy de RLS no insert de `vendas` baseada em desconto seria muito invasiva agora).
- Não tocar fluxo de "Solicitar Aprovação" (esse já passa por `useRequisicaoAprovacaoVenda`).

## Arquivos

- `src/hooks/useVendas.ts` — adicionar bloco de validação no início do `mutationFn` e re-cálculo do `percentual_desconto` no insert de `vendas_autorizacoes_desconto`.
