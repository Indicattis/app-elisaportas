## Objetivo

No card de "Venda Pendente de Pedido" (gestão de fábrica e demais consumidores), tornar o índice de parcelas (ex.: `3x`) clicável. Ao clicar, abrir um modal listando cada parcela com seu método de pagamento e valor.

## UX

- Trocar o `<span>` de parcelas em `VendaPendentePedidoCard.tsx` (linha ~521-525) por um botão discreto (mesmo visual, com `cursor-pointer hover:underline`).
- Clique abre `Dialog` (shadcn) intitulado "Parcelas da venda Nº {numero_venda}".
- Conteúdo: tabela compacta — colunas `#`, `Método`, `Vencimento`, `Valor`. Rodapé com total.
- Estado vazio: "Sem parcelas registradas". Loading: skeleton de 3 linhas.
- Clique no botão NÃO deve disparar o drag (stopPropagation no pointerDown).

## Dados

Buscar de `contas_receber` filtrando por `venda_id` (mesma fonte já usada em `useVendasPendentePedido.ts`). Campos: `metodo_pagamento`, `valor_parcela`, `numero_parcela`, `data_vencimento`, `pago_na_instalacao`.

Ordenar por `numero_parcela` ASC (fallback `data_vencimento`). Mostrar método via label amigável (reaproveitar mapeamento existente em `FormaPagamentoSelect`/`pagamentoResumo`).

Fetch sob demanda (apenas quando o modal abre), com `useQuery(['venda-parcelas', venda.id], …, { enabled: open })`.

## Arquivos

- Novo: `src/components/pedidos/VendaParcelasDialog.tsx` — Dialog + hook de fetch interno.
- Editar: `src/components/pedidos/VendaPendentePedidoCard.tsx` — substituir span de parcelas por trigger do dialog; manter visual idêntico quando `numero_parcelas` é nulo (mostra `—`, sem clique).

## Fora de escopo

- Edição de parcelas.
- Alterações em hooks de listagem ou no schema do banco.
