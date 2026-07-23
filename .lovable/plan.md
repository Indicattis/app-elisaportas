## Objetivo
Transformar a tabela estática de "Frete por Porta (Região)" (hoje hardcoded em `src/utils/fretePorPorta.ts`) em uma tabela editável no banco de dados, com nova página acessível via botão no hub `/logistica/frete`.

## Escopo

### 1. Banco de dados
Nova tabela `frete_por_porta_regiao`:
- `regiao` (texto, único) — Sul, Sudeste, Centro-Oeste, Nordeste, Norte
- `valor_unitario` (numeric) — valor cobrado por porta
- padrão + updated_at/created_at
- RLS: leitura para authenticated; escrita para admins/gerentes (mesmo padrão das outras tabelas de frete).
- Seed com os 5 valores atuais (Sul 750, Sudeste 1200, Centro-Oeste 950, Nordeste 1500, Norte 1800).

### 2. Nova página `/logistica/frete/por-porta`
- Rota adicionada em `App.tsx` (ou onde estão as rotas de logística).
- Página `FretePorPortaPage.tsx` no padrão glassmorphism das outras páginas de frete:
  - Breadcrumb Home > Logística > Frete > Frete por Porta
  - Tabela com 5 regiões e input editável de "Valor por porta (R$)"
  - Botão Salvar (upsert em lote)
  - Preview do cálculo (ex.: "3 portas × R$ 750 = R$ 2.250")

### 3. Hub `/logistica/frete`
- Adicionar novo card/botão "Frete por Porta" apontando para a nova rota, ao lado dos existentes (Valores Internos, Valores Transportadoras, Transportadoras).

### 4. Consumo dinâmico
- Novo hook `useFretePorPortaRegiao()` que faz cache da tabela.
- Refatorar `src/utils/fretePorPorta.ts`:
  - Manter função pura `calcularFretePorPorta(uf, qtdPortas, tabela)` recebendo o mapa de valores.
  - Manter os valores estáticos apenas como fallback caso a tabela esteja vazia/carregando.
- Atualizar `VendaNovaMinimalista.tsx` para usar o hook e passar a tabela ao cálculo, sem alterar UX.

## Fora do escopo
- Nenhuma mudança em outras modalidades de frete (interno, por conta do cliente).
- Sem alteração de valores já salvos em vendas existentes.
