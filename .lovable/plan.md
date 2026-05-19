## Ajustes no PDF de `/direcao/dre/2026-04`

### 1. Centralizar tópicos azuis
- No `PrintReport`, o estilo `H2` (banner azul `#1e3a8a` usado em cada seção: "1. Faturamento por Categoria", "2. Lucro por Categoria", etc.) recebe `textAlign: 'center'`.
- As linhas de TOTAL com fundo azul (`<tr style={{ background: '#1e3a8a' }}>`) continuam com o conteúdo das células existentes (labels à esquerda, valores à direita) — interpretando "tópicos" como os **títulos de seção**. Confirme se quer também centralizar a linha TOTAL.

### 2. Remover o link no rodapé
- O link no rodapé é o **URL adicionado automaticamente pelo Chrome** ao imprimir (não há `<a>` no código). O Chrome só esconde esses headers/footers nativos quando `@page { margin: 0 }`.
- Solução: mudar o CSS de impressão para:
  - `@page { size: A4; margin: 0; }`
  - Adicionar `padding: 14mm 12mm` em `#dre-print-document` para preservar as margens visuais atuais.
- Resultado: URL e timestamp do navegador desaparecem do rodapé do PDF gerado.

### Arquivo
- `src/pages/direcao/DREMesDirecao.tsx` apenas.

Sem alterações de dados, rotas ou banco.
