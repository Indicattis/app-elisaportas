## Contexto

As seções **3. Despesas Fixas**, **4. Folha Salarial** e **5. Despesas Variáveis** do PDF (componente `PrintReport` em `src/pages/direcao/DREMesDirecao.tsx`) são renderizadas pelo helper `PrintDespesaTable`, que hoje só mostra duas colunas: *Descrição* e *Valor*.

## Mudança

Em `src/pages/direcao/DREMesDirecao.tsx`:

1. Estender `PrintDespesaTable` para aceitar um prop opcional `tiposDisponiveis: TipoCustoVariavel[]`.
   - Quando presente, adicionar a coluna **Projetado** (à direita de *Valor*).
   - Para cada linha, buscar o tipo correspondente por `nome` e exibir `valor_maximo_mensal`; usar "—" quando não houver match.
   - Aplicar a mesma coloração da tela (vermelho se realizado > projetado, verde se realizado < projetado, neutro se igual).
   - Adicionar a soma dos projetados na linha TOTAL.
2. No `PrintReport`, passar:
   - Seção 3 → `tiposCustosFixos` filtrados por `!isFolha(t.nome)`
   - Seção 4 → `tiposCustosFixos` filtrados por `isFolha(t.nome)`
   - Seção 5 → `tiposCustosVariaveis`
3. Mover/expor `isFolha` (já criado no escopo do módulo) para reuso — já está disponível.

## Fora de escopo

- Sem mudanças nas seções 1, 2, 6, 7 do PDF.
- Sem mudanças na página interativa (já tem a coluna em todas as três seções).
- Sem alterações de banco.
