# Frete automático em /vendas/minhas-vendas/nova

## O que fazer

Em `src/pages/vendas/VendaNovaMinimalista.tsx`, alterar o campo de Frete para que:

1. Quando a cidade e o estado do cliente estiverem preenchidos e existir um registro ativo correspondente em `frete_cidades` (origem de `/logistica/frete/internos`):
   - O `valor_frete` é preenchido automaticamente com o valor cadastrado.
   - O input fica **bloqueado** (`readOnly`/`disabled`) com indicação visual de auto-preenchimento.
   - Mostrar uma badge informativa do tipo "Frete automático para {cidade}/{estado}".

2. Quando não houver frete cadastrado para a cidade/estado:
   - O input fica **liberado** para preenchimento manual.
   - Exibir um aviso discreto: "Sem frete cadastrado para esta cidade — preencha manualmente".

3. Se a cidade/estado mudar, o valor do frete é recalculado (sobrescrito pelo automático ou liberado para edição).

## Detalhes técnicos

- `freteSugerido` (memo já existente, linhas ~286-294) continua sendo a fonte da busca em `fretes` via `useFretesCidades()`.
- Substituir o bloco atual (badge "Sugerido" + botão "Usar") por aplicação automática via `useEffect` que dispara quando `freteSugerido?.valor_frete` muda, atualizando `formData.valor_frete`.
- Adicionar `disabled={!!freteSugerido}` (ou `readOnly`) no `<Input id="valor_frete">` e ajuste de estilos (cursor-not-allowed, opacity).
- Manter o handler `onChange` somente para o caso manual.
- Não alterar lógica de cálculo de total nem de submissão — apenas a forma como `valor_frete` é definido.

## Fora de escopo

- Edição de venda existente (`VendaEditarMinimalista.tsx`) — não foi pedido.
- Mudanças na tabela `frete_cidades` ou no hub de logística.
