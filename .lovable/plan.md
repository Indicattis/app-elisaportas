## Objetivo

Adicionar um novo botão laranja "Requisições Representantes" no hub `/direcao/vendas` que navega para uma nova página exibindo a tabela `requisicoes_venda` com o orçamento vinculado (`orcamentos_app`) e o representante.

## Alterações

### 1. `src/pages/direcao/VendasHubDirecao.tsx`
- Adicionar novo item no `menuItems` com `label: 'Requisições Representantes'`, ícone `FileText` (lucide), `path: '/direcao/vendas/requisicoes-representantes'`, `routePrefix: 'direcao_vendas'`, `variant: 'orange'`.
- Estender a lógica de `variant` em `renderButton` para suportar `'orange'` com gradiente `from-orange-500 to-orange-700` (mantendo padrão de sombra/borda do azul atual).

### 2. Nova página `src/pages/direcao/RequisicoesRepresentantesDirecao.tsx`
- Layout no mesmo padrão glassmorphism preto (bg-black, bg-white/5, backdrop-blur-xl, border-white/10).
- Breadcrumb: Home › Direção › Vendas › Requisições Representantes.
- Botão voltar para `/direcao/vendas`.
- Query: `requisicoes_venda` com join em `representantes` (nome) e `orcamentos_app` (número/cliente/valores).
- Tabela com colunas: Data, Representante, Orçamento (nº + cliente), Valor Total, Frete, Comissão (% e R$), Status, Observações.
- Filtro simples por status (badges).
- Click na linha abre detalhes do orçamento vinculado (se rota existir) ou expande observações.

### 3. `src/App.tsx`
- Adicionar import lazy de `RequisicoesRepresentantesDirecao`.
- Registrar rota `/direcao/vendas/requisicoes-representantes` dentro do bloco de Direção.

## Detalhes técnicos

- Cor laranja: gradiente Tailwind `from-orange-500 to-orange-700`, sombra `shadow-orange-500/20`, borda `border-orange-400/30`, hover `from-orange-400 to-orange-600`.
- Acesso protegido pelo mesmo `routePrefix: 'direcao_vendas'` já existente — sem nova permissão.
- Fetch via `supabase.from('requisicoes_venda').select('*, representantes(nome), orcamentos_app(*)')`.
