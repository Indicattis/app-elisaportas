## Objetivo

Garantir que o menu flutuante de perfil (`FloatingProfileMenu`) apareça em todas as páginas do app, sem precisar importá-lo manualmente em cada uma.

## Situação atual

- O componente `FloatingProfileMenu` existe (`src/components/FloatingProfileMenu.tsx`) e já é usado em ~41 páginas, importado individualmente em cada uma.
- Páginas que não importam (ex.: várias rotas em `/direcao`, `/vendas`, `/logistica`, telas de login, etc.) ficam sem o menu.
- Existem 4 layouts compartilhados: `MinimalistLayout`, `AdminLayout`, `ProducaoLayout`, `PaineisLayout`.

## Plano

1. **Adicionar o `FloatingProfileMenu` aos 4 layouts compartilhados**
   - `MinimalistLayout.tsx`
   - `AdminLayout.tsx`
   - `ProducaoLayout.tsx`
   - `PaineisLayout.tsx`
   
   Renderizar `<FloatingProfileMenu mounted />` ao final de cada layout (fora do `children`), para que toda página que usa um desses layouts ganhe o menu automaticamente.

2. **Remover os imports/usos duplicados nas páginas**
   - Varrer as ~41 páginas que importam o componente diretamente e remover tanto o `import` quanto o `<FloatingProfileMenu ... />` renderizado.
   - Isso evita renderização dupla (dois menus sobrepostos) e centraliza a manutenção.

3. **Cobrir páginas sem layout compartilhado**
   - Identificar telas que não usam nenhum dos 4 layouts (ex.: páginas de auth/login, 404, telas standalone).
   - Para essas: ou envolver no layout apropriado, ou adicionar o `<FloatingProfileMenu />` direto.
   - Excluir explicitamente telas de login/autenticação, onde o menu não faz sentido.

## Pontos a confirmar

- **Telas de login/auth**: confirmo que o menu **NÃO** deve aparecer em telas de login, recuperação de senha e autenticação de produção (CPF). Correto?
- **Páginas standalone** (404, telas públicas, PDFs gerados): manter sem o menu?
