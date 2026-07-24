## Causa confirmada

Chamei a edge function `gerar-fretes-estado` com `{"estado":"ES"}` e ela retorna 500 com a mensagem:

> dns error: failed to lookup address information … `servicodosdados.ibge.gov.br`

O host usado hoje em `supabase/functions/gerar-fretes-estado/index.ts` (linha 22) está com uma letra a mais. O domínio real da API do IBGE é **`servicodados.ibge.gov.br`** (sem o "dos"). Por isso a resolução DNS falha para qualquer UF, não só ES.

## Correção

Em `supabase/functions/gerar-fretes-estado/index.ts`, trocar a URL:

- de `https://servicodosdados.ibge.gov.br/api/v1/localidades/estados/${estado}/municipios`
- para `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${estado}/municipios`

Nenhuma outra mudança é necessária — o restante do fluxo (validação de UF, parse do JSON, ordenação) já está correto.

## Verificação

Após o deploy automático, reexecutar a função com `{"estado":"ES"}` e confirmar retorno 200 com a lista de 78 municípios do Espírito Santo. Depois, na UI em `/logistica/frete/internos`, usar "Gerar por Estado" com ES e acompanhar o modal de progresso.
