# Refaturamento global de vendas

Recalcular `lucro_item` e `custo_producao` de **todas** as linhas de `produtos_vendas` usando as novas fontes de verdade, fazendo match automático para legados sem FK.

## Fontes de lucro por tipo

| tipo_produto | Fonte | Regra |
|---|---|---|
| `porta_enrolar`, `porta_social` | `tabela_precos_portas` (kits) | `lucro_item = kit.lucro × quantidade` |
| `pintura_epoxi` | `tabela_precos_portas` | `lucro_item = kit.valor_pintura × quantidade` (ou regra atual de m² caso não haja kit) |
| `instalacao` | `tabela_precos_portas` | `lucro_item = kit.valor_instalacao × quantidade` |
| `acessorio`, `adicional`, `manutencao` | `custos_itens` | `lucro_item = valor_total − (custos_itens.custo_unitario × quantidade)` |

`custo_producao = valor_total − lucro_item` em todos os casos.

## Estratégia de match (legados sem FK)

Executado em ordem dentro de uma migração SQL única (transação):

1. **Backfill de FKs ausentes**:
   - Portas/pintura/instalação sem `tabela_precos_porta_id`: match por `descricao` (case-insensitive, trim) + `tamanho` em `tabela_precos_portas` com tolerância de 15 cm em largura/altura quando `tamanho` for `LxA` (regra já documentada em memory). Atualiza `tabela_precos_porta_id`.
   - Avulsos sem `custos_itens_id`: match por `descricao` normalizada (lower+trim) em `custos_itens`. Atualiza `custos_itens_id`.

2. **Recálculo de `lucro_item` / `custo_producao`** com UPDATE … FROM usando as FKs (recém-preenchidas ou existentes). Linhas que continuarem sem match após o passo 1 ficam como fallback:
   - Pintura sem kit: mantém regra atual (m² × valor configurado) — se não houver config, `lucro_item = valor_total × 0.30`.
   - Instalação sem kit: `lucro_item = valor_total × 0.40` (regra atual).
   - Porta sem kit: `lucro_item = 0` (não há base segura).
   - Avulso sem `custos_itens`: `lucro_item = 0`.

3. **Atualizar `vendas`**:
   - `lucro_total = Σ produtos_vendas.lucro_item` da venda + lucro da instalação legada (`valor_instalacao × 0.40` quando não houver produto `instalacao`) + `valor_credito`.
   - `custo_total = Σ custo_producao`.
   - Marcar `faturamento = true` em todas as linhas com `lucro_item > 0`.
   - `instalacao_faturada = true` quando aplicável (vendas legadas com `valor_instalacao > 0`).

## Entregáveis

- **1 migração SQL** (`supabase/migrations/...`) com:
  - UPDATEs de backfill de `tabela_precos_porta_id` e `custos_itens_id`.
  - UPDATEs de `lucro_item` / `custo_producao` por tipo.
  - Recálculo agregado em `vendas` (`lucro_total`, `custo_total`, flags).
  - Sem alterações estruturais (apenas dados).

- **Sem mudanças de UI/código**: o frontend já consome `lucro_item` / `lucro_total` existentes.

## Fora de escopo

- Não cria `contas_receber`/`contas_pagar`.
- Não altera vendas futuras (a lógica de auto-faturamento ao abrir tela já existe).
- Não remove campos legados (`valor_instalacao`, `instalacao_faturada`).

## Riscos

- Sobrescreve `lucro_item` ajustado manualmente em vendas já faturadas (decisão confirmada: "Refaturar todas").
- Recomendado: backup/snapshot antes de aplicar. A migração pode ser disparada uma única vez.
