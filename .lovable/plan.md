## Contexto

A venda `b6e5d732` foi salva com 3% de desconto global distribuído proporcionalmente (24/800, 123.36/4112, 75/2500). Isso confirma que o valor `3` foi digitado no campo da nova **seção "Desconto / Acréscimo"** e aplicado automaticamente em tempo real, sem confirmação explícita. Hoje o sistema:

- Aplica o ajuste a cada keystroke (sem botão "Aplicar").
- Só dispara o modal `AutorizacaoDescontoModal` no momento do **submit final** da venda, não quando o desconto é configurado.
- A venda atual ficará como está (decisão do usuário).

## Objetivo

Tornar a aplicação de desconto/acréscimo um ato **explícito**, exigindo senha **na própria seção** quando o percentual exceder os limites por forma de pagamento/tipo de venda.

## Mudanças

### 1. `DescontoAcrescimoSection.tsx` — novo fluxo "rascunho → aplicado"

- Estado interno: `rascunho` (o que o usuário está digitando) vs `ajuste` (o que está efetivamente aplicado, prop controlada pelo pai).
- Inputs (Tipo, Unidade, Valor) editam apenas o `rascunho`. O resumo "Impacto" mostra o valor previsto do rascunho.
- Novo botão **"Aplicar"** ao lado do campo:
  - Desabilitado quando `rascunho` é igual ao `ajuste` atual ou quando `valor <= 0`.
  - Ao clicar: chama `onAplicar(rascunho)` (nova prop).
- Botão **"Limpar"** continua zerando o ajuste aplicado (e o rascunho).
- Badge visual quando há ajuste **aplicado** (`bg-emerald-500/15` para desconto, `bg-amber-500/15` para acréscimo) com o valor e percentual.
- Se houver rascunho diferente do aplicado, mostra aviso sutil "Alterações pendentes — clique em Aplicar".

### 2. `VendaNovaMinimalista.tsx` — validação + senha no momento de aplicar

- Novo handler `handleAplicarAjuste(rascunho: AjusteGlobal)`:
  1. Se `tipo === 'acrescimo'`: aplica direto (sem validação) → `setAjusteGlobal(rascunho)`.
  2. Se `tipo === 'desconto'`:
     - Calcula o percentual efetivo sobre o subtotal usando `validarDesconto` com `portasComAjusteGlobalSimulado` (rascunho aplicado a uma cópia das portas).
     - Se `dentroDoLimite`: aplica direto.
     - Se `requerSenha` (excede limite normal mas dentro do máximo do responsável): abre `AutorizacaoDescontoModal` com `tipo: 'responsavel_setor'`.
     - Se `excedeLimiteMaximo`: abre modal com `tipo: 'master'`.
  3. Após autorização bem-sucedida, `setAjusteGlobal(rascunho)` + persiste a senha digitada para envio posterior (já registrado em `vendas_autorizacoes_desconto.senha_usada` no submit, conforme memória existente).
- Como o ajuste só é aplicado após autorização, a checagem do submit continua válida mas raramente disparará — funciona como segunda camada.
- Remover a checagem `ajusteGlobal.valor === 0` da linha 1119 (mensagem de "Adicionar Crédito") fica como está — só relevante quando não há desconto aplicado.

### 3. Sem mudanças de banco

A RPC `verificar_senha_vendas` e a tabela `vendas_autorizacoes_desconto` já existem e cobrem o fluxo. A senha continua sendo gravada no submit junto com o snapshot da venda.

## Detalhes técnicos

- Tipos: `DescontoAcrescimoSection` recebe duas props novas — `onAplicar: (a: AjusteGlobal) => void` e `valorAplicado: AjusteGlobal` (para detectar pendência). Mantém `ajuste`/`onChange` removidos; o componente vira self-contained com rascunho local.
- `valorAjusteGlobalSigned`, `portasComAjusteGlobal`, `valorTotalMemo` continuam derivando de `ajusteGlobal` aplicado (sem mudanças).
- `validarDesconto(portasComAjusteSimulado, formaPagamento, !vendaPresencial, configLimitesObj)` reutilizado dentro do handler — mesma função do submit.
- Acréscimo nunca exige autorização (não é desconto).
- Acessibilidade: botão "Aplicar" com `aria-label` claro; badge de status com contraste mínimo AA.

## Fora de escopo

- Não alterar venda já salva (`b6e5d732`) — decisão explícita do usuário.
- Não mexer na edição de venda (`VendaEditarMinimalista`), apenas na criação minimalista.
- Não alterar descontos por item (modal antigo `DescontoVendaModal`) que permanece em outras telas.
