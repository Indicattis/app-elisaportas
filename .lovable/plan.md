## Diagnóstico

Consultando o banco para junho/2026, os dados **contradizem** o que o modal está mostrando:

- **20 vendas fria** (`temperatura=false`) — não é "impossível", existem sim, mas quase todas com 0% de desconto (por isso `D. Fria` fica genuinamente zerada — não é bug, é dado).
- **25 vendas a_vista + quente com portas** têm em média 17,97% de desconto → deveriam popular `D. Auto` em ~R$ 227 por porta (LENTZ é caso concreto: base 11.612, desconto 1.932 → pctDado 16,64%, autoPct=3% → D. Auto = R$ 227,16 na porta).

Ou seja: `D. Auto` está errado (deveria ter valores em ~27 vendas) e `D. Fria` está tecnicamente correto para junho, mas confuso porque o usuário espera ver a coluna sendo usada.

A lógica no código parece correta em papel. Preciso confirmar em runtime o que está zerando os buckets. Hipóteses restantes:

1. `todosProdutosVendas` (segunda query, sem filtro de mês) traz linhas extras/estranhas alterando `totalBase`/`totalDesconto` — inflando denominador e derrubando `pctDado` para perto de zero.
2. `p.vendas` chegando como array em algumas linhas quando esperamos objeto (Supabase às vezes retorna array em `!inner`), o que faria `v.forma_pagamento`/`v.temperatura` virarem `undefined` → `aptoAvista=false`, autoCap=0.
3. Bundle stale no browser do usuário (menos provável, ele vê as colunas novas).

## Plano de correção

Alterações restritas ao arquivo `src/pages/direcao/DREMesDirecao.tsx`, dentro do bloco que hoje calcula `bucketsPorVenda` (linhas ~1586–1620) e da estrutura de dados que ele consome:

### 1. Blindar `p.vendas` contra array vs objeto

Extrair `v` já normalizado:
```
const v = Array.isArray(p.vendas) ? p.vendas[0] : p.vendas;
```
Aplicar nos dois `forEach` sobre `portasRaw` (o do cálculo de bucket e o de montagem de itens).

### 2. Repensar a semântica dos buckets

O usuário quer que cada faixa mostre **o que aquele nível de autorização cobriu**, não uma cascata rígida onde Fria só recebe algo se Auto já saturou. A regra fica:

- `D. Auto`: até `limite_desconto_avista` (3%) — sempre que a venda for elegível (não-cartão). Se pctDado ≥ 3, autoPct=3; senão autoPct=pctDado.
- `D. Fria`: entre `limite_desconto_avista` e `limite_desconto_presencial`+`limite_desconto_avista` (ou seja, faixa extra de +5%) — só se `temperatura=false`. Independente de a venda ser cartão ou não.
- `D. Gerente`: próximos +`limite_adicional_responsavel` (7%) acima do teto automático da venda.
- `D. Diretor`: o que restar.

Assim, uma venda fria com 8% de desconto mostrará: Auto=3, Fria=5, Gerente=0, Diretor=0 — o que é o esperado. Se cartão, Auto=0 e o mesmo 8% cai como Gerente=7, Diretor=1.

### 3. Logs temporários para validar

Adicionar `console.debug('[DRE Portas Buckets]', { vendaId, cliente, formaPg, temperatura, pctDado, autoCap, friaCap, autoPct, friaPct, gerentePct, diretorPct })` em cada iteração do loop, atrás de um flag `if (import.meta.env.DEV)`, para o usuário conseguir reportar valores exatos e confirmarmos a correção. Removo depois que ele confirmar que voltou ao esperado.

### 4. Tooltip explicativo

Adicionar um pequeno tooltip (ícone `?` no header do modal) explicando a regra usada, para evitar confusão futura quando o mês tiver poucas fria com desconto.

Nenhuma alteração em regras de negócio, no cálculo principal do DRE, ou fora do modal.
