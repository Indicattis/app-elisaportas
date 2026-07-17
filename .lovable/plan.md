Ajustes no PDF impresso do DRE em `src/pages/direcao/DREMesDirecao.tsx` (componente `PrintReport` + bloco de CSS `@media print` + `PrintDespesaTable`).

## 1. Listagem de vendas como 2ª página
- Mover o bloco "Vendas do Mês" (hoje no final, seção "9") para **logo após a 1ª página** (que hoje termina no "Resumo Final").
- Ficará como seção **3**, e as demais seções (Folha, Fixas, Variáveis, …, Estoque) serão renumeradas na sequência.
- Um `<div className="pdf-page-break" />` antes do bloco garante que Vendas comece em nova página. Outro `pdf-page-break` após Vendas mantém a separação para o restante.

## 2. Conteúdo em "paisagem" a partir da 2ª página (página física continua retrato)
- Manter `@page { size: A4; margin: 0; }` (retrato).
- Envolver todo o conteúdo a partir da 2ª página em um wrapper `.pdf-landscape-content` que aplica no `@media print`:
  - `transform: rotate(-90deg) translateY(-100%)` com `transform-origin: top left`
  - `width: 297mm; height: 210mm` (dimensões trocadas)
  - Uma "casca" externa com `width: 210mm; height: 297mm; overflow: hidden; page-break-before: always` para cada página lógica.
- Aplicar esse wrapper individualmente a cada seção que hoje começa após um `pdf-page-break` (Vendas do Mês, Folha, Fixas, Variáveis, Impostos, Investimentos, Fornecedores, Financiamentos, Fretes, Autorizados, Salários, Estoque), assim cada uma ocupa uma página física em retrato com conteúdo rotacionado ocupando o espaço em paisagem.
- A 1ª página (Cabeçalho + KPIs + Faturamento por Categoria + Resumo Final) permanece em retrato normal, sem rotação.

## 3. Gastos abaixo do respectivo tipo em cada seção
- Em `PrintDespesaTable`, garantir que **sempre** renderize os `d.gastos` como sub-linhas indentadas (com data + descrição + valor) logo abaixo da linha do tipo, inclusive quando `showProj` é false.
- Revisar as consultas que popularam `despesasFolha`, `despesasFixas`, `despesasVariaveis`, `despesasImpostos`, `despesasInvestimentos`, `despesasFornecedores`, `despesasFinanciamentos`, `despesasFretes`, `despesasAutorizados`, `despesasSalarios` para confirmar que o campo `gastos` está preenchido em todas — se alguma categoria não estiver trazendo `gastos`, ajustar a query para incluí-los (usando o mesmo padrão da folha/fixas).
- Adicionar subtotal por tipo (soma dos gastos) no caso de o valor do tipo divergir da soma dos gastos, mantendo a coluna "Projetado" para categorias que a têm.

## 4. Cor primária = azul Elisa (#1d76cf)
- Substituir todas as ocorrências de `#1e3a8a` (azul escuro atual usado em `H2`, cabeçalhos "TOTAL" das tabelas, KPIs, subtítulo do mês) por `#1d76cf` no `PrintReport` e no `PrintDespesaTable`.
- Onde houver contraste com texto branco (linhas TOTAL, cabeçalho H2), verificar legibilidade e manter branco no texto.

## Detalhes técnicos
Arquivo único afetado: `src/pages/direcao/DREMesDirecao.tsx`.

Trechos-chave a alterar:
- `H2` (linha ~371) → `background: '#1d76cf'`.
- `<tr style={{ background: '#1e3a8a', ... }}>` em Faturamento por Categoria (l.527), TOTAL despesas (l.949), TOTAL vendas (l.813) → `#1d76cf`.
- KPIs / "accent" `#1e3a8a` (l.467-469) → `#1d76cf`.
- Reordenar JSX: mover bloco de Vendas (l.766-826) para antes de "3. Folha Salarial" (l.619) e renumerar seções 3→13.
- Bloco `@media print` (l.2101-2146): adicionar regras `.pdf-landscape-page` (wrapper retrato) e `.pdf-landscape-content` (rotação).
- Estrutura JSX das seções pós-1ª página passa a ser:
  ```
  <div className="pdf-landscape-page">
    <div className="pdf-landscape-content">
      {conteúdo da seção}
    </div>
  </div>
  ```
- `PrintDespesaTable`: remover a dependência do `showProj` para renderização de gastos (linhas 921-945 hoje só ajustam colspan; garantir que os gastos sempre apareçam abaixo de cada tipo com data, descrição e valor).

## Fora de escopo
- UI de tela (`screenContent`) permanece inalterada.
- Cálculos/queries de valores permanecem inalterados (exceto acrescentar `gastos` em queries onde faltar).
