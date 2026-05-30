Alterar fórmula de "Férias + 1/3" de `salário ÷ 3` para `(salário ÷ 3) ÷ 12`.

Arquivos:
- `src/pages/direcao/estrategia/EstrategiaDespesasConfiguracoes.tsx`
  - `calcFeriasDefault`: `return salario / 3 / 12;`
  - Label do header: `salário ÷ 3 ÷ 12`
- `src/utils/folhaSalarialPDFGenerator.ts`
  - `calcFeriasDefault`: `return salario / 3 / 12;`
  - Atualizar label/fórmula correspondente no PDF.