# Exportar PDF das multas

Adicionar um botão "Exportar PDF" no cabeçalho de `/administrativo/multas` que gera um relatório com a mesma tabela exibida na tela.

## Conteúdo do PDF

- Cabeçalho: título "Relatório de Multas", data de geração e quantidade de registros.
- Tabela em paisagem com as colunas atuais: Data do ocorrido, Descrição, Status de pagamento, Aceite do condutor, Condutor, Dias, Valor, Acréscimo (3x) e Valor com acréscimo.
- Multas sem condutor ("Aguardando transferência") destacadas, mostrando o acréscimo.
- Rodapé de totais: quantidade, total pendente, total pago e total de acréscimos.
- Numeração de páginas.

## Comportamento

- Exporta exatamente o que está visível: respeita a busca e a ordenação aplicadas na tela.
- Se não houver linhas, o botão fica desabilitado.

## Detalhes técnicos

- Novo `src/utils/multasPDFGenerator.ts` usando jsPDF + autoTable, no mesmo padrão dos geradores existentes (ex.: `tiposCustosPDFGenerator.ts`), com a cor azul Elisa `#1d76cf` no cabeçalho.
- `src/pages/administrativo/MultasMinimalista.tsx`: botão no header chamando o gerador com `linhas`, `totalPendente`, `totalPago` e `totalAcrescimos` já calculados no componente.
