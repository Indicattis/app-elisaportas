## Causa

Em `HistoricoContratos.tsx`, o botão "Ver" abre `window.open(e.contrato_url)` diretamente. O `contrato_url` guardado em `vendas` é apenas o **path relativo** dentro do bucket privado `contratos-vendas` (ex.: `111ad4b2-.../1784211176756-contrato.pdf`). O navegador resolve isso contra a origem atual e cai como rota SPA → React Router responde "Page not found".

O padrão correto já existe em `ContratosVendas.tsx`: gerar uma URL assinada com `supabase.storage.from('contratos-vendas').createSignedUrl(path, 300)` antes de abrir.

## Mudança

### `src/pages/vendas/HistoricoContratos.tsx`
- Trocar o `onClick` do botão "Ver" por um handler assíncrono que:
  1. Chama `supabase.storage.from('contratos-vendas').createSignedUrl(e.contrato_url, 300)`
  2. Se der erro ou vier vazio, mostra `toast.error('Não foi possível abrir o contrato')`
  3. Se ok, `window.open(signedUrl, '_blank')`
- Suportar o caso legado (`contrato_url === 'legado'`): não mostrar o botão "Ver" nesse caso (só string sentinela, sem arquivo real).

## Fora de escopo

- Não altera armazenamento nem RLS do bucket.
- Não mexe em outras telas.
