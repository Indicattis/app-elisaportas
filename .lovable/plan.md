## Diagnóstico

Na lista de materiais de `/direcao/gestao-fabrica` (função `gerarListaParaPedidos` em `src/pages/direcao/GestaoFabricaDirecao.tsx`, linhas 158–185) o "necessário" é calculado sempre como:

```ts
if (linha.largura && linha.altura) {
  necessario = qtd * largura * altura;
} else if (linha.tamanho) {
  necessario = qtd * tamanho;
} else {
  necessario = qtd;
}
```

A regra ignora completamente a **unidade do item de estoque**. O item **"Antiqueda"** está cadastrado como `unidade = 'UN'`, `quantidade_padrao = 1` (verificado no banco). Como ele está vinculado em linhas de portas que têm largura/altura preenchidas, o cálculo vira `qtd × largura × altura`, gerando o "600" que apareceu (ex.: 200 portas × 2m × 1,5m).

O mesmo bug existe em `src/hooks/useMateriaisNecessariosProducao.ts` (linhas 62–71), mas a tela atual exibe a lista do utilitário acima.

## Correção proposta

Ajustar a função `gerarListaParaPedidos` para escolher a fórmula de acordo com a unidade do estoque:

- **m² / M2**: `qtd × largura × altura`
- **m / ml / metro / cm**: `qtd × (tamanho || largura || altura)` (com conversão cm→m quando aplicável)
- **un / pc / pç / kit / par** (padrão para qualquer outro caso): `qtd × (quantidade_padrao || 1)`

Tratamento auxiliar:
- Normalizar `unidade` (trim + lowercase) antes de comparar.
- Quando a unidade é "un" e `quantidade_padrao` existir e for > 0, multiplicar por ela (cobre casos tipo "kit com 4 parafusos").
- Manter o agrupamento por `estoque_id` e o enriquecimento por matéria-prima já existentes.

Escopo:
- Editar somente `src/pages/direcao/GestaoFabricaDirecao.tsx` (função `gerarListaParaPedidos`).
- Não alterar o PDF nem o hook `useMateriaisNecessariosProducao` neste passo (posso fazer em seguida se quiser — mesma raiz de bug, mas alimenta outra tela).

## Validação

Após a correção, gerar a lista numa etapa que contenha portas com "Antiqueda" e conferir que a quantidade vira `nº de portas × quantidade_padrao` (tipicamente igual ao nº de portas), e não mais a área total.