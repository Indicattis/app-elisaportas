## Objetivo
Adicionar workflow de status com 5 estados em `/marketing/videos-ideias`: **Gravar** (inicial), **Editar**, **Aprovar**, **Postado**, **Rejeitado**. Transições livres por qualquer usuário, com abas de filtro e badge no card.

## Banco
Migration:
- Adicionar coluna `status TEXT NOT NULL DEFAULT 'gravar'` em `marketing_videos_ideias`.
- CHECK constraint: status IN ('gravar','editar','aprovar','postado','rejeitado').
- Index em `status`.

## Frontend (`src/pages/marketing/VideosIdeias.tsx`)
- Constantes `STATUS_OPTIONS` com label + cor (Tailwind semantic-ish): Gravar=blue, Editar=amber, Aprovar=violet, Postado=emerald, Rejeitado=rose.
- Abas no topo da lista usando `Tabs` (shadcn): "Todos | Gravar | Editar | Aprovar | Postado | Rejeitado" com contador por status.
- Estado local `statusFiltro` filtra `ideias` antes de renderizar.
- Card:
  - Badge colorida do status no canto superior esquerdo (ao lado do título), seguindo glassmorphism.
  - Clique na badge abre `DropdownMenu` com os outros 4 status; ao escolher, dispara mutation `atualizarStatus` (otimista, padrão idêntico ao `reordenar`).
- Query inclui `status` no select.
- DnD continua funcionando independente do filtro (reordenar persiste posição global).

## Tipos
- `Ideia.status: 'gravar' | 'editar' | 'aprovar' | 'postado' | 'rejeitado'`.
