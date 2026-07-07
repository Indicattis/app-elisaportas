# Correção de cache no app

## Problema
Após um novo deploy, alguns usuários ficam com o app quebrado e só conseguem entrar em outro navegador / aba anônima. Isso acontece porque o navegador reaproveita o `index.html` antigo em cache, que aponta para arquivos JS (com hash) que já não existem mais no servidor — resultando em telas em branco ou `ChunkLoadError`.

Não há service worker envolvido; é apenas cache HTTP do HTML no navegador.

## Solução (2 camadas)

### 1. Impedir cache do `index.html`
Adicionar metatags no `<head>` do `index.html` para instruir o navegador a nunca reter o HTML:

```html
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
<meta http-equiv="Pragma" content="no-cache" />
<meta http-equiv="Expires" content="0" />
```

Os arquivos JS/CSS continuam com hash no nome (`index-abc123.js`), então podem seguir em cache longo normalmente — só o HTML passa a ser sempre revalidado.

### 2. Auto-reload em erro de chunk
Criar `src/lib/chunkReload.ts` e importar em `src/main.tsx`. Ele escuta `window.error` e `unhandledrejection`; quando detecta mensagem típica de chunk faltando (`Failed to fetch dynamically imported module`, `ChunkLoadError`, `Loading chunk ... failed`), força um `window.location.reload()` uma única vez por sessão (guardado em `sessionStorage` para não entrar em loop).

Isso cobre usuários que já estavam com a aba aberta no momento do deploy.

## Fora de escopo
- Não instalar service worker / PWA.
- Não mexer em headers do servidor (Lovable hosting já serve HTML com cache curto, mas a metatag garante independente da hospedagem).
- Não alterar chunks/build do Vite — hashing já está correto.

## Arquivos afetados
- `index.html` — adicionar 3 metatags de cache.
- `src/lib/chunkReload.ts` — novo, ~20 linhas.
- `src/main.tsx` — 1 linha de import.
