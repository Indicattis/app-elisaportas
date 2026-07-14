## Contexto

Hoje em `/vendas/minhas-vendas/nova`, ao selecionar boleto o sistema abre imediatamente o modal de senha do Gerente — mesmo sem o usuário ter escolhido nada fora das regras. Isso acontece porque:

1. O `useEffect` que chama `aplicarRegraBoleto` normaliza M1/M2 automaticamente ao trocar o tipo, e a detecção de violação (`applyChangeWithGuard`) ainda dispara em edições subsequentes que a normalização toca (intervalo/data).
2. Qualquer valor tocado que caia fora das faixas dispara o modal na hora, quebrando o fluxo de preenchimento livre.

O usuário quer inverter o modelo: **deixar o usuário editar tudo livremente sem prompt inline**, e concentrar a checagem em uma etapa de **confirmação** ao final do bloco de pagamento. Se houver violações, o sistema **lista todas** e pede a senha do Gerente uma única vez; sem senha, o método de pagamento não é considerado confirmado (o restante do formulário não avança).

## Escopo

Somente frontend/UI em `/vendas/minhas-vendas/nova`. Sem mudanças em schema, RLS, edge functions ou persistência. O registro em `vendas_autorizacoes_desconto` (via `useVendas.createVenda`) continua igual — muda apenas o gatilho e o texto do modal.

## Mudanças

### 1. `src/components/vendas/PagamentoSection.tsx`

- **Remover a interceptação inline de violações**:
  - Deletar `applyChangeWithGuard`, `detectMotivoViolacao`, `pendingMotivo`, `pendingRevertRef`, `autorizadoConfirmadoRef`.
  - `handleMetodo1Change` e `handleMetodo2Change` voltam a chamar `onChange` direto (sem guarda).
- **Neutralizar o `useEffect` que auto-normaliza via `aplicarRegraBoleto`**: manter apenas a criação/limpeza do M2 quando o M1 vira boleto (split estrutural), mas **não sobrescrever valor de entrada, intervalo ou data**. Assim o usuário edita livremente sem o effect brigar com ele. A normalização "forte" volta somente se o usuário clicar em "Aplicar regra padrão" (novo botão opcional; se preferir, apenas manter o effect só para preencher os defaults iniciais ao trocar o tipo e não recalcular depois).
- **Adicionar bloco de confirmação no fim do card** (antes do `</CardContent>`):
  - Botão `Confirmar forma de pagamento` (primário).
  - Estado local `pagamentoConfirmado: boolean`. Sempre que `paymentData` mudar depois de confirmar, resetar para `false` (via `useEffect` sobre um hash simples do objeto).
  - Um badge visível quando confirmado ("✓ Pagamento confirmado" + botão "Editar" que reseta o estado).
- **Cálculo de violações no clique de "Confirmar"**:
  - Reaproveitar `isEntradaViolada`, `isIntervaloViolado`, `isDataViolada` para montar uma lista `violacoes: { motivo, descricao }[]`:
    - Entrada abaixo de `entradaMinima` (mostra valor atual vs mínimo em R$ e %).
    - Intervalo(s) fora de `intervalosBoletoPermitidos` (mostra intervalo escolhido e permitidos).
    - Data(s) fora da janela `[dataMin, dataMax]` (mostra data escolhida e janela).
  - Se `violacoes.length === 0`: marca `pagamentoConfirmado = true`, dispara `onOverrideChange?.(null)` (nenhuma autorização necessária).
  - Se `violacoes.length > 0`: abre `AutorizacaoDescontoModal` já configurado com título "Confirmar pagamento fora das regras" e uma `descricao` (ReactNode) contendo a lista de violações formatada.
- **`AutorizacaoDescontoModal` fluxo**:
  - Ao autorizar: `setAutorizadoRegras(true)`, `setPagamentoConfirmado(true)`, `onOverrideChange({ autorizadorId, senha })`, fecha modal.
  - Ao cancelar: **não altera** `paymentData` (nada a reverter — o usuário permanece com os valores que ele escolheu), apenas fecha o modal e mantém `pagamentoConfirmado = false`. O restante do formulário fica bloqueado até que o usuário ou ajuste os valores ou obtenha a senha.
- **Manter** o badge "Regras liberadas" + botão "Reverter" quando `autorizadoRegras=true`.

### 2. `src/components/vendas/MetodoPagamentoCard.tsx`

- Sem restrições inline: Calendar aceita qualquer data (já está), Select de intervalo mostra a lista completa `[7, 14, 15, 21, 28, 30]` (já está). As mensagens em cinza abaixo dos campos continuam sinalizando o intervalo/janela permitido, mas **sem bloquear**.
- Remover as callbacks `onRequestEntradaOverride`/`onRequestIntervaloOverride`/`onRequestDataOverride` se ainda existirem — não são mais usadas.

### 3. `src/pages/vendas/VendaNovaMinimalista.tsx`

- Ler o novo sinal `pagamentoConfirmado` (via `onOverrideChange`? ou um novo callback dedicado `onPagamentoConfirmadoChange`).
- **Bloquear o botão "Finalizar venda"** enquanto `pagamentoConfirmado === false`. Mensagem inline: "Confirme a forma de pagamento antes de finalizar."
- Manter a validação atual de `validarRegraBoleto`/`validarDatasPagamento`: se `autorizacaoRegraPagamento` estiver presente, essas validações continuam sendo puladas (comportamento atual).

### 4. `src/hooks/useVendas.ts`

- Sem mudanças — a mutation já grava `vendas_autorizacoes_desconto` quando `autorizacaoRegraPagamento` é fornecida.

## Comportamento resultante

- Selecionar boleto **não abre modal**. O usuário preenche entrada, intervalo e data livremente, com dicas visuais (nunca bloqueio).
- No fim do bloco, botão `Confirmar forma de pagamento`.
  - Todas as regras respeitadas → confirma silenciosamente (badge verde).
  - Alguma regra violada → modal do Gerente lista **todas as regras infringidas** e exige a senha. Sem senha, `pagamentoConfirmado` permanece `false` e o botão de finalizar venda fica desabilitado.
- Após autorização, badge "Regras liberadas" + "Reverter" continuam disponíveis.

## Detalhes técnicos

```text
Usuário monta pagamento livre (ex.: entrada 20%, intervalo 7d, data em 60 dias)
   └─ clica "Confirmar forma de pagamento"
      └─ PagamentoSection calcula violações:
          • Entrada: R$ 6.000 (20%) < mínimo R$ 15.000 (50%)
          • Intervalo: 7 dias (permitido: 21, 36, 42)
          • Data: 15/09 fora da janela 10/07–20/07
         └─ Abre AutorizacaoDescontoModal com lista das 3 violações
            ├─ OK → autorizadoRegras=true, pagamentoConfirmado=true, grava vendas_autorizacoes_desconto ao criar venda
            └─ Cancelar → pagamentoConfirmado=false; botão "Finalizar venda" fica desabilitado
```

Sem migrations, sem alterações em edge functions.
