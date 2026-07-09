## Corrigir temperatura retroativa das vendas (desde 01/05/2026)

Sua intuição está certa: quando a venda tem **desconto acima do limite básico** e **não existe registro de autorização** em `vendas_autorizacoes_desconto`, a única forma daquele desconto ter sido aceito no cadastro é o vendedor ter marcado "Fria" (o adicional de 5% só é liberado para venda fria). Isso nos permite reconstituir a origem com segurança para uma parte das vendas.

### Diagnóstico do período (data_venda >= 2026-05-01, `is_rascunho = false`)

Regras vigentes em `configuracoes_vendas`: limite base à vista = **3%**, adicional fria = **+5%**, adicional responsável = **+7%** (com senha).

| Grupo                                                     | Vendas |
| --------------------------------------------------------- | -----: |
| Total no período                                          |    103 |
| Fria dedutível (desconto > base e sem autorização)        |     69 |
| Ambíguas — desconto ≤ base (0-3% ou 0% no cartão)         |     34 |
| Ambíguas — desconto acima do base mas houve autorização   |      0 |

Ou seja, dá para virar **69 vendas para Fria** com 100% de confiança lógica. As outras 34 são ambíguas: podem ter sido Fria ou Quente, e não há como saber — ficam como estão (Quente, default do banco).

### Lógica exata da inferência

Para cada venda no período com `is_rascunho = false`:

```text
base_total    = Σ (valor_produto + valor_pintura + valor_instalacao) * quantidade
desc_total    = Σ desconto aplicado por produto (valor ou percentual sobre a base do item)
pct_desc      = desc_total / base_total * 100
limite_base   = 0  se metodo_pagamento = 'cartao_credito'
                3  caso contrário
teve_auth     = existe linha em vendas_autorizacoes_desconto para essa venda

marcar_fria   = pct_desc > limite_base + 0.01 AND NOT teve_auth
```

Se `marcar_fria` for verdadeiro → `UPDATE vendas SET venda_presencial = false`. Caso contrário, deixa como está.

Nota: o campo `venda_presencial` continua NOT NULL / default true — não vamos mexer na coluna, só nos registros.

### Passos

1. **Backup leve antes de rodar**: emitir um `SELECT` gravando em `.mnt/documents/temperatura_backup_YYYYMMDD.csv` com `id, data_venda, cliente_nome, venda_presencial` das 103 vendas do período, para poder reverter manualmente se preciso.
2. **Executar o UPDATE em massa** via tool `supabase--insert` (é DML, não DDL), aplicando a fórmula acima. Impacto esperado: 69 vendas passam de Quente → Fria.
3. **Validar**: rodar novo `SELECT` de contagem por temperatura no período e comparar com o esperado (`quente=34`, `fria=69`).
4. Avisar o time comercial que as 34 vendas com desconto ≤ 3% (ou 0% em cartão) permanecem como Quente porque a origem é indeterminável — se algum vendedor identificar caso errado, ele pode corrigir manualmente na tela da venda.

### Fora de escopo

- Vendas anteriores a 01/05/2026.
- Rascunhos (`is_rascunho = true`) e vendas reprovadas.
- Alterações de schema (a coluna continua NOT NULL / default true).
