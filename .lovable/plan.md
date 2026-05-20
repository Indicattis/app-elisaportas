# Pintura: permitir múltiplos itens vinculados

## Comportamento atual
No modal de pintura (criação de venda), só dá pra escolher **um** item da lista (RadioGroup). É escolhido item + cor + valor → cria 1 registro de `pintura_epoxi` vinculado àquele item.

## Comportamento novo
Trocar a seleção de **rádio** para **checkboxes** (multi-seleção). O usuário marca quantos itens quiser, define cor e valor único, e o sistema cria **uma pintura por item selecionado**, com o valor da pintura **dividido igualmente** entre eles.

### Regras
- "Pintura avulsa" continua existindo como opção exclusiva (se marcada, desmarca os itens; se marcar um item, desmarca avulsa).
- Itens já com `tipo_produto = 'pintura_epoxi'` continuam ocultos da lista (regra atual).
- O campo de valor passa a ser **manual** (sem auto-preenchimento pela tabela de preços, já que com vários itens cada um teria preço diferente). O placeholder/label explica: "Valor total — será dividido entre os itens selecionados".
- Ao confirmar:
  - **Avulsa:** cria 1 registro como hoje, com `valor_pintura = valor digitado`.
  - **N itens selecionados:** cria N registros (um por item), cada um com `valor_pintura = valor_digitado / N` (arredondamento padrão JS, sem ajuste de centavo residual — alinhado com o resto do sistema).
  - Cada registro herda largura/altura do item vinculado e descrição `"Pintura Eletrostática (Cor) - <descrição do item>"`.
- Validação: precisa ter cor + valor > 0 + (avulsa marcada OU ≥ 1 item marcado).

## Arquivos afetados
- `src/components/vendas/PinturaItemCatalogoModal.tsx` — troca `RadioGroup`/`RadioGroupItem` por `Checkbox`, estado vira `Set<string>`, `handleConfirmar` passa a emitir array; ajusta props para `onConfirm: (pinturas: ProdutoVenda[]) => void`. Remove o `useEffect` de auto-preenchimento de valor (não faz sentido com multi-seleção).
- `src/pages/vendas/VendaNovaMinimalista.tsx` — handler `onConfirm` recebe array e dá `setPortas(prev => [...prev, ...pinturas])` antes do recalcular.

## Fora de escopo
- Não mexe em edição de venda (`VendaEditarDirecao` etc.) nem em outros modais de pintura.
- Não cria trigger nem migration — comportamento é só de UI/agrupamento.
- Não toca em desconto, custos ou regras de faturamento.
