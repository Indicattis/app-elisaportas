## Objetivo
Adicionar um botão de status (Pendente / Pronto) no topo da página `/direcao/estrategia/despesas/:mes`, persistido por mês, para sinalizar que todas as despesas daquele mês foram registradas.

## Banco de dados
Nova tabela `despesas_mes_status`:
- `mes_referencia` DATE PRIMARY KEY (sempre dia 01)
- `status` TEXT NOT NULL DEFAULT `'pendente'` CHECK in (`'pendente'`,`'pronto'`)
- `updated_by` UUID, `updated_at` timestamptz

RLS: SELECT/INSERT/UPDATE permitido a usuários autenticados (mesmo padrão das demais tabelas `despesas_manuais_*`).

## UI

### `EstrategiaDespesasMes.tsx`
- Carregar status do mês via `supabase.from('despesas_mes_status').select().eq('mes_referencia', `${mes}-01`).maybeSingle()`.
- Renderizar, acima do `<DespesasResumoTopo />`, um botão toggle:
  - **Pendente** → pill âmbar (`bg-amber-500/10 text-amber-300 border-amber-400/30`) com ícone `Clock`.
  - **Pronto** → pill verde (`bg-emerald-500/10 text-emerald-300 border-emerald-400/30`) com ícone `CheckCircle2`.
- Clique faz `upsert` no Supabase, alterna estado e mostra toast.
- Alinhado à direita, mesmo estilo glassmorphism existente.

### `EstrategiaDespesas.tsx` (lista anual) — opcional leve
- Carregar `status` por mês junto com totais e exibir um pequeno ponto colorido (âmbar/verde) no canto do card de cada mês, para enxergar de relance quais meses estão `pronto`.

## Fora do escopo
- Nenhuma mudança em `DespesasResumoTopo.tsx` ou nas tabelas de folha/lançamentos.
- Sem regras de bloqueio (marcar "Pronto" não impede edições futuras).