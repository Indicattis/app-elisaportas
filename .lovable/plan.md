## Mudanças no PDF do DRE (`src/pages/direcao/DREMesDirecao.tsx`)

### 1. Adicionar logotipo no topo
- Copiar `user-uploads://Logo_Elisa_Portas_de_ENROLAR_PRETO-4.png` para `src/assets/logo-elisa-dre.png`.
- Importar como ES6 no topo do arquivo: `import logoElisa from "@/assets/logo-elisa-dre.png"`.
- No componente `PrintReport`, no bloco "CABEÇALHO" (linhas 178‑204), inserir um `<img src={logoElisa} />` à esquerda do bloco de título "Demonstrativo de Resultados", com altura ~48px e `objectFit: contain`, mantendo o título e a coluna direita ("Emitido em") alinhados como hoje.

### 2. Remover seção "Top 5 Acessórios / Top 5 Itens Avulso"
- Excluir o bloco JSX das linhas ~283‑333 (`{(topAcessorios.length > 0 || topAdicionais.length > 0) && (...)}`)
- Manter as props `topAcessorios` e `topAdicionais` por enquanto sem uso no PDF (não tocar na lógica que as carrega — fora do escopo da requisição).

### 3. Mover "7. Resumo Final" para a posição da seção removida
- Recortar o bloco "RESUMO FINAL" atual (linhas ~419‑447) do final do relatório.
- Colá‑lo exatamente onde estava o Top 5 (logo após a tabela "1. Faturamento por Categoria" e antes do `<div className="pdf-page-break" />` que inicia as Despesas).
- Renomear o título de `"7. Resumo Final"` para `"2. Resumo Final"` e renumerar as seções seguintes:
  - Despesas Fixas: 2 → 3
  - Folha Salarial: 3 → 4
  - Despesas Variáveis: 4 → 5
  - Despesas Projetadas do Ano: 5 → 6
  - Estoque: 6 → 7
- Remover a referência antiga a "7. Resumo Final" no final (já movida).

### 4. Sem mudanças de lógica
- Cálculos, hooks e dados permanecem idênticos. Apenas reorganização visual e numeração das seções no PDF.

### Arquivos afetados
- `src/pages/direcao/DREMesDirecao.tsx` (edições no `PrintReport`)
- `src/assets/logo-elisa-dre.png` (novo arquivo, cópia do upload)
