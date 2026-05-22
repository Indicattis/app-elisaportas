## Objetivo
Adicionar duas colunas de lucro de pintura na tabela de kits (`/direcao/estrategia/kits`), seguindo o padrão já existente para lucro de instalação (80%), mas com **30% de margem para pintura**.

## Alterações
No arquivo `src/pages/TabelaPrecos.tsx`:

1. **Cabeçalho da tabela** — após a coluna `Valor Pintura`, inserir:
   - `Lucro Pintura`
   - `% Lucro Pint.`

2. **Células de dados** — para cada linha, após a célula `Valor Pintura`, adicionar:
   - Lucro Pintura = `item.valor_pintura * 0.30`, formatado em moeda, cor verde (`text-emerald-400`)
   - % Lucro Pint. = `30,00%`, cor verde (`text-emerald-400`)

O estilo visual segue o padrão dark glassmorphic já aplicado nas demais colunas de lucro.