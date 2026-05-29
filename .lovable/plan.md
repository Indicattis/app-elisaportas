# Abas em /direcao/estrategia/kits

Substituir os botões do header por abas no estilo do print (pílulas com a aba ativa em azul sólido).

## Estrutura

`EstrategiaKits.tsx` passa a renderizar três abas:

1. **Portas** — conteúdo atual (`TabelaPrecos` via `<TabelaPrecos … />`).
2. **Instalações** — bloco de cabeçalho + `<ConfigLucroEstatico tipo="instalacao" …>` (extraído de `EstrategiaLucroInstalacoes.tsx`).
3. **Pinturas** — bloco de cabeçalho + `<ConfigLucroEstatico tipo="pintura_epoxi" modosDisponiveis=["estatico","formula_dimensao"]>` (extraído de `EstrategiaLucroPinturas.tsx`).

A aba ativa é controlada por `?tab=portas|instalacoes|pinturas` para permitir deep-link e preservar o estado no refresh; default = `portas`.

## UI das abas

Componente local — container `rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-1 flex` com 3 botões:

- Inativo: `text-white/70 hover:text-white px-6 py-2.5 text-sm rounded-xl transition`
- Ativo: `bg-blue-600 text-white shadow-lg shadow-blue-600/20 px-6 py-2.5 text-sm rounded-xl`

Posicionado entre o header da `MinimalistLayout` e o conteúdo da aba. Ícones (Package / Wrench / Paintbrush) à esquerda do label.

## Rotas legadas

Mantidas:

- `/direcao/estrategia/kits/lucro-instalacoes` → redireciona para `/direcao/estrategia/kits?tab=instalacoes`
- `/direcao/estrategia/kits/lucro-pinturas` → redireciona para `/direcao/estrategia/kits?tab=pinturas`

Os arquivos `EstrategiaLucroInstalacoes.tsx` e `EstrategiaLucroPinturas.tsx` viram thin wrappers que apenas chamam `<Navigate replace to=… />` para evitar quebrar bookmarks/links externos.

## Header

Os botões extra ("Lucro de Instalações", "Lucro de Pinturas", "Template padrão") saem do header de Portas — Lucro vira aba, e o "Template padrão" continua acessível como botão menor exclusivo da aba Portas (não no header global), mantendo o link `/direcao/estrategia/kits/template`.

## Arquivos tocados

- `src/pages/direcao/estrategia/EstrategiaKits.tsx` — refatorado para abas + roteamento por query string.
- `src/pages/direcao/estrategia/EstrategiaLucroInstalacoes.tsx` — vira redirect.
- `src/pages/direcao/estrategia/EstrategiaLucroPinturas.tsx` — vira redirect.

## Fora de escopo

- Mudar fórmulas/conteúdo dos cards de Instalações e Pinturas.
- Alterar `TabelaPrecos` (Portas) em si.
