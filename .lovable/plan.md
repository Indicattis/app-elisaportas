## Diagnóstico

A coluna `vendas.venda_presencial` é gravada como `true` quando a venda é **Quente** e `false` quando é **Fria** (confirmado pelo `RadioGroup` em `PagamentoSection.tsx` linhas 230-266 e pela regra de desconto em `descontoVendasRules.ts`, onde o adicional de desconto é liberado para venda **fria**).

A venda da **ZANELLA TRANSPORTES** tem `venda_presencial = true` no banco (ou seja, Quente). Porém:

1. O sheet de detalhes mostra o rótulo invertido como "Fria" — daí o usuário acreditar que a venda estava fria.
2. A faixa de desconto rotulada "Quente" na verdade representa o adicional liberado para venda **Fria** (variável interna `pctGelo`, calculada quando `isFrio === true`).
3. O cálculo em si está correto: como Zanella é Quente, o tier "frio" fica 0% e o excedente vai todo para a faixa do responsável ("Luan/Alana").

Conclusão: o cálculo está certo; o problema é puramente de rótulos na UI.

## Mudanças

### 1. `src/components/pedidos/VendaPendenteDetalhesSheet.tsx`
- **Linha 334** — badge no topo: trocar `venda_presencial ? "❄️ Fria" : "🔥 Quente"` por `venda_presencial ? "🔥 Quente" : "❄️ Fria"` (e ajustar as classes de cor correspondentes para casar com o booleano correto: laranja quando Quente, azul quando Frio).
- **Linhas 690-711** — card "Temperatura": inverter o ícone (Flame para `presencial=true`, Snowflake para `presencial=false`), a cor (laranja/azul) e o texto (`'Quente' : 'Fria'`).
- **Linha 733** — card da faixa "gelo" em Descontos por Faixa: renomear o título de **"Quente"** para **"Frio"** (essa faixa só é preenchida quando `isFrio`).
- **Linha 742** — card da faixa "responsavel": renomear **"Luan/Alana"** para **"Diretor"**.
- **Linha 100** — atualizar o comentário `// Calculate discount tiers (Cartão / Gelo / Luan-Alana)` para `(Cartão / Frio / Diretor)`.

### 2. `src/pages/direcao/VendaEditarDirecao.tsx`
- **Linha 327** — está mostrando o texto "Fria" dentro de `{venda.venda_presencial && (...)}`. Corrigir para refletir o significado real: quando `venda_presencial=true` exibir "Quente"; manter a renderização condicional ou exibir os dois estados (`presencial ? 'Quente' : 'Fria'`).

### 3. Verificação sem alteração
- `src/components/pedidos/PedidoDetalhesSheet.tsx:535` — já está correto (`presencial ? "🔥 Quente" : "❄️ Frio"`); apenas confirmar.
- Lógica de cálculo (`isFrio = venda_presencial === false`) permanece inalterada — está correta e alinhada com `descontoVendasRules.ts`.

## Resultado esperado

- Zanella passa a aparecer como **🔥 Quente** no sheet (como está no banco).
- A faixa de desconto rotulada como **Frio** só exibe valor quando a venda é Fria.
- A faixa do responsável passa a se chamar **Diretor**.
- Nenhuma mudança no banco, no fluxo de aprovação ou nos limites de desconto.
