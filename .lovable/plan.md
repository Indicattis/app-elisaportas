# Abas em Visitas Técnicas

Hoje `/vendas/visitas-tecnicas` (`VisitasTecnicasCalendario.tsx`) renderiza o calendário e, ao lado, uma seção "Visitas a concluir". Vamos separar em duas abas no mesmo estilo de `/direcao/vendas/parceiros`.

## Mudanças

**Arquivo:** `src/pages/vendas/VisitasTecnicasCalendario.tsx`

1. Adicionar estado `tab: 'calendario' | 'concluir'` (default `'calendario'`) e `direction` para animação slide (igual `ParceirosDirecao.tsx`).
2. Logo abaixo do header/breadcrumb, inserir o pill de abas (mesmo markup glassmorphism: `bg-white/5 backdrop-blur-xl border border-white/10 rounded-full p-1`, botão ativo com gradient azul):
   - **Calendário**
   - **A Concluir** — com badge mostrando `visitasAConcluir.length`
3. Conteúdo condicional dentro de um wrapper `key={tab}` com `animate-slide-in-right/left`:
   - `tab === 'calendario'`: renderiza apenas a grade do calendário semanal (drag/drop, dialogs etc. permanecem intactos).
   - `tab === 'concluir'`: renderiza a listagem atual "Visitas a concluir" expandida para largura total (cards com cliente, endereço, data/hora e botão "Concluir visita" que navega para `/vendas/visitas-tecnicas/:id/concluir`). Estado vazio: "Nenhuma visita pendente".
4. Remover a coluna lateral "Visitas a concluir" do layout do calendário (passa a viver só na aba "A Concluir"). O calendário pode ocupar toda a largura.
5. Manter intacto: queries (`visitas-a-concluir`, agendadas), mutations, dialogs de edição/exclusão, DragOverlay via portal.

## Fora do escopo
- Não alterar `/vendas/visitas-tecnicas/realizadas` nem a página de conclusão.
- Nenhuma mudança de schema/banco.
