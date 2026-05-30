## Objetivo

Atualizar a tela de erro do `ErrorBoundary` para o branding minimalista atual da aplicação (glassmorphism — `bg-white/5`, `backdrop-blur-xl`, `border-white/10`, paleta azul/branco com fundo escuro gradiente).

## Mudanças

### `src/components/ErrorBoundary.tsx`
Reescrever o fallback padrão para:
- Fundo escuro com gradiente (slate-950 → slate-900) cobrindo viewport.
- Card central glassmorphism (`bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 max-w-md`).
- Ícone de alerta (`AlertTriangle` do lucide) num círculo `bg-red-500/15 text-red-300`.
- Título "Algo deu errado" em branco, semibold.
- Subtítulo em `text-white/60` mantendo a mensagem atual.
- Botão "Recarregar página" estilizado com gradiente azul (`bg-blue-500 hover:bg-blue-400 text-white`) com ícone `RefreshCw`.
- Opcional: bloco discreto mostrando `error.message` em `text-xs text-white/30 font-mono`, truncado, só quando existir.

Sem mudanças em comportamento, apenas visual.
