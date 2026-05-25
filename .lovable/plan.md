## Objetivo
Permitir selecionar múltiplos autores (colaboradores ativos) ao cadastrar uma ideia em `/marketing/videos-ideias`. Obrigatório no mínimo 1.

## Banco
Migration:
- Adicionar coluna `autores_ids UUID[] NOT NULL DEFAULT '{}'` em `marketing_videos_ideias`.
- Adicionar coluna `autores_nomes TEXT[] NOT NULL DEFAULT '{}'` (snapshot dos nomes para exibição estável, evita join).

## Frontend (`src/pages/marketing/VideosIdeias.tsx`)
- Query nova para buscar colaboradores: `admin_users` com `ativo=true` e `eh_colaborador=true`, ordenados por `nome`.
- No modal de "Nova ideia":
  - Campo multi-select com checkboxes (Popover + Command, padrão shadcn) listando colaboradores. Mostrar chips dos selecionados.
  - Validação Zod: `autores_ids: z.array(z.string().uuid()).min(1, "Selecione ao menos 1 autor")`.
  - Botão "Confirmar" desabilita se nenhum selecionado.
- Mutation `criar`: salvar `autores_ids` e `autores_nomes` (resolvidos a partir da lista de colaboradores).
- Reset do estado de autores ao fechar/limpar.

## Exibição nos cards
- Substituir/complementar o rodapé `criado_por_nome` com chips ou lista de autores (`autores_nomes`). Mantém data à direita. Se vazio (registros legados), fallback para `criado_por_nome`.

## Tipos
- Atualizar interface `Ideia` com `autores_ids: string[]` e `autores_nomes: string[]`.
