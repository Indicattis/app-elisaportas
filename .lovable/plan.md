## Objetivo
Adicionar um botão "Gerenciar Cores" no header da página `/direcao/estrategia/itens` que abre a gestão de cores da pintura epóxi (usadas nas vendas).

## Abordagem
Já existe a página `src/pages/vendas/CatalogoCores.tsx` (rota `/marketing/catalogo/cores`) usando o hook `useCatalogoCores`, com CRUD completo (adicionar, editar, ativar/desativar cor). Vou reaproveitar essa UI em um Dialog dentro da página `EstrategiaItens`, evitando duplicação.

## Alterações
1. **`src/components/direcao/estrategia/GerenciarCoresDialog.tsx` (novo)**
   - Componente que encapsula o mesmo grid + modal de nova/editar cor que existe em `CatalogoCores.tsx`.
   - Recebe `open`/`onOpenChange` e renderiza dentro de `<Dialog>` largo.
   - Usa `useCatalogoCores` para dados e mutations.

2. **`src/pages/direcao/estrategia/EstrategiaItens.tsx`**
   - Importar o novo dialog e adicionar estado `coresDialogOpen`.
   - No bloco `headerActions` (linha 973), adicionar um `Button` com ícone `Palette` "Gerenciar Cores" antes/junto dos demais botões.
   - Renderizar `<GerenciarCoresDialog />` no final do JSX.

## Fora de escopo
- Não altero a rota `/marketing/catalogo/cores` existente.
- Não altero o hook `useCatalogoCores` nem o schema `catalogo_cores`.
- Nenhuma mudança de business logic.
