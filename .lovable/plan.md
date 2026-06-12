# Largura ampliada + sidebar direita de visitas a concluir

Arquivo: `src/pages/vendas/VisitasTecnicasCalendario.tsx`.

## 1. Largura do conteúdo
- Remover o `max-w-6xl` e usar largura cheia com `px-[100px]` (100px de padding lateral interno).
- Manter o padding vertical atual (`pt-20 pb-10`).

## 2. Layout em duas colunas
- Envolver o conteúdo principal em um grid: `grid grid-cols-[1fr_320px] gap-6`.
- Coluna esquerda: header da página + grade do calendário (conteúdo atual).
- Coluna direita: nova sidebar "Visitas a concluir".

## 3. Sidebar "Visitas a concluir"
- Card glassmorphism (`bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4`) sticky no topo (`sticky top-20`, `max-h-[calc(100vh-6rem)] overflow-y-auto`).
- Título "Visitas a concluir" + contador.
- Nova query `useQuery(['visitas-a-concluir'])` em `visitas_tecnicas_agendadas`:
  - filtro `status in ('agendada','realizada')` (visitas em aberto = não `concluida` nem `cancelada`)
  - ordenado por `data_visita asc, hora_inicio asc`
  - sem limite de mês (lista global de pendências)
- Cada item: linha clicável mostrando data (`dd/MM`), hora, título e cidade (quando houver). Click navega para `/vendas/visitas-tecnicas/${id}/concluir`.
- Badge sutil indicando se está atrasada (data < hoje) em âmbar.
- Estado vazio: "Nenhuma visita pendente".
- Após salvar/atualizar/excluir uma visita no modal, invalidar também `['visitas-a-concluir']`.

## Responsivo
- Abaixo de `lg`, colapsar para uma coluna (`grid-cols-1`) e exibir a sidebar acima ou abaixo do calendário (abaixo é mais limpo).

## Fora do escopo
- Nenhuma mudança no modal, na grade do calendário, no schema, nem nas demais páginas.
