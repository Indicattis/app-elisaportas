## Problema

Em `/vendas/minhas-vendas/nova`, ao criar uma venda com 14% de desconto, o hook `useVendas.createVendaMutation` (`src/hooks/useVendas.ts`, linhas 213-223) recalcula os limites de desconto no submit e conclui que o tier necessário é `master` (14% > limite máximo do responsável, que por padrão é 13%). Como a modal de ajuste (`AutorizacaoDescontoModal`) foi aberta com o tier calculado naquele momento (`responsavel_setor`), o payload `autorizacaoDesconto.tipo_autorizacao` chega como `responsavel_setor` e o servidor rejeita com a mensagem:

> "Desconto de 14.00% excede o limite máximo do responsável. Apenas a senha master pode autorizar."

Ou seja: mesmo que o usuário tenha digitado a senha correta, a checagem rígida de tier feita depois da validação da senha bloqueia a venda. É o comportamento legado que o usuário quer eliminar — a autorização por senha deve valer independente do "rótulo" que a modal atribuiu.

## Solução

Trocar a checagem rígida de tier no servidor por uma verificação centrada na **senha fornecida**: se a senha bater com a senha master, autoriza qualquer percentual; se bater com a senha do responsável, autoriza dentro do limite do responsável; caso contrário, rejeita.

### Alterações

**`src/hooks/useVendas.ts`** (bloco de validação autoritativa de desconto, ~linhas 194-243):

1. Manter o cálculo autoritativo de `validacaoServer` e `tipoAutorizacaoRequerido`.
2. Se `tipoAutorizacaoRequerido` for `null`, seguir como hoje (descartar `autorizacaoDesconto`).
3. Se autorização é necessária mas `autorizacaoDesconto?.senha_usada` não veio, lançar o erro atual "É necessária autorização por senha".
4. **Remover** a checagem `if (tipoAutorizacaoRequerido === 'master' && autorizacaoDesconto.tipo_autorizacao !== 'master')` (linhas 219-223).
5. Substituir a única chamada de RPC por uma verificação em cascata:
   - Chamar `verificar_senha_vendas` com `p_tipo: 'master'`. Se retornar `true`, tratar como autorização master (independente do que o cliente enviou).
   - Caso contrário, se `tipoAutorizacaoRequerido === 'responsavel_setor'`, chamar `verificar_senha_vendas` com `p_tipo: 'responsavel'`. Se retornar `true`, tratar como autorização de responsável.
   - Se nenhuma bater, lançar `"Senha de autorização inválida..."` (mensagem já existente).
6. Antes de gravar, sobrescrever `autorizacaoDesconto.tipo_autorizacao` com o tier efetivamente validado (`'master'` ou `'responsavel_setor'`) e re-sincronizar `percentual_desconto` com `validacaoServer.percentualDesconto` (já feito hoje).

### Efeito prático

- Se o usuário digita a senha do Diretor em qualquer modal (mesmo quando aberto como "responsável"), a venda é aceita e registrada como `tipo_autorizacao='master'` em `vendas_autorizacoes_desconto`.
- Se o usuário digita a senha do Gerente e o desconto realmente cabe no limite do responsável, aceita.
- Se digita a senha errada ou usa senha de responsável para desconto que exige master, retorna o erro genérico de senha inválida (não mais o erro "restrição legada").

### Fora de escopo

- Nada muda no `AutorizacaoDescontoModal`, nas modais de UX ou no fluxo de `Aplicar Ajuste`.
- Nada muda no schema, RLS, ou nas RPCs. Continuamos usando `verificar_senha_vendas` já existente.
- Nada muda na aprovação de regras de pagamento (`autorizacaoRegraPagamento`).
