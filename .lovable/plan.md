## Permitir desmarcar linhas em `/producao/separacao`

### Comportamento atual
No `OrdemDetalhesSheet` (a "downbar" / sheet de detalhes da ordem), o `Checkbox` de cada linha fica desabilitado quando `!linhaAnteriorConcluida`. Isso impede desmarcar uma linha já concluída se a próxima também estiver concluída, e bloqueia qualquer ajuste antes da ordem ser efetivamente concluída.

### Mudança
Em `src/components/production/OrdemDetalhesSheet.tsx` (linha ~1065), tornar a regra de `disabled` do `Checkbox` sensível ao estado atual da linha:

- Se `linha.concluida === true` (usuário quer **desmarcar**):
  - Permitir desde que `ordem.status !== 'concluido'` e `ordem.status !== 'pronta'`, e o usuário seja o responsável (`podeMarcarLinhas`), e não esteja em `isUpdating`.
  - Ignora a restrição sequencial (`linhaAnteriorConcluida`) — pode desmarcar mesmo com linhas posteriores ainda marcadas.
- Se `linha.concluida === false` (usuário quer **marcar**):
  - Mantém a regra atual, exigindo `linhaAnteriorConcluida` para preservar a sequência.

Atualizar também o `title` (tooltip) para refletir o caso de desmarcar.

### Escopo
- Mudança aplica-se a separação, perfiladeira, soldagem, embalagem (mesmo componente). A intenção do usuário foi separação; outros setores se beneficiam por consistência, sem efeito quando a ordem já está concluída.
- Sem alterações em banco, hooks ou regras de negócio. A mutation `marcarLinhaConcluida` já aceita `concluida: false`.

### Arquivo
- `src/components/production/OrdemDetalhesSheet.tsx`
