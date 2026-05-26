## Objetivo

Adicionar uma página de "Configurações padrão" para despesas, acessível por um botão no header de `/direcao/estrategia/despesas`. Os padrões cadastrados aparecem como **sugestões** nas linhas vazias do mês (sem inserir nada no banco), e viram lançamentos reais apenas quando o usuário clicar/editar a célula — mantendo o comportamento atual de "edição inline insere".

## Banco de dados

Nova tabela dedicada `despesas_padrao` (isolada, não mexe em `colaboradores`/`tipos_custos`):

- `tipo`: `'folha' | 'fixa' | 'variavel'`
- `nome`: texto (nome do colaborador OU nome da despesa)
- `valor`: numeric (para fixa/variável)
- Campos de folha (apenas quando `tipo='folha'`): `salario`, `aux_combustivel`, `insalubridade_pct`, `fgts_pct`, `previsao_13_valor`
- `ordem`: int para ordenação manual
- Standard: id, created_at, updated_at, created_by

GRANTs: `authenticated` (CRUD), `service_role` (ALL). RLS: somente Direção/admin pode ler/escrever (mesmo padrão das outras tabelas de despesas).

## Nova página: `/direcao/estrategia/despesas/configuracoes`

`src/pages/direcao/estrategia/EstrategiaDespesasConfiguracoes.tsx`, com `MinimalistLayout`, breadcrumb e back para `/direcao/estrategia/despesas`. Três blocos glassmorphism, um por tipo:

1. **Folha padrão** — tabela com colunas: Nome, Salário, Combustível, Insalubridade %, FGTS %, Previsão 13°, Total calculado, Ações. Linha "adicionar" no rodapé.
2. **Despesas Fixas padrão** — tabela: Nome, Valor, Ações.
3. **Despesas Variáveis padrão** — tabela: Nome, Valor, Ações.

Cada linha edita inline (mesmo padrão `EditableCell` do `DespesasResumoTopo`). Botão excluir por linha com confirmação.

Hook: `src/hooks/useDespesasPadrao.ts` — CRUD por tipo.

## Botão no header

Em `src/pages/direcao/estrategia/EstrategiaDespesas.tsx`, adicionar `headerActions` no `MinimalistLayout` com botão "Configurações padrão" (estilo `bg-white/5 border-white/10 ...`) que navega para a nova rota.

## Auto-preenchimento como sugestão em `/despesas/{mes}`

Em `DespesasResumoTopo.tsx`:

- Carregar `despesas_padrao` junto com `colabs`/`tipos` no `useEffect` inicial.
- **Folha**: hoje o bloco já mistura `colabs` (cadastro) com `rows` (folha do mês). Adicionar uma fonte extra: linhas-padrão de `despesas_padrao` tipo `folha` que não correspondem a nenhum `admin_user_id` aparecem como linhas "sugestão" (badge "Padrão", valores em cinza). Editar uma célula chama um novo `handleInsertFolhaPadrao` que cria a linha de folha do mês usando os valores-padrão como base (sem `admin_user_id`, gravando apenas `colaborador_nome`).
- **Fixas e Variáveis**: nos `BlocoDespesa`, listar linhas-padrão (de `despesas_padrao` tipo `fixa`/`variavel`) que ainda não têm lançamento equivalente no mês. Renderizar como linha-sugestão com valor cinza editável; ao confirmar, insere em `despesas_manuais_lancamentos` com `tipo_custo_id=null`, `tipo_nome=<nome padrão>`, `categoria` e `valor`.

Visual: linhas-sugestão usam mesmo layout das atuais "sem folha"/vazias — apenas com texto/valor pré-preenchido em opacidade reduzida e badge discreto "Padrão". Não há INSERT até o usuário interagir.

## Rota

Adicionar a rota nova em `src/App.tsx` (ou onde estão as rotas de `/direcao/estrategia/despesas/...`), protegida pelas mesmas permissões da página de despesas.

## Arquivos afetados

- **novo** `supabase/migrations/<timestamp>_despesas_padrao.sql`
- **novo** `src/hooks/useDespesasPadrao.ts`
- **novo** `src/pages/direcao/estrategia/EstrategiaDespesasConfiguracoes.tsx`
- **edit** `src/pages/direcao/estrategia/EstrategiaDespesas.tsx` (botão no header)
- **edit** `src/components/direcao/estrategia/DespesasResumoTopo.tsx` (mesclar padrões como sugestão nos 3 blocos)
- **edit** `src/App.tsx` (registrar rota)
