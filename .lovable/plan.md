
# Migração — vendas antigas (`vendas_catalogo` → `custos_itens`)

Tudo mapeado. Pronto para executar.

## Mapeamento final (42 itens de `vendas_catalogo` → `custos_itens`)

| # | vendas_catalogo | custos_itens (destino) |
|---|---|---|
| 1 | Alçapão | **Alçapão Porta de Enrolar** |
| 2 | Antiesmagamento até 4,00m | Antiesmagamento de 4 metros |
| 3 | Antiesmagamento até 6,00m | Antiesmagamento de 6 metros |
| 4 | Antiesmagamento até 10,00m | Antiesmagamento de 10 metros |
| 5 | Antiqueda | Antiqueda *(match exato)* |
| 6 | Barra anti vento | Barra anti vento *(match exato)* |
| 7 | Caixa de fechamento (1m-3m) | Caixa de fechamento (01m - 03m) |
| 8 | Caixa de fechamento (3m-6m) | Caixa de fechamento (03m-06m) |
| 9 | Caixa de fechamento (6m-8m) | Caixa de fechamento (06m - 08m) |
| 10 | Caixa de fechamento (motor) | Caixa motor ((Avulsa) |
| 11 | Cantoneira para fechamento lateral | Cantoneira Fechamento Lateral |
| 12 | Central | **Central c/ 2 Controles** |
| 13 | Central BLUETOOH | Central BLUETOOH *(exato)* |
| 14 | Central WI-FI | Central WI-FI *(exato)* |
| 15 | Controle Avulso | Controle Avulso *(exato)* |
| 16 | Controle Multi Frequência | Controle Multi Frequência *(exato)* |
| 17 | Eixo 6 polegadas | **Eixo - 6" 1/2 (165mm) esp. 3,00mm** |
| 18 | Guia G 200MM | Guia U + Tubo 90mm - Guia Médio (130mm) |
| 19 | Guia M 135mm | Guia U + Tubo 120mm - Guia Grande (170mm) |
| 20 | Meia cana lisa - 0,70mm | Meia cana lisa - 0,70mm *(exato)* |
| 21 | Meia cana lisa - 0,80mm | Meia cana lisa - 0,80mm *(exato)* |
| 22 | Meia cana micro - 0,80mm | **Meia Cana Micro - 0,70mm** |
| 23 | Motor 1000kg | Motor AC 1000 Kg |
| 24 | Motor AC 1000 Kg | Motor AC 1000 Kg *(exato)* |
| 25 | Motor AC 200 kg | Motor AC 200 Kg |
| 26 | Motor AC 200 Kg | Motor AC 200 Kg |
| 27 | Motor AC 300 Kg | Motor AC 300 Kg *(exato)* |
| 28 | MOTOR AC 500KG | Motor AC 500 Kg |
| 29 | Motor AC 600 Kg | Motor AC 600 Kg *(exato)* |
| 30 | Motor AC 800 Kg | Motor AC 800 Kg *(exato)* |
| 31 | Motor AC/DC 500 Kg | Motor AC/DC 500 Kg *(exato)* |
| 32 | Motor AC/DC 800 Kg | Motor AC/DC 800 Kg *(exato)* |
| 33 | Motor DC 300 Kg | Motor AC/DC 300 Kg |
| 34 | Nobreak | Nobreack até 800Kg |
| 35 | RETIRADA DO PORTÃO EXISTENTE | **Manutenção** *(criar)* |
| 36 | Soleira tubular 30x50 | Soleira tubular - 30x50x1,25mm + 2 Ponteiras |
| 37 | Soleira tubular 60x40 | Soleira tubular - 60x40x1,25mm + 2 Ponteiras |
| 38 | Soleira tubular 60x40 + 30x30 | Soleira tubular - 60x40x1,25mm + 2 Ponteiras |
| 39 | Trava Lâminas | Trava lâmina - Valor Par E + D |
| 40 | Tubo 80x80 | Tubo 80x80 - 2,00mm |
| 41 | Tubo de afastamento | Tubo de afastamento |
| 42 | TUBO PARA FIXAR TIRAS FRONTAIS | Tubo para tiras frontais |

Atenção a colisões esperadas (mesmo destino para 2 origens, comportamento intencional):
- "Motor AC 200 kg" e "Motor AC 200 Kg" → ambos para `Motor AC 200 Kg`.
- "Soleira tubular 60x40" e "Soleira tubular 60x40 + 30x30" → ambos para `Soleira tubular - 60x40x1,25mm + 2 Ponteiras`.

## Execução

**Passo 1 — Criar item "Manutenção" em `custos_itens`** (insert via Lovable Cloud)
- categoria: `Itens Avulsos`, unidade: `Un`, preco_venda: `100` (igual ao "Retirada do portão existente").

**Passo 2 — Reapontar `produtos_vendas`**
Uma única query atualizando todas as 56 linhas, usando um `CASE` por `vendas_catalogo_id` → `custos_itens_id`. Filtra `custos_itens_id IS NULL` para ser idempotente.

**Passo 3 — Verificar**
`SELECT count(*) FROM produtos_vendas WHERE vendas_catalogo_id IS NOT NULL AND custos_itens_id IS NULL;` → esperado `0`.

## Fora de escopo

- Não vou apagar `vendas_catalogo`, a coluna `vendas_catalogo_id` nem a aba "Catálogo de Itens" agora. Isso fica para depois que você validar os relatórios.
- Nenhuma mudança em código de aplicação.
