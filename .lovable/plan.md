## Objetivo

Em `/direcao/estrategia/precos`, mover o cabeçalho ("Itens Avulso" + contagem de itens) para **fora** do card lateral, igual ao padrão de "Itens Cadastrados" da tabela principal ao lado.

## Mudança

Arquivo único: `src/pages/direcao/estrategia/EstrategiaPrecos.tsx`

Reestruturar a coluna `<aside>` (atualmente um único card que envolve título + tabela) em dois blocos verticais:

1. **Cabeçalho fora do card** — `<div>` com:
   - Título `Itens Avulso` (mesmo tamanho/peso de "Itens Cadastrados": `text-base font-medium text-white`)
   - Subtítulo `{n} itens disponíveis` (`text-xs text-white/50`)
   - O ícone `Package` em pill pode ser removido para alinhar com o padrão minimalista do lado esquerdo (que não usa ícone), mantendo o visual consistente.

2. **Card só com a tabela** — `<div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 ...">` contendo apenas a tabela scrollável e o estado vazio.

Wrapper externo `<aside className="flex flex-col gap-4 lg:sticky lg:top-4 ...">` preserva o sticky e o `max-h` da coluna.

```text
┌─ grid lg:[1fr_360px] ───────────────────────────┐
│ Itens Cadastrados        │ Itens Avulso         │  ← títulos fora dos cards
│ ─ subtitle ─             │ ─ subtitle ─         │
│ ┌──────────────────────┐ │ ┌──────────────────┐ │
│ │ tabela kits          │ │ │ tabela avulsos   │ │
│ └──────────────────────┘ │ └──────────────────┘ │
└─────────────────────────────────────────────────┘
```

## Fora de escopo

- Nenhuma mudança em `TabelaPrecos.tsx`, hooks ou dados.
- Sem alterações de lógica, filtros ou export.
