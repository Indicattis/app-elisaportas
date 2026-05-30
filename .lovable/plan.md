## Mudança

Em `/direcao/estrategia/despesas/configuracoes`, na tabela "Folha Salarial padrão", a coluna **"Previsão 13° + FGTS 13°"** vira **duas colunas calculadas automaticamente** (não editáveis):

- **Previsão 13°** = `salário / 12`
- **FGTS 13°** = `FGTS valor / 12` = `(salário × FGTS%) / 12`

## Arquivo

`src/pages/direcao/estrategia/EstrategiaDespesasConfiguracoes.tsx`

1. Cabeçalho (`<thead>` linha 162): substituir a coluna única por duas: "Previsão 13°" e "FGTS 13°" (mesmo estilo das outras colunas calculadas em laranja, como Insalub valor / FGTS valor).
2. Linha de adição (`<tr>` que contém `NumCell value={prev13}`): remover o input `prev13`/`setPrev13`, exibir em duas células os valores calculados `salario/12` e `salario*fgts/100/12` em laranja.
3. `FolhaRow` (linha 267-270): remover o `InlineNum` de `previsao_13_valor` e o sub-texto "c/ FGTS"; exibir duas células calculadas `salario/12` e `fgtsVal/12` (laranja).
4. `calcTotalFolha` (linha 88): trocar `f.previsao_13_valor` por `f.salario/12 + (f.salario * (f.fgts_pct||0)/100)/12`. O parâmetro `previsao_13_valor` deixa de ser usado mas o tipo é mantido (compatibilidade com chamadores).
5. No `save` (insert do novo colaborador), gravar `previsao_13_valor: 0` (campo legado da tabela continua existindo, sem efeito visual).

## Consistência com outras telas

Para os totais não divergirem entre a configuração, `/direcao/estrategia/despesas/:mes` e `/direcao/estrategia/dre/:mes`, aplicar a mesma fórmula nos dois `calcTotalFolha` correspondentes:

- `src/components/direcao/estrategia/DespesasResumoTopo.tsx` (função `calcTotalFolha`, ~linha 102).
- `src/pages/direcao/DREMesDirecao.tsx` (função `calcTotalFolha` interna inserida na alteração anterior).

Nessas duas telas a edição do `previsao_13_valor` (se existir input) passa a ser ignorada no cálculo — manter os campos no banco apenas como legado.

## Fora do escopo

- Sem migrations: coluna `previsao_13_valor` permanece no banco.
- Nenhuma outra coluna é alterada.
- Layout/estilo (glassmorphism, cores) preservados.
