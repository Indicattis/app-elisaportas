# Multas em formato planilha

Transformar `/administrativo/multas` em uma tabela única no estilo Excel, removendo o fluxo de etapas e responsáveis.

## Colunas da tabela

| Coluna | Origem |
| --- | --- |
| Data do ocorrido | novo campo no cadastro |
| Descrição | campo existente |
| Status de pagamento | Pendente / Pago |
| Condutor | colaborador ou terceiro (com avatar/inicial) |
| Dias desde a criação | calculado a partir da data de criação |
| Valor da multa | campo existente |

Linhas compactas com zebra, cabeçalho fixo, ordenação ao clicar no cabeçalho e busca por condutor/descrição. Ações de editar/excluir ao final da linha.

## Comportamento

- Status alternável direto na linha (Pendente ↔ Pago), sem abas nem aprovação por responsável.
- Rodapé com totais: quantidade de multas, total pendente e total pago.
- Cadastro de nova multa passa a pedir: condutor (colaborador ou terceiro), data do ocorrido, descrição, valor e status inicial.
- A data de vencimento deixa de ser exigida e sai da tela; o dado antigo permanece no banco.

## Detalhes técnicos

- Migração: adicionar `data_ocorrido` (date) em `public.multas`, preenchendo registros existentes com `data_vencimento`; tornar `data_vencimento` opcional.
- Status normalizado para `pendente` / `pago`; valores atuais (`aberta`, `advertida`) viram `pendente` e (`paga`, `concluida`) viram `pago`.
- `src/hooks/useMultas.ts`: incluir `data_ocorrido`, mutação de status simplificada e edição de multa.
- `src/pages/administrativo/MultasMinimalista.tsx`: substituir cards/abas por tabela ordenável; remover uso de `useMultasEtapaResponsaveis` e do modal de responsáveis nesta página.
- "Dias desde a criação" = diferença em dias entre `created_at` e hoje.
