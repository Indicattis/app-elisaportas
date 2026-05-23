## Objetivo

Registrar no banco os DREs efetivados por mês e exibir um status visual nos meses do hub `/direcao/estrategia/dre`:

- **A realizar** (azul) — mês atual
- **Não realizado** (vermelho/alerta) — mês passado sem DRE cadastrado
- **Realizado** (verde) — mês com DRE salvo na tabela
- Meses futuros — neutros/cinza

Dentro de `/direcao/estrategia/dre/:mes` haverá um botão no header **"Marcar como realizado"** que grava o snapshot dos valores na tabela. Já gravado, o botão passa a **"Atualizar valores realizados"** (regrava) e mostra a data do último registro.

## Banco

Tabela `public.dre_realizados` (nova — separada da `dre_mensais` legada para não interferir no DRE antigo de `/dashboard/...`):

Colunas:
- `mes` (DATE, UNIQUE, sempre dia 01)
- `faturamento_total` (numeric)
- `lucro_bruto` (numeric)
- `total_despesas_fixas` (numeric)
- `total_despesas_folha` (numeric)
- `total_despesas_variaveis` (numeric)
- `lucro_liquido_final` (numeric)
- `perc_bruto` (numeric)
- `perc_liquido` (numeric)
- `observacoes` (text, opcional)
- `realizado_por` (uuid)
- `realizado_em` (timestamptz)
- padrões: id, created_at, updated_at

RLS: leitura/escrita restrita a admins via `is_admin()` (mesmo padrão das outras tabelas de direção).

Upsert por `mes` para que reabrir o registro substitua os valores.

## Frontend

### `src/pages/direcao/DREDirecao.tsx` (hub do ano)
1. Buscar em paralelo: faturamento por mês (já existe) + `dre_realizados` do ano (campos `mes`, `lucro_liquido_final`).
2. Para cada card de mês calcular `status`:
   - mês > atual → `futuro` (border-white/10, texto apagado)
   - mês === atual → `a_realizar` (anel/border azul)
   - mês < atual sem registro → `nao_realizado` (border vermelho/âmbar)
   - mês com registro → `realizado` (border verde + ícone check + exibir `lucro_liquido_final` ao lado do faturamento)
3. Adicionar legenda discreta de status abaixo do grid.

### `src/pages/direcao/DREMesDirecao.tsx` (detalhe do mês)
1. Buscar `dre_realizados` do `mes` na carga.
2. Adicionar botão no `headerActions` (ao lado de "Imprimir PDF"):
   - Não registrado → **"Marcar como realizado"** (verde discreto)
   - Já registrado → **"Atualizar realizado"** + tooltip com data de `realizado_em`
3. Ao clicar, abrir um `Dialog` de confirmação mostrando o snapshot que será gravado (faturamento, lucro bruto, total despesas fixas/folha/variáveis, lucro líquido, % bruto, % líquido) + campo opcional de observações.
4. Confirmar → `upsert` em `dre_realizados` com `realizado_por = auth.uid()` e `realizado_em = now()` → toast de sucesso → refetch.

## Detalhes técnicos

- Cores aplicadas via classes tailwind semânticas existentes (`border-emerald-500/40`, `border-amber-500/40`, `border-blue-400/40`) seguindo o glassmorphism padrão (bg-white/5, backdrop-blur).
- Datas no padrão do projeto: `mes` gravado como `YYYY-MM-01` com `T12:00:00.000Z` na conversão.
- Não alterar `dre_mensais` legada nem o fluxo de `/dashboard/administrativo/financeiro/dre`.
- Atualizar memória do projeto com a nova convenção de status do hub DRE.

## Fora de escopo

- Não implementar edição manual dos valores realizados (apenas snapshot dos cálculos atuais).
- Não criar histórico de versões — upsert simples.
