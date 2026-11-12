# Vincular visita técnica a uma venda/pedido

## Situação atual
A visita não guarda qual venda ela pertence. Hoje o sistema "adivinha" a ligação comparando o nome ou o telefone do cliente da venda com o da visita. Quando a venda foi apagada e recriada, a ligação se perde se o nome/telefone não bater exatamente (visita "Célio Ivan Moraes Madruga", concluída em 05/11).

## O que vai mudar
1. **Botão "Vincular a venda"** no detalhe da visita no calendário de visitas técnicas (e também na tela de conclusão da visita).
   - Abre uma janela com busca por nome do cliente, telefone ou número do pedido.
   - Mostra as vendas encontradas (cliente, data, valor, nº do pedido se houver) e o usuário escolhe uma.
   - Depois de vinculada, a visita mostra "Vinculada à venda de X / Pedido #N" com opção de **Trocar** ou **Desvincular**.
2. **Ligação fixa:** quando há vínculo escolhido, o sistema usa ele para dizer que a venda tem medição (e para achar a folha de medição/PDF da visita). Sem vínculo, continua a comparação por nome/telefone de hoje, então nada antigo quebra.
3. Uma venda pode ter só uma visita vinculada de forma manual de cada vez é desnecessário restringir — várias visitas podem apontar para a mesma venda.

## Detalhes técnicos
- Migração: `ALTER TABLE visitas_tecnicas_agendadas ADD COLUMN venda_id uuid REFERENCES vendas(id) ON DELETE SET NULL` + índice. RLS existente cobre o UPDATE.
- Novo componente `VincularVendaVisitaDialog` (busca em `vendas` com `pedidos_producao(numero_pedido)`, limite 30).
- `VisitasTecnicasCalendario.tsx` e `VisitaTecnicaConclusao.tsx`: exibir vínculo + botões.
- `useVendaTemMedicao`: primeiro procura visita concluída com `venda_id = vendaId`; senão, fallback atual.
