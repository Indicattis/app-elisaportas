# Resumo dos descontos — cadastro de venda

Adicionar uma nova seção no fluxo de cadastro/edição de venda (`/vendas/minhas-vendas/nova`) exibindo, de forma consolidada, os três preços de referência e um campo de justificativa.

## O que a seção mostra

Card no estilo glassmorphism da página, posicionado logo após o `VendaResumo` (antes do indicador verde de autorização), visível apenas quando houver ao menos um produto (`portas.length > 0`).

Três linhas de valores:

1. **Preço tabelado dos produtos** — soma de `preco_unitario × quantidade` de todas as portas/itens, sem qualquer desconto ou acréscimo aplicado.
2. **Preço limite de descontos** — preço tabelado menos o desconto máximo permitido pelas regras vigentes para o vendedor (`limites.totalSemSenha` de `useConfiguracoesVendasPublicas` combinado ao método de pagamento / temperatura selecionados). Representa o piso a partir do qual seria necessária autorização.
3. **Preço final** — valor efetivamente cobrado após descontos aplicados linha a linha + ajuste global, já disponível em `subtotalProdutosMemo + valorAjusteGlobalSigned` (sem frete/crédito, para manter comparabilidade com os outros dois).

Cada linha mostra:
- Rótulo à esquerda
- Valor formatado em BRL à direita
- Nas linhas 2 e 3, um badge com o percentual de diferença em relação ao tabelado

Uma faixa de status abaixo indica se o preço final está **dentro do limite** (verde) ou **abaixo do limite** (âmbar — nesse caso o campo justificativa fica destacado como obrigatório visual, mas não bloqueia).

## Campo Justificativa

- `Textarea` (3 linhas) com placeholder "Explique o motivo do desconto concedido…".
- Estado local `justificativaDesconto: string`.
- Persistido no submit dentro de `campos_personalizados.justificativa_desconto` do payload da venda em `useVendas.ts` (evita migração de schema).
- Ao carregar rascunho, o valor é reidratado a partir do mesmo caminho.
- Exibido também na tela de visualização de rascunho (`RascunhoView.tsx`) em modo somente leitura.

## Arquivos afetados

- `src/pages/vendas/VendaNovaMinimalista.tsx` — novo componente inline `ResumoDescontosSection` + estado `justificativaDesconto` + inclusão no payload.
- `src/components/vendas/ResumoDescontosSection.tsx` (novo) — apresentação da seção.
- `src/hooks/useVendas.ts` — ler/gravar `justificativa_desconto` em `campos_personalizados`.
- `src/pages/vendas/RascunhoView.tsx` — exibir justificativa quando presente.

## Detalhes técnicos

- Reaproveita `subtotalProdutosMemo`, `valorAjusteGlobalSigned` e `validacaoDescontoMemo` já existentes — nenhum recálculo novo pesado.
- Limite: `precoTabelado × (1 - limitePermitido/100)`, onde `limitePermitido` vem de `validacaoDescontoMemo.limitePermitido` (já considera método de pagamento e temperatura).
- Formatação via `formatCurrency` de `src/lib/utils.ts`.
- Sem alteração em regras de negócio, RLS ou schema do banco.
