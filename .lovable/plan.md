## Problema

Em `/vendas/minhas-vendas/nova` o breadcrumb mostra apenas `Home > Nova Venda`. O `MinimalistLayout` só reconhece `backPath="/vendas"` no auto-gerador, e a página passa `backPath="/vendas/minhas-vendas"`, então cai no fallback.

## Correção

Em `src/pages/vendas/VendaNovaMinimalista.tsx`, passar `breadcrumbItems` explícito ao `<MinimalistLayout>`:

```
Home  >  Vendas  >  Minhas Vendas  >  Nova Venda
```

Itens:
- `{ label: 'Home', path: '/home' }`
- `{ label: 'Vendas', path: '/vendas' }`
- `{ label: 'Minhas Vendas', path: '/vendas/minhas-vendas' }`
- `{ label: 'Nova Venda' }`

Sem outras mudanças.