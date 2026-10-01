# Novo tipo de entrega "Autorizado" na venda

## O que muda para o vendedor
Em /vendas/minhas-vendas/nova, ao lado de Instalação, Entrega e Manutenção, aparece a opção **Autorizado**. Ao escolher:
- **Autorizado responsável** (obrigatório) — lista dos autorizados ativos, com busca.
- **Valor acordado da instalação** (obrigatório, maior que zero).
- **Observação** (opcional, até 500 caracteres).

A venda não salva sem autorizado e valor. O valor acordado funciona como o frete: **não soma no total da venda, no lucro nem no faturamento**.

## Onde a informação aparece
Bloco "Modalidade: Autorizado — {nome} — R$ valor acordado — observação" em:
- Detalhes/edição da venda (Minhas Vendas e Direção).
- Faturamento da venda (para conferência).
- Pedido (visualização do pedido e PDF do pedido de produção).

Na edição da venda os três campos podem ser alterados.

## Logística
O pedido segue o fluxo de instalação, já com o autorizado selecionado definido como responsável da instalação (tipo "autorizados"), evitando escolher de novo na expedição.

## Detalhes técnicos
- Migração em `vendas`: `autorizado_instalacao_id uuid` (FK autorizados, ON DELETE SET NULL), `valor_acordado_autorizado numeric DEFAULT 0`, `observacao_autorizado text`. Trigger de validação: se `tipo_entrega='autorizado'`, exige autorizado e valor > 0.
- `VendaNovaMinimalista.tsx` / `VendaEditarMinimalista.tsx` / `MinhasVendasEditar.tsx`: novo botão, campos condicionais, validação zod, regra de instalação (`entregaComInstalacao`) incluindo 'autorizado'.
- `useVendas.ts`: persistir campos; valor acordado fora de `valor_venda`.
- Exibição: `FaturamentoVendasMinimalista.tsx`, `PedidoViewMinimalista.tsx`, `VendaPendenteDetalhesSheet.tsx`, `pedidoProducaoPDFGenerator.ts` + `buscarDadosPedidoProducaoPDF.ts`.
- Rótulos de `tipo_entrega` ("Autorizado") nas listas/badges que hoje mapeiam instalacao/entrega/manutencao.
- Criação da instalação do pedido: preencher `tipo_instalacao='autorizados'` e o autorizado quando a venda for desse tipo.
