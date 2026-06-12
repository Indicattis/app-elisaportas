# Modal "Agendar nova visita" — versão dinâmica

Arquivo único afetado: `src/pages/vendas/VisitasTecnicasCalendario.tsx`.

## O que muda

### 1. Endereço enxuto
- Remover do modal os inputs visíveis de **Endereço (rua)**, **Bairro**, **Cidade**, **Estado** e **Complemento**.
- Manter apenas **CEP** e **Número** lado a lado.
- O lookup do ViaCEP continua acontecendo ao digitar o CEP (8 dígitos), e os campos rua/bairro/cidade/estado são preenchidos **em memória** no `form` (sem mostrar inputs). Continuam sendo salvos normalmente no insert/update.
- Abaixo do CEP, exibir uma linha discreta read-only com o resumo (`Rua, Bairro — Cidade/UF`) quando o ViaCEP responder, só para confirmação visual. Se o CEP não retornar, mostrar aviso curto.

### 2. Data dinâmica (date picker)
- Substituir o `<Input type="date">` por um botão + `Popover` + `Calendar` (shadcn), padrão usado no projeto.
- Locale pt-BR, formatação `dd/MM/yyyy` no botão.
- Manter o valor interno em `form.data_visita` como `YYYY-MM-DD` (compatível com a regra global `T12:00:00.000Z` já usada no save).
- Wrapper do Calendar com `pointer-events-auto` (necessário dentro de Dialog).

### 3. Responsável dinâmico (combobox com busca)
- Substituir o `<Select>` por `Popover + Command` (combobox shadcn) com `CommandInput` para filtrar responsáveis por nome.
- Mostra nome selecionado no trigger; opção "— Sem responsável —" no topo.
- Mesma fonte de dados (`admin_users` ativos) já carregada no componente.

## Fora do escopo
- Não alterar a tabela `visitas_tecnicas_agendadas` nem o payload salvo (endereço continua persistido com os campos preenchidos via ViaCEP).
- Não mexer no fluxo de edição/exclusão/conclusão, nem na grade do calendário.
- Não tocar em outros modais/páginas.

## Detalhe técnico
- Usar `Calendar` de `@/components/ui/calendar` em `mode="single"`, convertendo Date ⇄ string `YYYY-MM-DD` sem `toISOString` (montar manualmente para evitar shift de timezone, conforme regra do projeto).
- Combobox: `Command`, `CommandInput`, `CommandList`, `CommandItem` de `@/components/ui/command` (mesmo padrão do `EstadoCidadeInline.tsx`).
- Validação no save permanece a mesma; endereço continua opcional.
