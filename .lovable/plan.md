## Objetivo
No PDF "Lista de Compras" gerado em `/direcao/gestao-fabrica`, adicionar duas colunas relativas à matéria-prima vinculada ao material e exibir todas as quantidades (necessário e a comprar) com a unidade de medida correta — usando o catálogo `src/utils/unidadesMedida.ts` (rolo, kg, m, cm, un, etc.).

## Mudanças

### 1. `src/pages/direcao/GestaoFabricaDirecao.tsx` — coleta de dados

- Ampliar o `select` de `estoque` na query de linhas para incluir `materia_prima_id` e `materia_prima_conversao` (quantos do material são produzidos por 1 unidade da matéria-prima).
- Após montar o `map` de itens, buscar em uma única query `materias_primas` (`id, nome, unidade`) para todos os `materia_prima_id` distintos.
- Estender `ItemListaCompras` com os campos opcionais:
  - `materia_prima_nome?: string`
  - `materia_prima_unidade?: string`
  - `materia_prima_conversao?: number` (qtd de material produzida por 1 un. da MP)
- Preencher esses campos nos itens antes de chamar `gerarListaComprasPDF`.

### 2. `src/utils/listaComprasPDF.ts` — colunas e formatação

- Substituir `pluralUnidade` pelo helper `formatarQuantidadeUnidade(qtd, unidade)` de `src/utils/unidadesMedida.ts`, que já trata unidades discretas (inteiros) vs contínuas (decimais) e devolve labels amigáveis (ex.: `2 rolos`, `5,50 kg`, `200 cm`).
- Atualizar a tabela `autoTable` para 6 colunas:
  1. `#`
  2. `MATERIAL` (nome + linha de "Padrão")
  3. `NECESSÁRIO` — quantidade na unidade do material
  4. `COMPRAR (MATERIAL)` — quantidade calculada via `quantidade_padrao` (lógica atual), na unidade do material
  5. `MATÉRIA-PRIMA` — nome (ou `—` quando não vinculada)
  6. `COMPRAR (MATÉRIA-PRIMA)` — `Math.ceil(necessario / materia_prima_conversao)` na unidade da matéria-prima (ou `—` quando não houver vínculo/conversão)
- Larguras ajustadas para caber em A4 retrato; se ficar apertado, mudar a orientação do `jsPDF` para `landscape` (preferir paisagem para acomodar 6 colunas confortavelmente).
- Manter o agrupamento por categoria, cabeçalho azul e rodapé existentes.

## Fora do escopo
- Nenhuma alteração de banco de dados, RLS, hooks ou regra de negócio.
- Sem novas telas; apenas o PDF e a query que o alimenta.

## Detalhes técnicos
- Conversão: `comprar_mp = Math.ceil(necessario_material / materia_prima_conversao)` (mesma lógica usada no `VincularMaterialDialog`).
- Unidades exibidas via `formatarQuantidadeUnidade` para padronizar com o catálogo já usado em `/fabrica/produtos/materias-primas`.
- `quantidade_padrao` continua opcional; quando ausente, "COMPRAR (MATERIAL)" exibe `—`.
