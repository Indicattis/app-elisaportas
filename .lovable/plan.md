## Objetivo

Em `/fabrica/controle-fornadas`, adicionar uma seção que lista cada fornada (registro de `pintura_inicios`) com:
- Quantidade de portas de enrolar pintadas naquela fornada
- Custo da fornada (valor fixo configurável)

## Regras combinadas

- **Portas por fornada**: contar ordens em `ordens_pintura` com `status = 'concluida'` cuja `data_conclusao` esteja entre `iniciado_em` da fornada e `iniciado_em` da fornada seguinte (ou `now()` para a mais recente). Filtrar para portas de enrolar — usar o `pedido_id` para checar o `tipo_produto`/produto correspondente em `pedidos_producao` (manufaturadas: enrolar). Caso a checagem por tipo seja inviável no front, contar todas as ordens de pintura concluídas no intervalo (apresentaremos como "portas pintadas" sem distinguir).
- **Custo da fornada**: valor único configurável (R$ por fornada), aplicado a todas as fornadas. Editável na própria página por usuários com acesso.

## Mudanças

### 1. Banco — nova tabela de configuração simples
- Migration criando `pintura_fornada_config` (linha única) com campo `custo_por_fornada numeric not null default 0`, mais `updated_at`/`updated_by`.
- GRANTs para `authenticated` (select/update) e `service_role`; RLS permitindo select para qualquer autenticado e update somente para `is_admin()` (mesmo helper já usado em outras tabelas).
- Seed da única linha de config.

### 2. Hook novo `usePinturaFornadaCusto`
- Lê e atualiza `pintura_fornada_config`. Expõe `custoPorFornada` e `setCustoPorFornada`.

### 3. Hook novo `useFornadasResumo`
- Reaproveita `pintura_inicios` (já carregado pelo `usePinturaInicios`) e busca `ordens_pintura` (status `concluida`) ordenadas por `data_conclusao`.
- Agrupa cada ordem na fornada cujo intervalo (iniciado_em → próxima fornada) contém sua `data_conclusao`.
- Retorna, para cada fornada: `qtdPortas`, `custoFornada = custoPorFornada`.

### 4. UI — nova aba "Resumo" em `ControleFornadas.tsx`
- Aba "Resumo das Fornadas" (default), mantendo as abas "Fornadas" e "Trocas de Gás".
- Topo da aba: card com input editável "Custo por fornada (R$)" (salva ao confirmar), badge com total de fornadas e custo total acumulado.
- Lista/tabela de fornadas (mais recentes primeiro) com colunas:
  - Data/hora do início
  - Responsável (avatar + nome)
  - Portas pintadas (badge numérico)
  - Custo (R$)
  - Status de recarga (badge)
- Visual seguindo o padrão glassmórfico já usado na página (`bg-white/5`, `border-white/10`, blue/white).

## Detalhes técnicos

- Para identificar portas "de enrolar" usaremos join leve via `pedidos_producao` (`tipo_produto = 'porta_enrolar'` ou equivalente). Se o esquema atual não distinguir, manteremos a contagem como "ordens de pintura concluídas no intervalo" e ajustaremos quando o usuário confirmar.
- O intervalo de cada fornada termina em `iniciado_em` da próxima fornada (exclusivo) ou em `now()` na mais recente.
- Custo total exibido = `nº fornadas × custo_por_fornada`.
- Sem alterações em rotas, permissões ou fluxo da pintura.
