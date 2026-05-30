## Exportar Folha Salarial padrão em PDF

Adicionar um botão **"Exportar PDF"** no cabeçalho do bloco "Folha Salarial padrão" em `/direcao/estrategia/despesas/configuracoes` que gera um PDF agrupado por setor, com subtotais e total geral.

### O que vai no PDF

- Cabeçalho com título "Folha Salarial Padrão", data de geração e logo do sistema (mesmo padrão dos outros PDFs do projeto).
- Uma seção por setor (Vendas, Marketing, Instalações, Fábrica, Administrativo, Sem setor) — só aparece se tiver colaboradores.
- Tabela por setor com colunas: Colaborador, Em folha (Sim/Não), Salário, Combustível, Insalub valor, FGTS valor, Previsão 13°, FGTS 13°, Férias + 1/3, Total.
  - Colaboradores fora da folha mostram só salário e total (zerando as demais), igual à tela.
- Linha de **Subtotal do setor** ao fim de cada tabela.
- Bloco final com **Total de salários** e **Total da folha**.
- Orientação **paisagem (landscape)** A4 para caber bem as colunas.

### Implementação técnica

1. Criar `src/utils/folhaSalarialPDFGenerator.ts` usando `jspdf` + `jspdf-autotable` (já instalados, mesmo padrão de `colaboradoresPDFGenerator.ts`).
   - Função `exportFolhaSalarialPDF(items: DespesaPadrao[])`.
   - Reaproveita `calcFeriasDefault` / `calcTotalFolha` (mover para `src/utils/folhaSalarialCalc.ts` ou duplicar inline no generator — preferência: extrair para utilitário compartilhado e importar tanto na página quanto no generator, evitando divergência futura).
   - Agrupa por `SETORES` na mesma ordem da tela.
   - Usa `autoTable` por setor com `startY` dinâmico e `didDrawPage` para repetir o cabeçalho.

2. Em `src/pages/direcao/estrategia/EstrategiaDespesasConfiguracoes.tsx`:
   - Importar ícone `FileDown` do lucide.
   - Adicionar botão ao lado do contador `({items.length})` no header do `FolhaBlock`, estilo glass (`bg-white/5 hover:bg-white/10 border-white/10`).
   - Handler chama `exportFolhaSalarialPDF(items)`. Desabilitado se `items.length === 0`.

3. Nome do arquivo: `folha-salarial-padrao-YYYY-MM-DD.pdf`.

### Fora do escopo

- Não muda layout/UI da tabela na tela.
- Não exporta os blocos de Tipos de Custos nem de Impostos (apenas Folha Salarial conforme pedido).
- Não cria opções de filtro/seleção — exporta exatamente o que está salvo.
