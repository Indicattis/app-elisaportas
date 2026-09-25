# Rastreio público de vendas

## Objetivo
Transformar **/vendas/acompanhar-pedido** em uma gestão de vendas com links públicos de acompanhamento. Cada venda terá um link automático que funcionará tanto em `app-elisa-portas.vercel.app` quanto em `sistema.elisaportas.com`, usando o domínio pelo qual o sistema estiver aberto.

## Página interna de acompanhamento
- Trocar a fonte da listagem de pedidos para vendas, incluindo vendas que ainda não possuem pedido de produção.
- Manter pesquisa e paginação, permitindo localizar por número da venda, nome, CPF/CNPJ ou telefone.
- Mostrar em cada venda o cliente, data, entrega, produtos e situação atual.
- Adicionar ações para copiar e abrir o link público de rastreio.
- Gerar a URL com o endereço atual do sistema (`/rastreio/<código>`), tornando o mesmo recurso compatível com os dois domínios.

## Página pública do cliente
- Criar uma rota pública, sem tela de login, acessível somente pelo código exclusivo da venda.
- Exibir uma apresentação visual e dinâmica com:
  - número e data da compra;
  - nome do cliente;
  - produtos, quantidades e medidas disponíveis;
  - modalidade e previsão de entrega, quando cadastradas;
  - situação atual em destaque;
  - linha do tempo das etapas, diferenciando etapas concluída, atual e futuras.
- Mostrar estados amigáveis ao cliente:
  - venda sem pedido: **Compra confirmada**;
  - pedido criado e ainda nas aprovações iniciais: **Pedido na fábrica!**;
  - `em_producao`: **Pedido em produção**;
  - demais etapas com textos próprios para inspeção, pintura, embalagem, entrega/coleta, instalação, correções, finalização e pós-venda.
- Exibir uma mensagem segura para código inválido ou indisponível, sem revelar dados internos.

## Segurança e dados
- Adicionar a cada venda um código público aleatório, único e automático; preencher também as vendas já existentes.
- Não abrir acesso público direto às tabelas internas.
- Criar uma consulta pública controlada que aceite somente o código de rastreio e devolva apenas os campos necessários da venda, produtos e andamento do pedido.
- Não expor CPF/CNPJ, telefone, endereço, valores, observações internas, responsáveis ou checklists no link público.

## Detalhes técnicos
- A página interna continuará protegida pelas permissões atuais de Vendas.
- A rota pública será registrada fora da proteção de login no roteador existente.
- A relação usada será `vendas → pedidos_producao → pedidos_etapas`, considerando também vendas sem registro em `pedidos_producao`.
- A linha do tempo seguirá o fluxo aplicável ao tipo de entrega e aos produtos da venda, aproveitando as etapas existentes do sistema.
- A atualização da etapa aparecerá no rastreio em novas consultas/atualizações da página, sem duplicar o controle de produção.

## Validação
- Conferir uma venda sem pedido, uma em produção e uma finalizada.
- Confirmar pesquisa, cópia e abertura do link na página interna.
- Abrir o link em sessão anônima e validar que não há redirecionamento para login.
- Testar URL profunda nos dois formatos de domínio e em telas de computador e celular.
- Confirmar que um código inválido não expõe nenhuma informação.
