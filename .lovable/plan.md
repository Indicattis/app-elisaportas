## Objetivo

Refatorar `/financeiro/gastos` (`src/pages/administrativo/GastosPage.tsx`) para usar o mesmo padrão de header de `/direcao/estrategia/itens` (componente `MinimalistLayout` com `headerActions`), agrupando no header todas as funcionalidades, botões e filtros que hoje vivem soltos no topo da página.

## Mudanças

Arquivo único: `src/pages/administrativo/GastosPage.tsx`.

1. **Remover o shell custom atual**
   - Eliminar o `<div className="min-h-screen bg-black ...">`, o `AnimatedBreadcrumb` manual, o botão fixo "Voltar" no canto superior esquerdo e o bloco custom `<h1>Gastos</h1>` + linha de ações.
   - Remover imports não mais usados: `ArrowLeft`, `AnimatedBreadcrumb`, estado `mounted` e seu `useEffect`.

2. **Adotar `MinimalistLayout`** (mesmo wrapper de `EstrategiaItens.tsx`):
   - `title="Gastos"`, `subtitle="Controle de despesas do mês"`.
   - `backPath="/financeiro"`.
   - `breadcrumbItems`: Home → Financeiro → Gastos.
   - `fullWidth` para manter a largura útil atual.

3. **`headerActions` agrupando tudo**
   Construir um nó `headerActions` que reúne, da esquerda para a direita:
   - **Navegador de mês** (ChevronLeft / label do mês com `CalendarIcon` / ChevronRight) — mesma lógica atual de `mesFiltro`.
   - **Ordenação** (`Select` de `ordenarPor`: Data de Cadastro / Data de Pagamento).
   - **Filtros** (`Select`): Tipo, Banco, Responsável, DRE — exatamente os mesmos quatro selects de hoje.
   - Botão "Limpar filtros" (aparece só quando algum filtro está ativo, mesma condição atual).
   - Botão **PDF** (`gerarPDF`).
   - Botão **Bancos** (`navigate("/financeiro/bancos")`).
   - Botão **Novo Gasto** (`openCreate`) — primário.
   
   Layout: `flex flex-wrap items-center gap-2` para acomodar todos os controles no header sem quebrar em telas menores. Estilos dos selects/botões alinhados ao padrão claro/escuro do `MinimalistLayout` (usar tokens como `bg-card/60 border-border`, semelhante a `EstrategiaItens`), substituindo as classes `bg-white/5 border-white/20 text-white` que eram específicas do shell preto antigo.

4. **Corpo da página**
   - Remover o bloco separado de filtros (linhas ~356-440) já que migrou para `headerActions`.
   - Manter intactos: tabela de gastos, linha de total, dialogs de criar/editar e alert dialog de exclusão.
   - Aplicar wrapper `<div className="space-y-4">` (sem `px-[84px]`) para o conteúdo dentro do layout.

5. **Sem alterações de lógica**
   - Hooks (`useGastos`, `useBancos`, `useTiposCustos`), estado de filtros, `gastosFiltrados`, `totalGastos`, `gerarPDF`, `handleSave`, `handleDelete`, sugestões de descrição: todos permanecem inalterados.
   - Sem mudanças em rotas, banco, RLS ou outros arquivos.

## Verificação

- Build limpo.
- `/financeiro/gastos` renderiza com o mesmo header de `/direcao/estrategia/itens` (breadcrumb + título + ações à direita).
- Navegador de mês, ordenação, 4 filtros, "Limpar filtros", PDF, Bancos e Novo Gasto funcionam a partir do header.
- Tabela, totais, criar/editar/excluir continuam funcionando como antes.