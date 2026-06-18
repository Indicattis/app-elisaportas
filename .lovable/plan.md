## Contexto

As colunas **Equipe Instalação** e **Autorizado Correção** estão majoritariamente vazias porque a origem dos dados também está vazia:

| Origem | Pedidos finalizados com dado | Total |
|---|---|---|
| `instalacoes.responsavel_instalacao_nome` | 3 | 168 |
| `correcoes.responsavel_correcao_nome` | 0 | 21 |
| `ordens_carregamento.responsavel_carregamento_nome` | 87 | 267 |

Investiguei todas as tabelas com potencial relação (`neo_instalacoes`, `neo_correcoes`, `pedidos_etapas`, `pedidos_producao`, `pedidos_movimentacoes`, `etapa_responsaveis`, `eventos_calendario`) e **nenhuma armazena equipe/autorizado vinculado ao pedido legado**. A única referência adicional é `instalacao_concluida_por` / `correcao.concluida_por`, que é o `user_id` do colaborador que clicou em "Concluir" — não representa a equipe responsável e seria enganoso usar como fallback.

## Conclusão

Não existe fonte alternativa real para o histórico legado. O caminho correto é:

1. **Manter a snapshot atual** (já preenche os 3 + 87 casos onde há dado).
2. **Adicionar trigger de sincronização** para que, quando alguém preencher retroativamente o responsável em `instalacoes` ou `correcoes`, a linha em `instalacoes_finalizadas` seja atualizada automaticamente.
3. **Re-rodar o backfill** uma vez após o trigger entrar (caso novos registros tenham aparecido entre as migrations).
4. **Sinalizar visualmente** na coluna quando vazio com um traço cinza `—` em vez de string vazia, deixando claro que é ausência de dado e não bug de exibição.

Pedidos novos finalizados a partir daqui já vão preencher normalmente, pois o workflow atual exige escolher responsável.

## Mudanças técnicas

**Migration:**
- Criar função `sync_instalacao_finalizada_responsavel()` + trigger `AFTER UPDATE OF responsavel_instalacao_id, responsavel_instalacao_nome ON instalacoes`
- Criar função `sync_correcao_finalizada_responsavel()` + trigger `AFTER UPDATE OF responsavel_correcao_id, responsavel_correcao_nome ON correcoes`
- Triggers fazem `UPDATE public.instalacoes_finalizadas SET equipe_instalacao_* / autorizado_correcao_* WHERE pedido_id = NEW.pedido_id`
- Detectar tipo (equipe vs autorizado) via `EXISTS` em `equipes_instalacao` para decidir entre coluna `equipe_*` e `autorizado_*` (hoje o backfill sempre joga no `equipe_*` — corrigir isso também)
- Re-executar bloco de backfill com a lógica corrigida

**UI (`OrdensInstalacoesLogistica.tsx`):**
- Substituir células vazias por `<span className="text-white/30">—</span>`
- Tooltip opcional: "Responsável não registrado no momento da finalização"

## Não muda

- Estrutura da tabela `instalacoes_finalizadas`
- Hook `useInstalacoesFinalizadas`
- Filtro de mês e indicadores de valor
