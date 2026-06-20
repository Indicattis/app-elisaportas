## Mudança

A região passa a ser um conjunto de **cidades** (não mais de estados). O fluxo agora é:

1. **Mapa do Brasil** (igual hoje).
2. Usuário clica num **estado** → a tela faz drill-down e mostra o **mapa de municípios** desse estado.
3. Usuário clica/desmarca cidades. Só são selecionáveis as cidades existentes em `frete_cidades`; demais aparecem desabilitadas (cinza, sem clique).
4. Botão **Voltar ao Brasil** permite repetir o processo em outro estado. Estados que já têm cidades na região aparecem destacados no mapa do Brasil.
5. Cidades selecionadas ficam listadas como chips abaixo do mapa, agrupadas por UF, com botão de remover.

Tudo isso dentro do mesmo dialog "Nova/Editar região" (nome no topo, área do mapa no meio, chips no rodapé).

## Banco

Trocar a tabela de estados por uma de cidades; manter regiões e preços por largura.

```text
DROP TABLE frete_regiao_estados

CREATE frete_regiao_cidades
  id, regiao_id (FK cascade), cidade_id (FK → frete_cidades)
  UNIQUE (regiao_id, cidade_id)
  + trigger: cidade_id não pode existir em outra região da mesma transportadora
```

GRANTs + RLS no mesmo padrão das demais tabelas de frete.

`frete_regioes` e `frete_regiao_larguras` continuam idênticos.

## Carregamento do mapa de municípios

- **Fonte:** `https://cdn.jsdelivr.net/gh/tbrugz/geodata-br@master/geojson/geojs-XX-mun.json` (XX = código IBGE da UF, ex.: 35 = SP).
- **Lazy:** baixa só quando o usuário entra no estado; cache em memória por sessão.
- Mostra **spinner** durante o download.
- Match polígono ↔ `frete_cidades`: normalizar nome (uppercase + remover acentos) e filtrar por `estado`. Polígono sem match em `frete_cidades` fica em cinza desabilitado (com tooltip "cidade não cadastrada em frete").
- Cidades já usadas por outra região da transportadora ficam **desabilitadas** com tooltip ("já em <nome>").

## Frontend

Novos:
- `src/components/logistica/MapaMunicipiosEstado.tsx` — fetch + render do mapa estadual, com seleção por clique e props equivalentes ao MapaEstadosBrasil.

Editados:
- `src/components/logistica/MapaEstadosBrasil.tsx` — adicionar prop `highlightedStates: Set<string>` para destacar estados que já contém cidades na região em edição.
- `src/components/logistica/RegiaoFormDialog.tsx` — passa a ter modo país/estado, controla cidades selecionadas (array de `cidade_id`), exibe chips por UF com remover. Validação: nome + pelo menos 1 cidade.
- `src/components/logistica/RegiaoCard.tsx` — exibir contagem por estado e lista de cidades em vez de chips de UF; preços por largura permanecem iguais.
- `src/hooks/useFreteRegioes.ts` — `estados` → `cidades` (array de `{ id, nome, estado }`). `saveRegiao` agora persiste em `frete_regiao_cidades`.
- `src/pages/logistica/FreteValoresTransportadoras.tsx` — pequenas adaptações de labels.

Removidos:
- `frete_regiao_estados` (tabela + qualquer referência em hooks/types).

## Fora de escopo

- Mostrar/calcular frete baseado nesse novo modelo em orçamentos/vendas (apenas cadastro).
- Importar cidades faltantes em `frete_cidades` automaticamente (usuário continua usando a tela existente de Fretes Internos para cadastrar cidades).
