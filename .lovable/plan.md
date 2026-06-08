## Objetivo

Adicionar 3 indicadores de saldo (Conta, Espécie, Cheque) + Total em `/financeiro/gastos`, com edição de "Saldo em espécie" e "Saldo em cheque" diretamente nessa página. "Saldo em conta" fica somente leitura ali e é editável apenas em `/direcao/caixa-elisa` por meio de um novo botão.

## Mudanças

### 1. Banco (migration)
Adicionar à tabela singleton `caixa_elisa_config` três colunas numéricas com default 0:
- `saldo_conta numeric NOT NULL DEFAULT 0`
- `saldo_especie numeric NOT NULL DEFAULT 0`
- `saldo_cheque numeric NOT NULL DEFAULT 0`

(Reaproveita a linha `id = 'singleton'` já existente e respeita as RLS atuais.)

### 2. `/financeiro/gastos` — `src/pages/administrativo/GastosPage.tsx`
- Buscar/observar o registro `caixa_elisa_config` via React Query.
- Renderizar, acima da tabela de gastos, um grid de 4 cards (estilo glassmorphism):
  - **Saldo em conta** — somente leitura, com cadeado/ícone indicando que só é editável em `/direcao/caixa-elisa` (tooltip).
  - **Saldo em espécie** — botão lápis abre dialog para editar e salvar via `upsert` em `caixa_elisa_config`.
  - **Saldo em cheque** — idem.
  - **Total** — soma dos três, sem edição.
- Invalidar query após salvar; toasts de sucesso/erro.

### 3. `/direcao/caixa-elisa` — `src/pages/direcao/CaixaElisaDirecao.tsx`
- Adicionar novo botão "Saldo em conta" no menu (mesmo estilo dos demais) que abre um dialog inline (ou navega para uma página dedicada).
- Implementação proposta: abrir um dialog no próprio Hub para editar `saldo_conta` em `caixa_elisa_config` (mesmo padrão do dialog de Capital de Giro em `CapitalGiroPage`).

### 4. Restrições
- Em `/financeiro/gastos` o card "Saldo em conta" não tem ação de edição.
- Apenas os campos `saldo_especie` e `saldo_cheque` são atualizados a partir dali; `saldo_conta` é atualizado somente a partir de `/direcao/caixa-elisa`.

## Pontos não alterados
- Capital de Giro e obrigações em `caixa-elisa/capital-giro` permanecem como estão.
- RLS, tipos de custos, gastos e demais áreas seguem intactos.
