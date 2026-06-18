## Objetivo

Permitir marcar cada parcela como "Pago na instalação" no faturamento da venda, e exibir essa informação nas downbars de Vendas Pendentes de Pedido (modal de parcelas).

## Banco

Sem migração — coluna `contas_receber.pago_na_instalacao` (boolean) já existe.

## 1. Faturamento da Venda — `src/pages/administrativo/FaturamentoVendaMinimalista.tsx`

Na seção **Parcelas / Contas a Receber**, em cada linha de parcela:

- Adicionar um `Switch` (ou checkbox compacto) rotulado **"Pago na instalação"** ao lado dos campos existentes (método, vencimento, valor).
- Estender o `select(...)` (linha ~236) para incluir `pago_na_instalacao`.
- Ao alternar: `UPDATE contas_receber SET pago_na_instalacao = <bool> WHERE id = <parcelaId>` e atualizar o estado local `contasReceber`.
- Incluir o campo `pago_na_instalacao: false` no payload de `handleAddParcela` e nos objetos gerados em `handleGerarParcelas` (default `false`).
- Toast curto de confirmação ("Parcela atualizada").

## 2. Modal de Parcelas (downbar Venda Pendente de Pedido) — `src/components/pedidos/VendaParcelasDialog.tsx`

O componente já busca `pago_na_instalacao`. Hoje só renderiza badge "Na entrega" condicionalmente. Ajustes:

- Adicionar coluna dedicada **"Instalação"** na tabela, exibindo badge `Pago na instalação` (variant `secondary` com ícone `Wrench`) quando `true`, e `—` quando `false`.
- Manter as colunas existentes (#, Método, Vencimento, Valor, Status) e o total no rodapé inalterados.
- Apenas leitura (sem edição neste modal — edição continua no faturamento).

## Fora de escopo

- Formulário de Nova Venda e snapshot de `requisicoes_aprovacao_venda` não serão alterados (usuário confirmou que a "solicitação anterior" se refere às downbars de pendentes de pedido).
- Nenhuma alteração em regras de negócio de pagamento, geração de parcelas ou cálculos.

## Arquivos tocados

- `src/pages/administrativo/FaturamentoVendaMinimalista.tsx` (edição UI + handler)
- `src/components/pedidos/VendaParcelasDialog.tsx` (nova coluna)
