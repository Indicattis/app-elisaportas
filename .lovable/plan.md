
## Visão geral

A página `/direcao/caixa-elisa` deixa de ser lista única e vira um **hub** com 2 botões, no mesmo padrão visual dos demais hubs (`DirecaoHub`, `EstrategiaHub`):

1. **2M - Capital de Giro** → `/direcao/caixa-elisa/capital-giro`
2. **Planejamento 2M de Giro** → `/direcao/caixa-elisa/planejamento`

As entradas antigas (`caixa_roboost_entradas` + `caixa_roboost_etiquetas`) serão descartadas — novas tabelas serão criadas do zero.

---

## Página 1 — "2M - Capital de Giro"

Layout (mesmo aesthetic glassmorphism: `bg-white/5 backdrop-blur-xl border-white/10`):

```text
┌──────────────────────────────────────────────┐
│  Capital de Giro      │  Saldo Disponível    │   ← 2 índices grandes
│  R$ 2.000.000,00 ✎    │  R$ 1.450.000,00     │
├──────────────────────────────────────────────┤
│  [+ Nova obrigação]                           │
│  ☑ Aluguel galpão      05/06/2026  R$ 12.000  │ Editar | Excluir
│  ☐ Fornecedor X        10/06/2026  R$ 45.000  │
│  ...                                          │
└──────────────────────────────────────────────┘
```

- **Capital de Giro** (1º índice) — valor único editável (clique no ícone de lápis abre dialog para alterar). Armazenado como singleton em uma tabela de config.
- **Saldo Disponível** (2º índice) — calculado: `capital_giro − SOMA(valor das obrigações não pagas)`. Itens pagos não decrementam.
- Lista abaixo: cadastro de obrigações com campos **nome**, **data**, **valor** e **checkbox "pago"**. Toggle do checkbox atualiza no banco e recalcula o saldo.
- Ações por linha: editar, excluir.

## Página 2 — "Planejamento 2M de Giro"

Layout split 80/20:

```text
┌────────────────────────────────────┬────────────┐
│ Agrupado por mês                   │ Totais     │
│                                    │            │
│  Junho/2026                        │ Acumulado  │
│   ☑ Aluguel       05/06  R$ 12.000 │ R$ 320.000 │
│   ☐ Fornecedor    10/06  R$ 45.000 │            │
│   Subtotal: R$ 57.000              │ Pago       │
│                                    │ R$ 180.000 │
│  Julho/2026                        │            │
│   ...                              │            │
└────────────────────────────────────┴────────────┘
```

- Esquerda (80%): mesmas obrigações da página 1, agrupadas por mês (ordem cronológica), apenas leitura, com subtotal por mês.
- Direita (20%): dois índices empilhados — **Total Acumulado** (soma de todas as obrigações) e **Total Pago** (soma das obrigações com `pago = true`).

---

## Detalhes técnicos

### Banco de dados (migration)

1. **Drop** das tabelas antigas: `caixa_roboost_entradas`, `caixa_roboost_etiquetas` (com CASCADE).
2. Criar `caixa_elisa_config` (singleton):
   - `id` (sempre `'singleton'` text PK), `capital_giro` numeric default 0.
   - RLS: select/insert/update apenas para admins (usar helper `is_admin()` já existente no projeto).
3. Criar `caixa_elisa_obrigacoes`:
   - `nome` text, `data` date, `valor` numeric, `pago` boolean default false, `created_by` uuid.
   - RLS idêntica (admins).
4. Trigger padrão `update_updated_at_column` em ambas.

### Rotas / código

- `src/pages/direcao/CaixaElisaDirecao.tsx` → reescrever como **hub** (2 cards/botões no padrão de `DirecaoHub.tsx`).
- Criar `src/pages/direcao/caixa-elisa/CapitalGiroPage.tsx` (Página 1).
- Criar `src/pages/direcao/caixa-elisa/PlanejamentoPage.tsx` (Página 2).
- Reaproveitar `IndicadorExpandivel` (ou um componente local mais simples) para os índices grandes.
- Registrar rotas em `src/App.tsx` reaproveitando `routeKey="direcao_caixa_elisa"` (mesmo prefixo, sem necessidade de nova permissão).
- Cadastrar 2 rotas em `app_routes` (`direcao_caixa_elisa_capital_giro`, `direcao_caixa_elisa_planejamento`) ou — mais simples — manter ambas sob o prefixo existente `direcao_caixa_elisa` para herdar permissão (ainda usaremos esta opção).

### Cálculos

```ts
saldoDisponivel = capitalGiro - obrigacoes
  .filter(o => !o.pago)
  .reduce((s, o) => s + Number(o.valor), 0);

totalAcumulado = obrigacoes.reduce((s, o) => s + Number(o.valor), 0);
totalPago = obrigacoes.filter(o => o.pago).reduce((s, o) => s + Number(o.valor), 0);
```

### Datas

Seguir regra do projeto: gravar como `YYYY-MM-DD` puro (campo `date`), exibir com `T12:00:00` no `new Date(...)` para evitar shift de timezone.

---

## Entregáveis

- 1 migration (drop antigas + criar 2 novas tabelas + RLS).
- `CaixaElisaDirecao.tsx` reescrito como hub.
- `CapitalGiroPage.tsx` novo.
- `PlanejamentoPage.tsx` novo.
- 2 rotas adicionadas em `src/App.tsx`.
