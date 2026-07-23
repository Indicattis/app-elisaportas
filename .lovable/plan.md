## Objetivo

Na seção "Descontos por Faixa" do PedidoDetalhesSheet (`/direcao/gestao-fabrica` → detalhes do pedido), transformar o grid de 3 colunas em 4 colunas, separando o último bloco "Diretor" em dois: **Gerente** (até 7%) e **Diretor** (excedente acima dos limites anteriores + 7%).

## Alterações

**Arquivo:** `src/components/pedidos/PedidoDetalhesSheet.tsx`

### 1. Cálculo (linhas ~228–264)
No `useMemo` do `descontoTiers`, adicionar quebra da faixa `responsavel` em duas:

- `pctCartao` (À Vista): até 3% quando não é cartão — inalterado
- `pctGelo` (Frio): até 5% quando venda fria — inalterado
- **`pctGerente`**: até 7% do que sobrar depois de À Vista e Frio (novo)
- **`pctDiretor`**: todo o excedente restante (novo, substitui `responsavel`)

Limite do gerente virá de `configLimites?.responsavel ?? 7` (mesma chave já usada, apenas renomeada semanticamente para "gerente"). Manter `responsavel` no retorno como alias de `diretor` para não quebrar outros consumidores, se houver.

### 2. UI (linhas ~1285–1313)
- `grid-cols-3` → `grid-cols-4`
- Manter os cards "Cartão" e "Frio" como estão
- Novo card **Gerente** — cor âmbar/laranja suave (ex.: `text-amber-400`)
- Card **Diretor** — cor vermelha mais forte (ex.: `text-red-500`) para destacar excedente

Cada card segue o mesmo padrão visual (percentual + valor negativo).

## Observação

A busca não encontrou outros consumidores de `descontoTiers.responsavel` fora deste arquivo, mas manterei o alias por segurança.
