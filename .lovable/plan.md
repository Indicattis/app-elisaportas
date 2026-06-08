## Seletor de pedido existente no cadastro de acordo

No formulário `NovoAcordoDialog` (usado em `/autorizados/acordos/:ano/:mes`), adicionar uma caixa para vincular o acordo a um **pedido existente**, com filtro por **etapa**. Ao selecionar um pedido, os campos do cliente são preenchidos automaticamente para evitar digitação manual.

### Mudanças

**Novo componente** `src/components/autorizados/SeletorPedidoExistente.tsx`
- Caixa com:
  - Filtro de etapa: `Select` com opções derivadas das etapas existentes em `pedidos_producao` (`aberto`, `em_producao`, `embalagem`, `inspecao_qualidade`, `instalacoes`, `correcoes`, `aguardando_cliente`, `finalizado`) + opção "Todas".
  - Campo de busca por nome do cliente / número do pedido.
  - Lista (max-height + scroll) dos pedidos filtrados, mostrando `#numero_pedido — cliente_nome — badge da etapa`.
  - Clique em um item retorna `{ id, numero_pedido, cliente_nome, etapa_atual }` ao pai via `onSelect`.
- Carrega os pedidos com um único `select` em `pedidos_producao` (id, numero_pedido, cliente_nome, etapa_atual, status) ordenado por `numero_pedido` desc, limit 500. Cache via `useEffect` na montagem.

**Edição** `src/components/autorizados/NovoAcordoDialog.tsx`
- Acima do bloco CLIENTE, adicionar uma seção "VINCULAR A PEDIDO (opcional)" com o `SeletorPedidoExistente`.
- Ao selecionar:
  - Preencher `clienteNome` com `cliente_nome` do pedido.
  - Mostrar abaixo o número do pedido vinculado com botão "Remover vínculo".
  - Cidade/UF continuam sendo editáveis manualmente (a tabela `pedidos_producao` não armazena cidade/estado do cliente nessa instância).
- Não altera a assinatura de `NovoAcordo` nem o banco — o vínculo é só uma facilidade de preenchimento por enquanto. Se no futuro quisermos persistir o `pedido_id`, será outro passo.

### Arquivos

- (novo) `src/components/autorizados/SeletorPedidoExistente.tsx`
- (edit) `src/components/autorizados/NovoAcordoDialog.tsx`

### Pergunta de escopo (assumida)

O vínculo é apenas para autopreenchimento do nome do cliente; não vamos adicionar coluna `pedido_id` em `acordos_instalacao_autorizados` agora. Caso queira persistir o vínculo, sinalize e eu adiciono migração + coluna na próxima rodada.
