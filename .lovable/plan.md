## Objetivo

Alinhar visualmente `/administrativo/compras/requisicoes` ao padrão minimalista escuro de `/administrativo/compras/estoque`. O foco é o **modal de Nova Requisição** (que hoje usa o tema light padrão do Dialog) e pequenos ajustes na página.

## 1. Modal — `src/components/compras/RequisicaoCompraForm.tsx`

Aplicar o tema glass escuro do estoque:

- `DialogContent`: adicionar `bg-zinc-900 border-white/10 text-white`
- `DialogTitle` / `DialogDescription`: `text-white` / `text-white/60`
- Todos os `Input` / `Textarea`: `bg-white/5 border-white/10 text-white placeholder:text-white/40`
- Todos os `SelectTrigger`: `bg-white/5 border-white/10 text-white`
- Todos os `SelectContent`: `bg-zinc-900 border-white/10`
- Tabela editável de itens:
  - Wrapper: `border border-white/10 rounded-lg`
  - `TableHeader`/`TableRow`: `border-white/10 hover:bg-transparent`
  - `TableHead`: `text-xs font-medium text-white/60`
  - `TableCell`: `text-white` (com `text-white/60` para colunas auxiliares)
  - Inputs/selects das células com mesmo padrão acima
- Card de totais: `bg-white/5 border-white/10 text-white` (substitui `bg-muted/30`)
- Botão "Adicionar item": variant default (gradiente azul) `bg-gradient-to-r from-blue-500 to-blue-700 text-white border-0`
- Botão "Cancelar" (footer): `border-white/10 text-white hover:bg-white/10`
- Botão "Criar Requisição": gradiente azul

## 2. Página — `src/pages/administrativo/RequisicoesMinimalista.tsx`

Pequenos alinhamentos para ficar mais próximo do estoque:

- Botão "Nova Requisição" no header: já usa gradiente azul — manter; trocar variant das ações secundárias se houver, e padronizar tamanho `size="sm"`.
- Adicionar uma **barra de busca** no mesmo padrão do estoque (`p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10` com `Input` glass dentro), filtrando por número da requisição, fornecedor ou solicitante. Mantém os KPI cards e o grid de cards de requisição.
- Os KPI cards e grid de requisições já seguem o padrão glass — sem mudança.
- Ajustar o botão "Exportar PDF" do card para o mesmo padrão glass outline (`bg-white/5 border-white/10 text-white hover:bg-white/10`).

## Fora de escopo

- Não alterar fluxo, validações, hooks ou regras de negócio.
- Não trocar o grid de cards por tabela (cards já são glass e cabem bem na página).
- Não tocar em PDF, migrações ou backend.