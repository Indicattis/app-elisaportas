## Objetivo

Desvincular a página **Planejamento 2 Milhões de Giro** (`/direcao/caixa-elisa/planejamento`) da página Capital de Giro. Hoje ela lê da mesma tabela `caixa_elisa_obrigacoes` (compartilhada com Capital de Giro). Vou criar estrutura própria, onde o usuário primeiro adiciona **meses** (grupos) e, dentro de cada mês, adiciona **itens com valores**.

## Estrutura de dados (novas tabelas, isoladas)

1. `caixa_elisa_planejamento_meses`
   - `mes` (date, dia 01 do mês, único)
   - `label` (text, opcional — auto a partir do mês)

2. `caixa_elisa_planejamento_itens`
   - `mes_id` (uuid → meses, on delete cascade)
   - `nome` (text)
   - `valor` (numeric)

RLS: liberadas para usuários autenticados (mesmo padrão das demais tabelas Caixa Elisa).

## Mudanças na página `PlanejamentoPage.tsx`

- Remover query de `caixa_elisa_obrigacoes`.
- Carregar meses e itens das novas tabelas.
- Botão **"Adicionar mês"** (abre dialog com seletor mês/ano).
- Em cada card de mês:
  - Botão **"Adicionar item"** (dialog com nome + valor).
  - Lista de itens com editar/excluir.
  - Subtotal do mês.
  - Botão para excluir o mês inteiro (com confirmação).
- Sidebar 20%: **Total Acumulado** (soma de todos os itens). Remover o "Total Pago" (não há mais conceito de pago/pendente nesta página).

## Sem impacto em outras páginas

- `CapitalGiroPage.tsx` continua usando `caixa_elisa_obrigacoes` exatamente como hoje.
- Nenhum vínculo entre as duas páginas.

## Arquivos

- Nova migration: criar `caixa_elisa_planejamento_meses` + `caixa_elisa_planejamento_itens` com RLS.
- Editar: `src/pages/direcao/caixa-elisa/PlanejamentoPage.tsx`.
