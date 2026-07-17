## Refazer modal de Portas no DRE

Refatoro o `PortasDetalheDialog` em `src/pages/direcao/DREMesDirecao.tsx` para adotar o mesmo estilo visual da página (fundo `slate-950/gradient`, cards `bg-white/5 backdrop-blur-xl`, tipografia e paleta idênticas às tabelas do DRE) e segrego a coluna **Desconto** em 4 colunas de faixa de autorização.

### Segregação da coluna Desconto (4 níveis)

Para cada venda, o desconto total é distribuído em faixas cumulativas sobre o valor tabela, usando os limites já configurados em `configuracoes_vendas`:

| Faixa | Rótulo | Faixa % | Regra |
|---|---|---|---|
| 1 | Automático | 0 → `limite_desconto_avista` (3%) | Só aplicável se método de pagamento **não for cartão** |
| 2 | Temp. Fria | `avista` → `limite_desconto_presencial` (5%) | Só se `temperatura = 'fria'` |
| 3 | Gerente | `presencial` → `limite_adicional_responsavel` (7%) | Autorização de gerente |
| 4 | Diretor | acima de `responsavel` (7%) | Autorização de diretor |

Se a venda não cumpre o pré-requisito da faixa (ex: pagamento é cartão), essa faixa é pulada e o desconto "cai" para a próxima faixa que aceita — mantendo consistência com o cálculo de "Excedido" já existente.

### Alterações na tabela do modal

Colunas por item passam a ser:

```
Descrição | Qtd | Valor Tabela | Frete | Desc. Auto | Desc. Fria | Desc. Gerente | Desc. Diretor | Valor Final | Lucro
```

- A coluna "Excedido" é removida (equivale à soma Gerente + Diretor, ficando redundante).
- Cada faixa de desconto tem cor própria: Auto (`white/70`), Fria (`sky-400`), Gerente (`amber-400`), Diretor (`red-400`).
- Cabeçalho sticky, linhas com hover, mesma densidade das tabelas do DRE.

### Alterações no bloco de totais consolidados

Grid passa a mostrar: Valor Tabela · Frete · Desc. Auto · Desc. Fria · Desc. Gerente · Desc. Diretor · Valor Final · Lucro, com legenda curta explicando as faixas.

### Estilo (para bater com a página)

- `DialogContent`: `max-w-7xl`, fundo `bg-gradient-to-b from-slate-950 to-slate-900`, borda `border-white/10`.
- Header com título grande + descrição em `text-white/50`, alinhado ao restante da página.
- Cada venda em card `rounded-2xl bg-white/[0.03] backdrop-blur-xl border-white/10`, ao invés do `bg-white/5` atual.
- Bloco de totais com destaque em `bg-blue-500/10 border-blue-400/20` (azul Elisa).

### Escopo técnico

- Alterações restritas a `src/pages/direcao/DREMesDirecao.tsx`:
  - Estender o tipo `VendaComPortasRow`/item para carregar `pagamento_metodo` e `temperatura` (já disponíveis no fetch).
  - No agregador que hoje calcula `excedido`, calcular também `descAuto`, `descFria`, `descGerente`, `descDiretor` por item (mesmo rateio proporcional ao valor tabela do item dentro da venda).
  - Refatorar JSX do `PortasDetalheDialog` (linhas ~2491–2604).
- Nenhuma mudança em regras de negócio, cálculo de lucro/excedido da tabela principal do DRE, ou em outras telas.
