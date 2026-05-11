## Objetivo

Substituir o modal `GerenciarMateriasPrimasModal` (aberto pelo botão "Matérias-Primas" em `/fabrica/produtos`) por uma página dedicada em `/fabrica/produtos/materias-primas`, seguindo o mesmo estilo glassmorphism minimalista usado no restante da fábrica (`MinimalistLayout`, `bg-white/5`, `backdrop-blur-xl`, `border-white/10`).

## Passos

1. Criar `src/pages/fabrica/MateriasPrimas.tsx`:
   - Usa `MinimalistLayout` com título "Matérias-Primas", subtítulo curto e `backPath="/fabrica/produtos"`.
   - `headerActions`: botão "Nova" (gradient azul, mesmo estilo dos botões do header de `/fabrica/produtos`) que abre um drawer/dialog inline de criação.
   - Conteúdo: cards/lista com `bg-white/5 backdrop-blur-xl border-white/10`:
     - Busca por nome
     - Tabela glass com colunas Nome, Unidade, Estoque, Custo, Fornecedor, Itens vinculados, Ações (Editar/Excluir)
     - Formulário em painel lateral ou inline para criar/editar (mesmos campos do modal atual: nome, unidade, quantidade, custo unitário, fornecedor)
   - Usa o hook existente `useMateriasPrimas` (criar/editar/excluir) sem mudanças de lógica.
   - AlertDialog de confirmação para exclusão, idêntico ao atual.

2. Registrar a rota em `src/App.tsx`:
   - `/fabrica/produtos/materias-primas` → nova página, dentro do mesmo guard de acesso/route key usado por `/fabrica/produtos`.

3. Atualizar `src/pages/direcao/estoque/ProdutosFabrica.tsx`:
   - Botão "Matérias-Primas" passa a navegar para `/fabrica/produtos/materias-primas` (via `useNavigate`) em vez de abrir o modal.
   - Remover o estado `gerenciarMateriasPrimasOpen` e o `<GerenciarMateriasPrimasModal />`.
   - Manter o componente `GerenciarMateriasPrimasModal` no projeto por ora (sem novas referências) para evitar quebras em outros lugares; remover apenas se não houver outros usos.

## Detalhes técnicos

- Sem alterações em banco, hooks ou regras de negócio. Apenas extração de UI do modal para página dedicada.
- Estilo de botões do header igual ao já aplicado em `/fabrica/produtos` (gradient + `h-10 px-5 rounded-lg hover:scale-[1.02]`).
- Cards/tabela seguem padrão glass já usado em outras páginas da fábrica.
- Permissões: a nova rota herda a mesma key de acesso de `/fabrica/produtos`.
