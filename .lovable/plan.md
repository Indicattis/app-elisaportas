# Autorização por senha para regras de pagamento em /vendas/minhas-vendas/nova

Hoje, três regras são impostas de forma "dura" na seção de pagamento:

- **Entrada de boleto** — `aplicarRegraBoleto` força automaticamente Método 1 = À Vista com ≥ `entradaMinPct`% do total e Método 2 = Boleto com o restante.
- **Intervalo de boletos** — o select só mostra os valores retornados por `getIntervalosBoletoPermitidos` (21 dias fixo até R$ 60k; 21/36/42 acima).
- **Data de pagamento** — o calendário desabilita datas fora da janela de ±N dias (`regras_vendas.pagamento_data_janela_dias`).

O objetivo é permitir que o usuário selecione valores fora dessas regras, mas somente após validação da **senha do Gerente** (mesmo fluxo já usado para desconto, tipo `responsavel_setor`).

## O que muda

### 1. `src/components/vendas/PagamentoSection.tsx`

- Adicionar estado local `autorizadoRegrasPagamento: boolean` + `senhaAutorizacaoUsada: string | null` + `autorizadorId: string | null`.
- Adicionar botão discreto **"Liberar regras (senha do Gerente)"** ao lado do badge "Total" no `CardHeader`. Ao clicar, abre `AutorizacaoDescontoModal` com `tipoAutorizacao="responsavel_setor"`, texto adaptado por prop opcional (ver §4). Ao autorizar, seta `autorizadoRegrasPagamento=true` e guarda `senhaAutorizacaoUsada` e `autorizadorId`.
- Quando `autorizadoRegrasPagamento` for `true`:
  - Não executa `aplicarRegraBoleto` (o `useEffect` passa a depender também dessa flag e é ignorado).
  - Passa `intervalosBoletoPermitidos={undefined}` para o `MetodoPagamentoCard`, liberando a lista padrão `[7,14,15,21,28,30]`.
  - Passa nova prop `dataPagamentoLiberada={true}` ao card, que desabilita o `disabled` do `Calendar` e oculta a mensagem de janela.
  - Passa `parcelasBoletoMax` inalterado (a regra pediu só entrada/data/intervalo).
  - Mostra badge "Regras liberadas por Gerente" com botão "Reverter" que zera o override.
- Exportar via callback `onOverrideChange?(payload: { autorizadorId: string; senha: string } | null)` para a página consumir (persistir em `vendas_autorizacoes_desconto` quando a venda for criada) — sem persistir imediatamente.

### 2. `src/components/vendas/MetodoPagamentoCard.tsx`

- Nova prop opcional `dataPagamentoLiberada?: boolean`. Quando `true`:
  - Remove o `disabled` do `Calendar` (ou passa `undefined`).
  - Esconde o rodapé "Permitido entre X e Y".
- Nenhuma mudança em `intervalo_boletos` — a liberação já ocorre pela ausência de `intervalosBoletoPermitidos` (fallback já libera `[7,14,15,21,28,30]`).

### 3. `src/pages/vendas/VendaNovaMinimalista.tsx`

- Guardar `pagamentoOverride` (via `onOverrideChange`) em estado.
- Passar `descontoInfo` intacto; adicionar handler `onOverrideChange` ao `<PagamentoSection>`.
- Ao submeter a venda, se `pagamentoOverride` estiver setado, gravar em `vendas_autorizacoes_desconto` uma linha `tipo='regra_pagamento'` com `senha_usada`, `autorizador_id`, `percentual_solicitado=0`, `motivo` descritivo (mesmo padrão já usado para descontos — memória `autorizacao-senha-vendas`). Não bloqueia a venda; funciona como registro de auditoria.

### 4. `src/components/vendas/AutorizacaoDescontoModal.tsx`

- Adicionar props opcionais `titulo?`, `descricao?` e tornar as strings do header/description customizáveis (fallback = texto atual de desconto). Mantém `percentualDesconto`/`limitePermitido` opcionais quando `descricao` é passada. Sem quebra de contrato com chamadas existentes.

## Fora de escopo

- Não altera `VendaEditarMinimalista.tsx` (usuário citou apenas `/vendas/minhas-vendas/nova`).
- Não altera regras de desconto, contrato, crédito, empresa receptora, comprovante ou temperatura da venda.
- Não altera schema — reutiliza `vendas_autorizacoes_desconto`.
- Sem mudanças em RLS ou edge functions.

## Detalhes técnicos

- A validação por senha continua no RPC `verificar_senha_vendas` (tipo `responsavel`).
- A UI mantém as restrições visuais como padrão; só relaxa após autorização — evita "clicar por engano" em valores proibidos.
- Reverter override limpa o estado local; o próximo render reaplica `aplicarRegraBoleto`, o que pode ajustar automaticamente valores digitados (comportamento atual). Aviso será exibido no botão "Reverter".
