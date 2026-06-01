# Botão "Lista de Materiais (Teste)" em /fabrica/produtos

## Objetivo
Adicionar um botão no header da página `/fabrica/produtos` que gera um PDF de **Lista de Materiais** com dados de exemplo, reaproveitando o mesmo gerador usado em `/direcao/gestao-fabrica`.

## O que será feito

1. Em `src/pages/direcao/estoque/ProdutosFabrica.tsx`:
   - Importar `gerarListaComprasPDF` e `ItemListaCompras` de `@/utils/listaComprasPDF`.
   - Criar um handler `handleGerarListaTeste` que monta um array de `ItemListaCompras` com 6–8 itens fictícios (variando categoria, unidade e quantidades) e chama `gerarListaComprasPDF("Exemplo - Teste", itens)`.
   - Adicionar um novo `<button>` no bloco `headerActions` (junto aos botões PDF / Imprimir / Categorias), com ícone `FileText` (lucide-react) e label **"Lista de Materiais"**, seguindo o mesmo padrão visual glassmorphism / gradient dos botões vizinhos (tom neutro tipo `zinc` para diferenciar do "Novo Produto").
   - Exibir um `toast` de sucesso/erro consistente com o resto da página.

## Detalhes técnicos
- Nenhum acesso ao banco: dados são hard-coded apenas para demonstrar o formato do PDF.
- Sem alterações em `listaComprasPDF.ts`, em rotas, ou em outras páginas.
- Botão visível para qualquer usuário que já tenha acesso a `/fabrica/produtos`.

## Fora de escopo
- Vincular a lista a estoque/matérias-primas reais.
- Alterar layout ou conteúdo do PDF.
- Adicionar o botão a outras páginas.
