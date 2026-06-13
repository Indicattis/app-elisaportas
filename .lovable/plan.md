# Histórico + Drag-and-drop em /vendas/visitas-tecnicas

## 1. Histórico de visitas técnicas (abaixo do calendário)

### Banco
Nova tabela `visitas_tecnicas_historico`:
- `visita_id uuid` (referência à visita, sem FK rígida para preservar registro após exclusão)
- `acao text` — `criada` | `alterada` | `excluida` | `concluida` | `reagendada`
- `titulo text` — snapshot do título no momento do evento
- `data_visita date`, `data_anterior date` (preenchido em reagendamento)
- `responsavel_nome text`
- `cidade text`, `estado text`
- `detalhes jsonb` — diff resumido (campos alterados) ou payload da conclusão
- `usuario_id uuid`, `usuario_nome text`
- `created_at timestamptz default now()`

RLS: leitura para `authenticated`; insert via app (mesma política das visitas). Grants padrão (`authenticated`, `service_role`).

### Registro automático
Em `VisitasTecnicasCalendario.tsx`, dentro do `onSuccess` das mutations `create`, `update`, `delete`, inserir uma linha na tabela com a ação correspondente. Em `update`, comparar payload anterior x novo para marcar `reagendada` quando `data_visita` mudar; caso contrário `alterada` com diff dos campos.

Em `VisitaTecnicaConclusao.tsx`, ao concluir, inserir linha com ação `concluida` e snapshot básico (datas/horas reais, responsável).

`usuario_nome` virá de `useAuth()` (perfil atual).

### UI
Novo card abaixo da grade do calendário (dentro da coluna esquerda do grid), mesmo padrão glassmorphism:
- Título "Histórico de visitas" + filtro simples por ação (chips: Todas, Criadas, Alteradas, Reagendadas, Concluídas, Excluídas).
- Lista virtualizada simples (últimas 50, com botão "Carregar mais").
- Cada linha: ícone por ação, data/hora do evento (`dd/MM HH:mm`), texto descritivo (ex.: "João reagendou 'Visita Cliente X' de 10/06 para 12/06"), cidade entre parênteses.
- Query `useQuery(['visitas-historico', filtro])` ordenada por `created_at desc`. Invalidada junto com as demais ao salvar/excluir/concluir.

## 2. Drag-and-drop de visitas no calendário

### Biblioteca
Usar `@dnd-kit/core` (já presente no projeto, conforme `DraggableInstalacao*`).

### Implementação em `VisitasTecnicasCalendario.tsx`
- Envolver a grade do calendário em `<DndContext>` com `PointerSensor` (activation distance 8 para não conflitar com cliques de abrir modal).
- Cada célula de dia vira `useDroppable` com id `yyyy-MM-dd`.
- Cada card de visita dentro do dia vira `useDraggable` carregando `{ id, data_visita }`.
- `onDragEnd`: se `over.id` é uma data diferente da origem, chamar uma nova mutation `mudarDataVisita({ id, novaData })` que faz `update` em `visitas_tecnicas_agendadas` apenas no campo `data_visita` (mantendo hora/responsável/etc.).
- Optimistic update na query `['visitas-agendadas', mes]` para feedback imediato; rollback em erro.
- Registrar evento `reagendada` no histórico (item 1) com `data_anterior` e nova `data_visita`.
- `DragOverlay` exibindo uma versão compacta do card durante o arrasto.
- Bloquear drag em visitas com status `concluida` ou `cancelada` (apenas `agendada`/`realizada` arrastáveis).

### Sidebar direita
Itens da sidebar "Visitas a concluir" também viram `useDraggable` com os mesmos ids, permitindo arrastá-los para um dia do calendário (efeito = reagendar). Sem alteração visual além do cursor.

## Fora do escopo
- Modal de criação/edição.
- Página de conclusão (apenas adicionar o log).
- Edição inline de hora/responsável via drag (apenas a data muda).
