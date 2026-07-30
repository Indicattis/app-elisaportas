## Diagnóstico (confirmado no banco)

O pedido #0167 (`da343468…`, etapa `em_producao`) está com **todas** as ordens concluídas:

- 36 linhas de soldagem, 16 de perfiladeira e 83 de separação — todas `concluida = true`
- As 3 ordens (soldagem, perfiladeira, separação) estão com `status = concluido`, nenhuma pausada

O bloqueio vem do passo 4 da verificação em `usePedidoAutoAvanco.ts`, que barra o avanço se existir qualquer linha com `com_problema = true`. Existe exatamente **1 linha** nessa condição:

- Item: `Central c/ 2 Controles` (separação)
- Problema reportado em 27/07
- Porém **concluída em 30/07** — a flag `com_problema` nunca foi limpa quando o operador concluiu a linha

Ou seja: o problema já foi resolvido na prática, mas o registro continua marcado, travando o pedido.

## O que fazer

### 1. Corrigir a causa raiz (frontend)
No fluxo de conclusão de linha de produção (solda/perfiladeira/separação), ao marcar `concluida = true` também limpar os campos de problema:
`com_problema = false`, `problema_descricao = null`, `problema_reportado_em = null`, `problema_reportado_por = null`.

Assim, concluir uma linha que teve problema reportado deixa de travar o pedido para sempre.

### 2. Ajustar a verificação de avanço
Em `usePedidoAutoAvanco.ts`, o passo 4 deve considerar apenas linhas **não concluídas** com problema (`com_problema = true AND concluida = false`). Uma linha já concluída não deve bloquear o avanço.

### 3. Destravar o pedido #0167
Migration pontual limpando a flag de problema da linha `e1b3e01a-8ec0-4d9a-b5be-c66372f45ba3` (já concluída), para que o botão "Avançar" funcione imediatamente.

### 4. Mensagem de erro mais útil (opcional, incluído)
Quando o avanço for bloqueado, detalhar o motivo real ("Linha X com problema em aberto", "Ordem pausada", "N linhas pendentes") em vez do genérico "Nem todas as ordens de produção estão concluídas".

## Detalhes técnicos
- Arquivos: `src/hooks/usePedidoAutoAvanco.ts` e a tela/hook que conclui linhas (`linhas_ordens`) na produção.
- Migration: `UPDATE public.linhas_ordens SET com_problema = false, problema_descricao = null, problema_reportado_em = null, problema_reportado_por = null WHERE id = 'e1b3e01a-8ec0-4d9a-b5be-c66372f45ba3';`
- Nenhuma alteração de schema é necessária.
