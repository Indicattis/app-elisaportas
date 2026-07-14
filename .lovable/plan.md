## Objetivo

No tooltip da célula "Desconto/Acréscimo" em `/direcao/vendas/todas`, separar a faixa que hoje aparece como "Diretor" em **duas faixas distintas**:

- **Gerente** — até `limite_adicional_responsavel` (hoje 7%) além de À Vista + Frio
- **Diretor** — o que exceder tudo isso (senha master)

O util `calcDescontoTiersAplicados` hoje agrupa esses dois em `pctGerente`, então a separação será feita inline na página, sem mexer no util.

## Alterações

Arquivo único: `src/pages/direcao/VendasDirecao.tsx`

1. Puxar o limite adicional do responsável do hook já usado:
   ```ts
   const limResponsavel = limitesVendas?.adicionalResponsavel ?? 7;
   ```

2. No `case 'desconto_acrescimo'`, após o `calcDescontoTiersAplicados(...)`, dividir `pctGerente`:
   ```ts
   const pctGerenteOnly = Math.min(tiers.pctGerente, limResponsavel);
   const pctDiretor = Math.max(0, tiers.pctGerente - limResponsavel);
   const valorGerenteOnly = _totalBaseTiers * (pctGerenteOnly / 100);
   const valorDiretor = _totalBaseTiers * (pctDiretor / 100);
   ```

3. Atualizar o bloco `tiersBlock` para 4 linhas na ordem: À Vista → Frio → **Gerente (`limResponsavel`%)** → **Diretor (excesso)**. Manter o mesmo padrão de cores (avista emerald, frio cyan, gerente amber) e destacar Diretor em vermelho quando `valorDiretor > 0`; senão cinza.

Nenhuma outra alteração de lógica, filtros ou cálculo de excedido.
