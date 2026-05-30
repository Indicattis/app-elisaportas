## Objetivo
Adicionar botão "Exportar PDF" para cada uma das 3 sessões de Tipos de Custos (Fixas, Variáveis, Impostos) em `/direcao/estrategia/despesas/configuracoes`. A sessão "Folha Salarial" já possui exportação.

## Mudanças

### 1. Novo utilitário `src/utils/tiposCustosPDFGenerator.ts`
Criar `exportTiposCustosPDF(titulo, items, categorias)` usando jsPDF + autoTable (mesmo padrão de `folhaSalarialPDFGenerator` / `estrategiaItensExport`):
- Cabeçalho: título da sessão (ex.: "Tipos de Custos — Fixas") e data de geração.
- Agrupar itens por categoria (igual à UI). Itens sem categoria entram em "Sem categoria".
- Por grupo: linha de cabeçalho com nome da categoria + contagem, e tabela com colunas:
  Nome | Descrição | Empresa | Valor máx. mensal | DRE (Sim/Não) | Ativo (Sim/Não).
- Linha final TOTAL somando `valor_maximo_mensal` apenas dos ativos (mesma lógica do `totalAtivos` da UI).
- Nome do arquivo: `tipos-custos-{slug-do-titulo}-YYYY-MM-DD.pdf`.

### 2. `src/pages/direcao/estrategia/EstrategiaDespesasConfiguracoes.tsx`
No header do `TiposCustoBlock` (logo antes do botão "Gerenciar categorias"), adicionar botão "Exportar PDF" no mesmo estilo `rounded-full` neutro (bg-white/5) com ícone `FileText`, chamando `exportTiposCustosPDF(titulo, items, categorias)`.

Nenhuma alteração de lógica de negócio; apenas UI + util de exportação.
