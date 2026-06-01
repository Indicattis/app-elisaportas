## Objetivo
Adicionar ao hub `/vendas` um botão que leve a uma nova página de **visualização (read-only)** das regras de vendas.

## Escopo
1. **Novo botão** em `VendasHub.tsx` — item "Regras de Vendas" com ícone apropriado, posicionado na lista existente.
2. **Nova página** `src/pages/vendas/RegrasVendasVisualizacao.tsx` — exibe os dados da tabela `regras_vendas` (limites de desconto, formas de pagamento, campos obrigatórios, etc.) usando `useRegrasVendas`, sem controles de edição. Layout no mesmo estilo minimalista/glassmorphism das outras páginas de vendas.
3. **Rota** em `App.tsx` — `/vendas/regras` apontando para a nova página, dentro do grupo de rotas do hub de vendas.
4. **Não inclui** edição de regras, gerenciamento de senhas nem alterações na página existente de direção.

## Detalhes técnicos
- Reutilizar o hook `useRegrasVendas` para buscar os dados.
- Apresentar as seções de forma organizada (Cards com títulos): Descontos, Formas de Pagamento, Campos Obrigatórios, Regras Gerais.
- Não precisa de controle de acesso adicional — qualquer usuário autenticado no hub de vendas pode visualizar.