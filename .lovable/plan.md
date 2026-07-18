## Objetivo

Enriquecer a seção **"4. Folha Salarial"** do PDF exportado em `/direcao/estrategia/dre/:mes` (`DREMesDirecao.tsx`) para trazer o mesmo nível de detalhamento por colaborador que já existe na exportação da folha em `/direcao/estrategia/despesas` (função `exportFolhaSalarialPDF` em `src/utils/folhaSalarialPDFGenerator.ts`).

Hoje essa seção do PDF do DRE lista apenas `Nome | Valor real | (Projetado)` via `PrintDespesaTable`, enquanto a folha padrão exporta um breakdown completo (Salário, Combustível, Bonificação, Hora Extra, Insalubridade, FGTS, Previsão 13°, FGTS 13°, Férias, Multa FGTS, Total), agrupado por setor.

## Alterações

### 1. Buscar campos detalhados da folha no DRE
Em `DREMesDirecao.tsx`, dentro de `fetchTiposCustos`/carregamento da folha (linhas ~1231-1273):

- Incluir `setor` no `select` de `despesas_padrao` (tipo `folha`).
- Deixar de reduzir cada colaborador a `{id, nome, valor_real}`. Manter o `despesasFolha` atual (compatível com a UI/`DespesaSectionReadOnly`) e adicionar um novo estado `folhaDetalhada: FolhaColaboradorDetalhe[]` contendo:
  - `id`, `nome`, `setor`, `em_folha`
  - Valores calculados por colaborador: `salario`, `aux_combustivel`, `bonificacao`, `hora_extra`, `insalubridade_val`, `fgts_val`, `prev_13`, `fgts_13`, `ferias`, `multa_fgts`, `total`
  - Mesmas fórmulas já usadas em `calcTotalFolha` daquele arquivo.

### 2. Novo componente de tabela detalhada para o PDF
Adicionar em `DREMesDirecao.tsx` um `PrintFolhaSalarialDetalhada` (React, HTML, mesmo estilo `TD`/`tdRight`/`H2`/paisagem já usado nas demais seções do PDF) que:

- Agrupa colaboradores por setor (ordem: Vendas, Marketing, Instalações, Fábrica, Administrativo, Sem setor — mesma ordem de `folhaSalarialPDFGenerator.ts`).
- Para cada setor, renderiza cabeçalho com nome do setor e contagem, seguido de tabela com colunas:  
  `Colaborador | Em folha | Salário | Comb. | Bonif. | H. Extra | Insalub. | FGTS | Prev. 13° | FGTS 13° | Férias | Multa FGTS | Total`.
- Subtotal do setor no final de cada grupo.
- Após todos os setores, uma linha de totais gerais (`Total de salários` e `Total da folha`) coerente com o `totalDespFolha` já usado no resumo.
- Colaboradores com `em_folha = false` seguem a mesma regra de exibição (zerar encargos), como já ocorre em `exportFolhaSalarialPDF`.

### 3. Trocar a tabela na seção 4 do PDF
Na página landscape "4. Folha Salarial" do `PrintReport` (linhas ~721-731):

- Substituir `<PrintDespesaTable items={despesasFolha} ... />` por `<PrintFolhaSalarialDetalhada items={folhaDetalhada} formatCurrency={formatCurrency} />`.
- Manter o badge "Debita DRE" e o título com "4. Folha Salarial".
- Manter as demais seções (5–13) inalteradas.
- Se a tabela ficar longa em meses com muitos colaboradores, permitir quebra natural em novas páginas paisagem (o layout já é `pdf-landscape-page`; ajustar CSS para permitir `page-break-inside: auto` na tabela detalhada).

### 4. UI da página (não muda)
A visualização em tela de `/direcao/estrategia/dre/:mes` continua usando `DespesaSectionReadOnly` com o resumo simples atual — o pedido é apenas sobre o PDF.

## Observações técnicas

- `despesas_padrao.setor` já é usado em `EstrategiaDespesasConfiguracoes.tsx`, então o campo existe.
- As fórmulas de cálculo por rubrica (insalubridade, FGTS, 13°, férias, multa FGTS) já estão implementadas no próprio `DREMesDirecao.tsx` (linhas ~1209-1229) e em `folhaSalarialPDFGenerator.ts`. Vou reutilizar a mesma fórmula, exposta em cada colaborador, para garantir que a soma bata com `totalDespFolha`.
- Sem mudanças no banco, sem RLS, sem novas rotas. Apenas fetch e render.
