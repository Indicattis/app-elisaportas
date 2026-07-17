## Contexto

A regra em cascata (D. Auto → D. Fria → D. Gerente → D. Diretor) permanece como está. O que muda é apenas o **feedback visual** no modal "Portas" para que o usuário identifique rapidamente por que uma venda caiu ou não em cada faixa.

Diagnóstico validado no banco: em Junho/2026 só há 1 venda fria com desconto em portas (IRMAOS KUNST, 1,98% → cabe em D. Auto), por isso a coluna D. Fria fica legitimamente zerada. Sem sinalização visual, isso confunde.

## Alteração

Arquivo único: `src/pages/direcao/DREMesDirecao.tsx`, dentro do `PortasDetalheDialog`.

1. **Propagar flags por linha da tabela**
   - No mapeamento `porVenda`, adicionar dois campos ao objeto `VendaComPortasRow`: `isFria: boolean` (`v.temperatura === false`) e `isCartao: boolean` (`v.forma_pagamento === 'cartao_credito'`).

2. **Renderizar badges ao lado do nome do cliente**
   - Se `isFria`: badge azul claro "Fria" (`bg-sky-500/15 text-sky-300 border-sky-500/30`).
   - Se `isCartao`: badge âmbar "Cartão" (`bg-amber-500/15 text-amber-300 border-amber-500/30`).
   - Badges pequenos (`text-[10px] px-1.5 py-0.5 rounded border`) na mesma célula do nome, após o texto, sem quebrar layout.

3. **Legenda no header do modal**
   - Substituir/atualizar o tooltip existente para incluir uma linha explicando as tags: "Fria = temperatura fria (habilita D. Fria até +5%); Cartão = pagamento em cartão (bloqueia D. Auto)".

4. **Limpeza**
   - Remover os `console.debug('[DRE Portas Buckets]', ...)` de investigação (já cumpriram seu papel).

Nenhuma mudança na lógica de cálculo, na tabela principal do DRE, no PDF ou em qualquer outro arquivo.
