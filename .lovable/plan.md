## Aplicar visual de /direcao/gestao-fabrica em /logistica/expedicao

Unificar a aparência da página de Expedição com a Gestão de Fábrica: mesmo shell (MinimalistLayout), mesma paleta glass branca/azul, mesmo estilo de tabs com avatares grandes e mesmas wrappers de card.

### Mudanças por seção

**1. Shell da página**
- Substituir o wrapper customizado (`min-h-screen bg-black ...` + header sticky próprio) por `<MinimalistLayout title="Expedição" subtitle={...periodo} backPath="/logistica" breadcrumbItems={...} headerActions={...} fullWidth>` — mesmo padrão usado em GestaoFabricaDirecao.
- Mover os botões do header atual (Novo Neo, alternar week/month, Hoje, Sair) para `headerActions`, usando o estilo `bg-white/5 border-blue-500/10 text-white hover:bg-white/10` (igual aos botões do header da Gestão).
- Subtítulo dinâmico: o intervalo da semana ou nome do mês atual.

**2. Wrappers Card → glass branca**
- Trocar `bg-primary/5 border-primary/10 backdrop-blur-xl` por `bg-white/5 border-white/10 backdrop-blur-xl rounded-xl` (mesma classe da Gestão) nos dois Cards: o do calendário e o da listagem por etapa.
- Padding interno e estrutura permanecem.

**3. TabsList das etapas (desktop)**
- Aplicar exatamente o estilo da Gestão de Fábrica:
  - `TabsList`: `w-full justify-start overflow-x-auto flex-nowrap h-[85px] p-1.5 gap-2 bg-white/5 border border-white/10 backdrop-blur-xl rounded-xl`.
  - Cada `TabsTrigger`: `flex-shrink-0 flex-row items-center justify-start h-full min-w-[150px] px-3 py-2 gap-2.5 rounded-lg bg-white/5 border border-white/10 backdrop-blur-xl text-white/70 hover:bg-white/[0.08] hover:border-blue-400/30 transition-all data-[state=active]:bg-blue-500/15 data-[state=active]:border-blue-400/50 data-[state=active]:text-white data-[state=active]:shadow-[0_0_0_1px_rgba(96,165,250,0.3)]`.
  - Avatar grande 9x9 (`Avatar h-9 w-9` com border `border-blue-500/30`) ou círculo de fallback `h-9 w-9 rounded-full bg-blue-500/10 border-blue-500/30` com o ícone da etapa em `text-blue-400`.
  - Coluna ao lado: `<span class="text-xs font-medium leading-tight truncate">` + pill de contagem `px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded-full text-[10px] font-semibold leading-none`.
  - Como Expedição tem só 4 etapas (`aguardando_coleta`, `instalacoes`, `correcoes`, `finalizado`), todas ficam em um único container — sem o agrupamento colorido por borda usado na Gestão.

**4. Seletor mobile**
- Trocar `bg-primary/5 border-primary/10` por `bg-white/5 border-blue-500/10 text-white` no `SelectTrigger`.
- `SelectContent` mantém `bg-zinc-900 border-blue-500/10`.
- Badges de contagem usam `bg-blue-500/20 text-blue-400` (em vez de `bg-primary/10`).

**5. CardHeader interno de cada TabsContent**
- Mesmo título grande (`text-lg`), contagem em `text-white/60`, badge de portas em `bg-blue-500/10 text-blue-400`.

**6. Detalhes**
- Loader spinner com `border-blue-400` em vez de `border-primary`.
- O calendário em si (`CalendarioMensalExpedicaoDesktop` / `CalendarioSemanalExpedicaoDesktop`) já é compartilhado com a Gestão (via `CalendarioExpedicaoModal`) e não muda.

### Arquivos a editar

- `src/pages/logistica/ExpedicaoMinimalista.tsx` — única alteração; reescrita do bloco `return (...)` (linhas ~536-720) para usar `MinimalistLayout` + classes glass brancas, e ajuste do bloco de `TabsList`/`Select` para o novo padrão.

Sem alterações em hooks, dados, calendário, ou componentes filhos. Sem migração.
