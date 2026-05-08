## Objetivo
Adicionar botão "Categorias" no header de `/fabrica/produtos` para abrir o modal de gerenciamento de categorias já existente.

## Mudanças em `src/pages/direcao/estoque/ProdutosFabrica.tsx`

1. Importar `GerenciarCategoriasModal` de `@/components/estoque/GerenciarCategoriasModal` e o ícone `Tags` (ou `FolderTree`) de `lucide-react`.
2. Adicionar state `const [gerenciarCategoriasOpen, setGerenciarCategoriasOpen] = useState(false);`.
3. Em `headerActions`, inserir antes do botão PDF um novo `<Button>` outline (mesmo estilo dos demais — `bg-white/5 border-white/10 text-white hover:bg-white/10`) com ícone + label "Categorias", que faz `setGerenciarCategoriasOpen(true)`.
4. Renderizar `<GerenciarCategoriasModal open={gerenciarCategoriasOpen} onOpenChange={setGerenciarCategoriasOpen} />` ao final do JSX (junto aos outros Dialogs).

## Fora de escopo
- Sem mudanças no modal de gerenciamento (já implementado).
- Sem mudanças no banco de dados.
- A query `useCategorias` já invalida automaticamente após edições no modal, então o select inline da coluna Categoria refletirá novas categorias sem ajustes.
