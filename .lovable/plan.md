## Objetivo
Adicionar "Na Entrega" como opção nativa no seletor de tipo do Método 1 (ao lado de Boleto/À Vista/Cartão). Ao selecionar, aplica split automático M1 À Vista X% + M2 Na Entrega (100-X)%, análogo ao boleto, com percentual configurável.

## Banco (migration)
Adicionar em `regras_vendas`:
- `entrega_entrada_percentual_min INTEGER NOT NULL DEFAULT 50`

## `src/hooks/useRegrasVendas.ts`
- Adicionar `entrega_entrada_percentual_min` ao tipo.
- Expor em `limites.entrega = { entradaMinPct }` (fallback 50).

## Novo utilitário `src/utils/entregaRegra.ts`
Espelha `boletoRegra.ts`:
- `pagamentoTemEntregaPrincipal(data)` — true quando M1.tipo === 'na_entrega'.
- `aplicarRegraEntrega(data, valorTotal, cfg)` — força M1 À Vista (X%) + M2 Na Entrega ((100-X)%) com `pagamento_na_entrega = true`.

## `MetodoPagamentoCard.tsx`
- Adicionar `'na_entrega'` na lista de tipos (label "Na Entrega", ícone `Truck`).
- Ocultar essa opção quando `hideEntregaOption` for true (usado no Método 2, que já tem o botão dedicado "Na Entrega" após boleto).
- Quando `metodo.tipo === 'na_entrega'`, ocultar campos de data/parcelas/já-pago (mesmo tratamento do modoEntrega atual).
- Manter o botão desabilitado quando `entregaDesabilitada` (já implementado).

## `PagamentoSection.tsx`
- Novo estado: exibir M1 com nova opção "Na Entrega".
- `useEffect` de normalização passa a tratar 3 cenários mutuamente exclusivos:
  1. **Boleto** em qualquer método → split 70/30 (regra existente).
  2. **M1 = Na Entrega** → split M1 À Vista (entrega_entrada_percentual_min)% + M2 Na Entrega restante, seta `pagamento_na_entrega = true`.
  3. Nenhum dos dois → método único (M2 zerado).
- **Bloqueio de combinação**: se o usuário selecionar Boleto e tentar mudar M1 para "Na Entrega" (ou vice-versa), exibir toast "Substitua a forma atual usando 'Recomeçar' para trocar entre Boleto e Na Entrega" e ignorar a mudança. Implementado via wrapper em `handleMetodo1Change`.
- Novo aviso azul (`Info`) quando regra de entrega ativa: "Regra da entrega: 50% de entrada à vista no Método 1 e 50% cobrado no ato da entrega."
- Card do M2 quando M1=Na Entrega: `tipoTravado="na_entrega"`, `valorFixo`, sem botão "Na Entrega" duplicado (`hideEntregaOption`).
- `regraEntregaAtiva = pagamentoTemEntregaPrincipal(paymentData) && !autorizadoRegras` para travar M1 como À Vista após a normalização inicial (assim como boleto trava M2).

## Consumidores (`useVendas.ts` e faturamento)
- Já lidam com `pagamento_na_entrega` na coluna do M2. Como o tipo `'na_entrega'` só aparece transitoriamente no M1 antes de ser normalizado para 'a_vista' + M2 na entrega, **nenhuma mudança de persistência** é necessária. O tipo canônico salvo continua sendo 'a_vista'/'na_entrega' (M2) — mantém compatibilidade com contas_receber, DRE e relatórios.

## Regras de Vendas (UI)
Adicionar campo "Entrada mínima para Na Entrega (%)" na tela de configuração de regras (`RegrasVendas.tsx` / equivalente), lado a lado com o campo do boleto.

## Verificação
1. Selecionar "Na Entrega" no M1 sem venda prévia → M1 vira À Vista 50% travado, M2 aparece como Na Entrega 50% travado.
2. Alternar M1 de Boleto → Na Entrega sem "Recomeçar" → toast de bloqueio, estado inalterado.
3. Salvar venda e conferir em `/direcao/vendas/todas` → método persistido como À Vista + Entrega (mesma estrutura atual).