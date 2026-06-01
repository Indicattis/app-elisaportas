## Objetivo

Criar uma nova seção "Pagamentos de Autorizados Terceiros" em:
- `/direcao/estrategia/despesas/configuracoes` — cadastro mestre (linha por autorizado)
- `/direcao/estrategia/despesas/:mes` — visão mensal com `valor_pago` editável

Cada linha contém: **Nome / Cidade (KM) / Valor estipulado / Valor pago**.

---

## Comportamento

### Página configurações (mestre)
- Lista todos os autorizados terceiros cadastrados.
- Botão "Adicionar autorizado" abre linha editável:
  - **Nome**: texto livre.
  - **Cidade**: input com autocomplete consultando `frete_cidades` (cidade + estado).
  - **KM**: preenchido automaticamente a partir de `frete_cidades.quilometragem` quando a cidade é selecionada (read-only, derivado).
  - **Valor estipulado**: calculado automaticamente como `quilometragem × tarifa` usando `frete_cidades.valor_frete` (já é `quilometragem × 6` na tabela). Read-only, derivado.
  - **Valor pago**: não aparece neste modo (é por mês).
- Ações: editar nome/cidade, remover, reordenar (drag) — mesmo padrão dos outros blocos.

### Página mensal (`/despesas/2026-05`)
- Mesma lista de autorizados, em modo `readOnly` para nome/cidade/km/valor estipulado.
- Coluna extra **Valor pago** editável (inline), persistida por mês.
- Linha de subtotal com soma de `valor_estipulado` e `valor_pago` (mesmo padrão visual dos blocos existentes).
- Botão "Já pago" opcional para copiar `valor_estipulado` → `valor_pago` rapidamente.

### Integração DRE
- Soma de `valor_pago` do mês entra como **despesa variável** no DRE da Direção (`DREDirecao.tsx`), agregando junto com `gastos` cujo tipo tenha `aparece_no_dre = true`.
- DRE legado (`dre_mensais` via `despesas_mensais`) não é alterado.

---

## Mudanças técnicas

### Banco de dados (migration)

Duas tabelas novas:

**`autorizados_terceiros`** (mestre)
- `id` uuid pk
- `nome` text not null
- `cidade` text not null
- `estado` text not null
- `quilometragem` numeric — snapshot do `frete_cidades` no momento da seleção (recalculado se cidade mudar)
- `valor_estipulado` numeric — snapshot de `valor_frete`
- `ordem` int default 0
- `ativo` boolean default true
- `created_at`, `updated_at`

**`pagamentos_autorizados_terceiros_mes`** (valores pagos por mês)
- `id` uuid pk
- `autorizado_id` uuid fk → `autorizados_terceiros.id` on delete cascade
- `mes_referencia` date (sempre dia 01)
- `valor_pago` numeric default 0
- `pago_em` date null
- `created_at`, `updated_at`
- UNIQUE (`autorizado_id`, `mes_referencia`)

Ambas com `GRANT` para `authenticated` e `service_role`, RLS habilitado e policies permitindo leitura/escrita para usuários autenticados (padrão das demais tabelas de estratégia).

### Frontend

- Novo hook `src/hooks/useAutorizadosTerceiros.ts` — CRUD do mestre.
- Novo hook `src/hooks/usePagamentosAutorizadosTerceirosMes.ts` — leitura/upsert por mês.
- Novo hook `src/hooks/useCidadesFreteAutocomplete.ts` — busca em `frete_cidades` para o autocomplete (lookup por `cidade` ilike).
- Novo componente `src/components/direcao/estrategia/AutorizadosTerceirosBlock.tsx` — bloco com header e tabela alinhada ao padrão dos `TiposCustoBlock` (colunas Nome / Cidade-KM / Valor estipulado / Valor pago / ações), suportando `mode: 'config' | 'mes'` e `mesReferencia`.
- Em `EstrategiaDespesasConfiguracoes.tsx` → `DespesasGridContent`: adicionar 5º bloco renderizando `<AutorizadosTerceirosBlock />` (passando `mode` e `mesReferencia` quando aplicável).
- DRE: ajustar `DREDirecao.tsx` (ou hook equivalente) para somar `pagamentos_autorizados_terceiros_mes.valor_pago` do mês selecionado como despesa variável.

### Notas
- Cidade/KM/valor estipulado são snapshots gravados no momento do cadastro/edição; se a cidade for trocada, recalcula a partir de `frete_cidades`. Mudanças posteriores em `frete_cidades` não afetam linhas já cadastradas (mantém histórico consistente).
- Não criamos `tipo_custo` novo nem usamos `gastos` — a estrutura "linha por autorizado" exige tabela própria.

---

## Arquivos afetados

- `supabase/migrations/<novo>.sql` (criação das duas tabelas + GRANTs + RLS)
- `src/hooks/useAutorizadosTerceiros.ts` (novo)
- `src/hooks/usePagamentosAutorizadosTerceirosMes.ts` (novo)
- `src/hooks/useCidadesFreteAutocomplete.ts` (novo)
- `src/components/direcao/estrategia/AutorizadosTerceirosBlock.tsx` (novo)
- `src/pages/direcao/estrategia/EstrategiaDespesasConfiguracoes.tsx` (adicionar bloco no grid)
- `src/pages/direcao/DREDirecao.tsx` ou hook DRE Direção (somar `valor_pago` do mês)
