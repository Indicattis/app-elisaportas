# Lucro de instalação na tabela de kits

Adicionar duas colunas logo à direita de **Valor Instalação** na tela `/direcao/estrategia/kits`:

1. **Lucro Instalação** — valor em R$ = `valor_instalacao * 0,80`
2. **% Lucro Inst.** — sempre `80,00%` (fixo)

## Detalhes

- Aplicado apenas na tabela principal de kits em `src/pages/TabelaPrecos.tsx` (header em ~L390 e linhas em ~L461-466).
- Mesma estética das colunas Lucro/% Lucro já existentes: texto `text-emerald-400`, alinhado à direita, ocultas em mobile (`hidden md:table-cell`).
- Margem de 80% definida como constante no componente (`LUCRO_INSTALACAO_PCT = 0.8`) para facilitar ajuste futuro.
- Quando `valor_instalacao = 0`, lucro exibe `R$ 0,00` e a % permanece `80,00%` (ou `—` caso prefira; confirmo abaixo).
- Sem alterações de banco — cálculo puramente apresentacional.

## Fora de escopo

- Não altera a outra tabela embarcada (`/sobre/precos` em ~L196-237) — apenas a tabela principal de kits.
- Não altera totais, somas no rodapé nem o cálculo do `total` do kit.
