
# Migração de vendas antigas: `vendas_catalogo` → `custos_itens`

## Situação atual no banco

- `vendas_catalogo`: **42 itens**
- `custos_itens`: **48 itens**
- Match exato por nome (case/trim): **14**
- Sem match exato: **28** (lista abaixo)
- Linhas em `produtos_vendas` ainda apontando só para `vendas_catalogo` (sem `custos_itens_id`): **56**

Objetivo: preencher `produtos_vendas.custos_itens_id` em todas essas 56 linhas, para que (a) consigamos no futuro descontinuar `vendas_catalogo` e (b) lucro/relatórios das vendas antigas passem a usar custo/preço atual de `custos_itens`.

## Itens sem match exato (28)

Alçapão · Antiesmagamento até 4,00m / 6,00m / 10,00m · Caixa de fechamento (1m-3m / 3m-6m / 6m-8m / motor) · Cantoneira para fechamento lateral · Central · Eixo 6 polegadas · Guia G 200MM · Guia M 135mm · Meia cana micro - 0,80mm · Motor 1000kg · Motor AC 200 kg · Motor AC 200 Kg · MOTOR AC 500KG · Motor DC 300 Kg · Nobreak · RETIRADA DO PORTÃO EXISTENTE · Soleira tubular 30x50 · Soleira tubular 60x40 · Soleira tubular 60x40 + 30x30 · Trava Lâminas · Tubo 80x80 · Tubo de afastamento · TUBO PARA FIXAR TIRAS FRONTAIS

Muitos parecem existir em `custos_itens` com variação de caixa/acento/espaços (ex.: "Motor AC 200 kg" vs "Motor AC 200 Kg"). Outros podem realmente não existir lá ainda.

## Plano

### Fase 1 — Mapeamento automático (exato + fuzzy)
- Rodar query que casa `vendas_catalogo.nome_produto` com `custos_itens.descricao`:
  - 1º passe: igualdade após `lower(btrim(unaccent(...)))` → resolve as 14 + provavelmente boa parte das 28.
  - 2º passe (sugestão, não aplica): para os restantes, gerar **CSV de revisão** em `/mnt/documents/` com `nome_produto` → top-3 sugestões de `custos_itens` por similaridade (`pg_trgm`).
- Entrega: tabela auxiliar `_migracao_vc_ci(vc_id, ci_id, fonte text)` com `fonte='auto'` para os resolvidos.

### Fase 2 — Revisão manual dos restantes
Você abre o CSV e, para cada item sem match:
- **(A)** Indica qual `custos_itens` corresponde (eu adiciono no mapeamento), **ou**
- **(B)** Marca para criar em `custos_itens` (eu insiro copiando nome/preço/unidade do `vendas_catalogo` correspondente; categoria default a definir — provavelmente "Acessórios").

Depois desta fase, todo `vendas_catalogo.id` tem um `custos_itens.id` correspondente.

### Fase 3 — Reapontar `produtos_vendas` e limpar
- `UPDATE produtos_vendas SET custos_itens_id = m.ci_id FROM _migracao_vc_ci m WHERE produtos_vendas.vendas_catalogo_id = m.vc_id AND custos_itens_id IS NULL;` (56 linhas)
- Verificar que `0` linhas ficaram com `vendas_catalogo_id NOT NULL AND custos_itens_id IS NULL`.
- **Não** apago `vendas_catalogo_id` nem a tabela `vendas_catalogo` ainda — fica como histórico. Remoção definitiva e da aba "Catálogo de Itens" em UI fica para um passo posterior, quando você confirmar que está tudo certo nos relatórios.

## Detalhes técnicos

- Tudo via `supabase--migration` (DDL para tabela auxiliar) + tool de insert/update para dados.
- Necessário habilitar extensão `unaccent` e `pg_trgm` (provavelmente já existem; checo na hora).
- Idempotente: o UPDATE só toca linhas com `custos_itens_id IS NULL`.
- Nenhuma mudança no código de aplicação nesta etapa — o fallback de leitura já existente continua valendo durante a transição.

## Decisões que preciso confirmar antes de executar

1. **Fase 2 — itens realmente novos**: posso criar automaticamente em `custos_itens` (copiando nome/preço/unidade do `vendas_catalogo`, categoria = "Acessórios"), ou prefere revisar 1 a 1?
2. **Manter `vendas_catalogo_id` em `produtos_vendas`** como histórico após a migração? (recomendo manter por enquanto)
