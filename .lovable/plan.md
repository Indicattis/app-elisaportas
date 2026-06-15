## Objetivo
Em `/autorizados/acordos/:ano/:mes` (e contexto direção), substituir o vínculo do acordo de instalação de **pedido de produção** para **venda**.

## Mudanças

### 1. Banco (migração)
- Adicionar coluna `venda_id uuid` em `acordos_instalacao_autorizados` referenciando `vendas(id) ON DELETE SET NULL`.
- Criar índice `idx_acordos_venda_id` em `venda_id`.
- Manter coluna `pedido_id` apenas como legado (não usada em novas inserções, não exibida no seletor).

### 2. `src/components/autorizados/SeletorPedidoExistente.tsx` → renomear para `SeletorVendaExistente.tsx`
- Trocar consulta de `pedidos_producao` para `vendas`.
- Selecionar: `id, cliente_nome, cliente_cidade, cliente_estado, data_venda, is_rascunho, status_aprovacao`.
- Ordenar por `data_venda desc`, limite 500. Filtrar fora `is_rascunho = true`.
- Trocar consulta de duplicidade para `acordos_instalacao_autorizados.venda_id`.
- Remover o filtro por etapa (não existe em vendas). Manter apenas busca por cliente.
- Tipo: `VendaSelecionada { id, cliente_nome, cliente_cidade, cliente_estado, data_venda }`.
- Label: "VINCULAR A VENDA *".
- Exibir cada linha como `Cliente · Cidade/UF · dd/MM/yyyy`.

### 3. `src/hooks/useAcordosAutorizados.ts`
- Trocar `pedido_id` por `venda_id` em `NovoAcordo` e no `insert` do `createAcordo`.

### 4. `src/components/autorizados/NovoAcordoDialog.tsx`
- Trocar import e uso de `SeletorPedidoExistente` para `SeletorVendaExistente`.
- Estado `vendaVinculada` no lugar de `pedidoVinculado`.
- Ao selecionar venda, autopreencher `cliente_nome`, `cliente_cidade`, `cliente_estado` se vazios.
- `onSave` envia `venda_id` em vez de `pedido_id`.
- Validação obrigatória passa a exigir `vendaVinculada?.id`.

### 5. Não alterar
- `AcordosMesAutorizados.tsx`, `ConfirmarPagamentoAcordoDialog`, `HistoricoAcordoDialog`, `gastoAcordoAutorizado.ts` (não referenciam `pedido_id`).
- Acordos antigos com `pedido_id` continuam intactos no banco.

## Observação
A coluna `pedido_id` ficará obsoleta mas preservada para histórico. Posso removê-la em migração futura se quiser limpeza.
