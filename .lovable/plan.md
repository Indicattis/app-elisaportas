## Objetivo
Em `/direcao/estrategia/despesas/:mes`, voltar a listar **todos os colaboradores ativos** na Folha Salarial (não filtrar por `em_folha`), e adicionar uma coluna visual indicando se cada um está marcado como "Em folha" no cadastro.

## Mudanças

### 1. RPC `get_colaboradores_folha`
- Remover o filtro `AND em_folha = true`.
- Adicionar `em_folha` no retorno (boolean).
- Manter `ativo = true` e `tipo_usuario IN ('colaborador','metamorfo')`.

### 2. `src/components/direcao/estrategia/DespesasResumoTopo.tsx`
- Adicionar `em_folha: boolean` no tipo `Colab` e mapear do RPC.
- Na tabela da Folha Salarial, adicionar uma nova coluna **"Em folha"** (logo após "Colaborador" e antes da coluna "Status" atual, que indica se já tem lançamento no mês):
  - Badge verde "Sim" quando `em_folha = true`.
  - Badge cinza "Não" quando `em_folha = false`.
- Manter o restante (Status do lançamento do mês, edição inline, inserção) inalterado — o colaborador continua podendo ser lançado mesmo sem estar marcado como "em folha", já que agora a coluna é apenas informativa.

## Resultado
A folha volta a mostrar os 31 colaboradores ativos, com uma coluna clara indicando o status de "Em folha" vindo do cadastro em `/administrativo/rh-dp/colaboradores`.