## Objetivo

Corrigir o breadcrumb e o botão "voltar" da tela de detalhes de venda (`/direcao/vendas/:id`) para refletir a origem correta — hoje ambos apontam para o hub `/direcao/vendas`, deixando de fora "Todas as Vendas".

## Alteração

Arquivo único: `src/pages/direcao/VendaDetalhesDirecao.tsx` (linhas ~307-317)

```tsx
<MinimalistLayout
  title="Detalhes da Venda"
  subtitle={venda.cliente_nome}
  backPath="/direcao/vendas/todas"
  fullWidth
  breadcrumbItems={[
    { label: "Home", path: "/home" },
    { label: "Direção", path: "/direcao" },
    { label: "Vendas", path: "/direcao/vendas" },
    { label: "Todas as Vendas", path: "/direcao/vendas/todas" },
    { label: "Detalhes" },
  ]}
```

Aplicar a mesma correção nos dois `MinimalistLayout` de fallback (loading/erro) nas linhas 273 e 286 — trocar `backPath="/direcao/vendas"` por `backPath="/direcao/vendas/todas"`.

Nenhuma outra alteração.
