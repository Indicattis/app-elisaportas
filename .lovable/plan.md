## Contexto

Hoje `PagamentoSection.tsx` já tem um botão **"Liberar regras (senha)"** no topo que, uma vez usado, libera as três regras de pagamento (entrada mín. de boleto, intervalo de boletos e janela de data). O usuário quer inverter esse fluxo: **as regras permanecem visíveis/travadas, mas quando o usuário tentar escolher um valor proibido, o próprio sistema abre o modal de senha do Gerente para autorizar aquela alteração**.

## Escopo

Somente `/vendas/minhas-vendas/nova`. Sem mudanças em schema, RLS ou edge functions. Continua persistindo em `vendas_autorizacoes_desconto` como já feito hoje.

## Mudanças

### 1. `src/components/vendas/PagamentoSection.tsx`

- **Remover o botão upfront "Liberar regras (senha)"** do `CardHeader`. Manter apenas o badge "Regras liberadas" + "Reverter" quando algum override estiver ativo.
- Manter o estado `autorizadoRegras` + `senhaAutorizacaoUsada` + `autorizadorId` já existentes. Passa a ser ativado **sob demanda** (quando o modal for confirmado a partir de uma violação).
- Adicionar estado `pendingAutorizacao: null | { motivo: 'entrada' | 'intervalo' | 'data'; apply: () => void; revert?: () => void }`. Quando setado, abre `AutorizacaoDescontoModal` com título/descrição contextualizada ("Alterar entrada mínima do boleto", "Alterar intervalo entre boletos", "Alterar data de pagamento fora da janela"). Ao autorizar, executa `apply()`, marca `autorizadoRegras=true`, chama `onOverrideChange`. Ao cancelar, executa `revert?.()` (para reverter a UI ao valor anterior) e fecha.
- Passar novos callbacks para cada `MetodoPagamentoCard`:
  - `onRequestEntradaOverride(valorProposto, revert)` — chamado quando o usuário edita o campo Valor do M1 abaixo da entrada mínima enquanto há boleto ativo. Se `autorizadoRegras` já for `true`, aplica direto sem modal.
  - `onRequestIntervaloOverride(novoIntervalo, revert)` — chamado quando o usuário seleciona um intervalo fora de `intervalosBoletoPermitidos`.
  - `onRequestDataOverride(novaData, revert)` — chamado quando o usuário seleciona data fora da janela `[dataMin, dataMax]`.
- Ajustar o `useEffect` que aplica `aplicarRegraBoleto`: continuar aplicando split M1/M2 e forçar tipo, mas **não sobrescrever o valor de M1 quando `autorizadoRegras=true`** (comportamento já implementado). Para permitir edição do valor de entrada abaixo do mínimo antes de autorizar, o efeito não recalcula automaticamente — a violação é detectada só quando o usuário digita e a `MetodoPagamentoCard` propaga via callback.
- Manter passagem de `intervalosBoletoPermitidos` e `dataPagamentoJanelaDias` normais (não passar `undefined` só porque autorizado; o card exibe todas as opções sempre e o parent intercepta). Remover `dataPagamentoLiberada` como flag de "libera tudo" e usá-la só para ocultar a mensagem de janela quando `autorizadoRegras=true`.

### 2. `src/components/vendas/MetodoPagamentoCard.tsx`

- Novas props opcionais:
  - `onRequestEntradaOverride?: (valorProposto: number, revert: () => void) => boolean` — retorna `true` se pode aplicar direto (já autorizado), `false` para segurar até o modal.
  - `onRequestIntervaloOverride?: (intervalo: number, revert: () => void) => boolean`.
  - `onRequestDataOverride?: (data: Date, revert: () => void) => boolean`.
- **Intervalo**: mostrar sempre a lista completa `[7, 14, 15, 21, 28, 30]`. Ao `onValueChange`, se o valor selecionado não estiver em `intervalosBoletoPermitidos` (e o array existir), chamar `onRequestIntervaloOverride`. Se retornar `true` aplica; senão, guarda o valor anterior e reverte se o parent cancelar. Remover o `disabled` quando há 1 item (a UI mostra alerta em vez de bloquear).
- **Data**: sempre remover o `disabled` do `Calendar`. Ao `onSelect`, verificar se a data está fora de `[dataMin, dataMax]`; se estiver, chamar `onRequestDataOverride`. Preservar a mensagem "Permitido entre X e Y" como aviso.
- **Valor do M1 (entrada)**: acionar `onRequestEntradaOverride` no `onChange` do input `valor` quando o novo valor for < entrada mínima (contexto passado pelo parent via prop nova `entradaMinimaValor?: number`; se definida, e valor abaixo dela, dispara callback).
- Nenhuma dependência quebrada com outros consumidores: todas as novas props são opcionais e sem elas o comportamento permanece o de hoje.

### 3. `src/pages/vendas/VendaNovaMinimalista.tsx`

- Sem mudanças de fluxo: continua consumindo `onOverrideChange` e enviando `autorizacaoRegraPagamento` no submit (já implementado).

### 4. `src/components/vendas/AutorizacaoDescontoModal.tsx`

- Nenhuma mudança — as props `titulo` e `descricao` opcionais já existem. `PagamentoSection` passará textos contextuais conforme o `motivo`.

## Comportamento resultante

- Ao selecionar boleto, split M1 À Vista + M2 Boleto continua sendo criado automaticamente.
- Se o usuário tentar digitar valor de entrada < mínimo, o modal do Gerente abre imediatamente. Cancelar restaura o valor mínimo.
- Se o usuário tentar selecionar intervalo fora do permitido (ex.: 7 dias em venda ≤ R$ 60k), o modal abre. Cancelar retorna ao valor permitido anterior.
- Se o usuário tentar selecionar data fora da janela ±N dias, o modal abre. Cancelar limpa a data.
- Após primeira autorização, todas as três regras ficam liberadas na venda em curso (evita múltiplos prompts) e o badge "Regras liberadas por Gerente" + "Reverter" aparece.
- Reverter volta ao estado normal e reaplica `aplicarRegraBoleto`.

## Detalhes técnicos

```text
Usuário edita valor M1 = R$ 5.000 (venda R$ 30k, mín 15k)
   └─ MetodoPagamentoCard detecta valor < entradaMinimaValor
      └─ chama onRequestEntradaOverride(5000, revertTo=15000)
         └─ PagamentoSection: pendingAutorizacao = { motivo:'entrada', apply, revert }
            └─ AutorizacaoDescontoModal abre com título "Autorizar entrada abaixo de 50%"
               ├─ OK  → apply() aplica 5000, autorizadoRegras=true, onOverrideChange({...})
               └─ Cancelar → revert() volta a 15000
```

Persistência em `vendas_autorizacoes_desconto` continua no `useVendas.createVenda` (já implementado); nenhuma migration necessária.
