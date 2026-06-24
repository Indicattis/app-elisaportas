## Objetivo

Adicionar um campo **Tipo** ao cadastrar/editar uma visita técnica, com duas opções padrão:
- **Visita técnica** (selecionada por padrão)
- **Manutenção**

## Mudanças

### 1. Banco de dados
- Migration em `visitas_tecnicas_agendadas`:
  - Nova coluna `tipo text NOT NULL DEFAULT 'visita_tecnica'`
  - CHECK constraint aceitando `'visita_tecnica'` ou `'manutencao'`
  - Backfill: registros existentes ficam como `'visita_tecnica'`

### 2. UI — `src/pages/vendas/VisitasTecnicasCalendario.tsx`
- Adicionar `tipo` ao state do formulário (default `'visita_tecnica'`)
- Novo `<Select>` no dialog de criar/editar visita, logo acima ou ao lado do campo Título, com as opções "Visita técnica" e "Manutenção"
- Incluir `tipo` no insert/update e no carregamento ao editar
- Exibir um badge discreto (texto pequeno) no card da visita na grade do calendário e no popover de detalhes, diferenciando manutenção (ex.: cor âmbar) de visita técnica (azul)

### 3. Histórico
- `src/lib/visitasHistorico.ts`: incluir `tipo` no `diffVisita` para registrar alteração de tipo
- `src/components/vendas/VisitasHistoricoPanel.tsx`: nenhuma mudança necessária (já mostra campos alterados genericamente)

### 4. Tela de conclusão
- `VisitaTecnicaConclusao.tsx`: apenas exibir o tipo se já estiver carregando os dados da visita (sem alterar fluxo)

## Fora do escopo
- Não criar tabela de "tipos customizáveis" — fica fixo nas duas opções por enquanto
- Sem impacto em DRE, financeiro ou produção
