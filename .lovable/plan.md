## Cores e renomeação das colunas de valores em `/direcao/estrategia/itens`

Aplicar fundos coloridos sutis e renomear colunas na tabela de itens (somente quando `showPrecoVenda=true`, portanto não afeta `/fabrica/produtos`).

### Renomeações
- **Preço/Un** → **Custo**
- **Preço de Venda** → **Preço Final**
- **Descontos %** → **Desc. Gerente %**

### Cores de fundo por coluna
Aplicar em `<TableHead>` e nas `<TableCell>` correspondentes (header + cada linha + footer), usando tons translúcidos compatíveis com o tema glassmorphism (bg-white/5, backdrop-blur):

| Coluna | Cor | Classe Tailwind |
|---|---|---|
| Custo | (sem cor / neutro) | — |
| Preço Final | Verde | `bg-green-500/10` |
| Impostos % | Laranja | `bg-orange-500/10` |
| Cartão % | Verde água | `bg-teal-500/10` |
| Desc. Gerente % | Amarelo | `bg-yellow-500/10` |
| Lucro | Azul | `bg-blue-500/10` |

Texto continua usando os tokens atuais (verde/vermelho dinâmico do Lucro mantido). As cores só se aplicam quando `showPrecoVenda=true`.

### Arquivo afetado
- `src/pages/direcao/estoque/ProdutosFabrica.tsx` — atualizar labels dos `TableHead`, adicionar `className` de fundo nos `TableHead`, `TableCell` (linha) e `TableCell` (footer) das 5 colunas coloridas.
