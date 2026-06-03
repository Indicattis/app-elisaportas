## Objetivo
Permitir exportar em PDF a folha do mês atualmente selecionado na tela /financeiro/custo-folha, com todos os colaboradores, valores lançados e totais.

## Mudanças

1. **Novo utilitário `src/utils/custoFolhaMensalPDFGenerator.ts`**
   - Função `exportCustoFolhaMensalPDF(mesLabel, linhas, totais)` usando `jspdf` + `jspdf-autotable` (mesmo padrão do `folhaSalarialPDFGenerator.ts`).
   - Cabeçalho com logo Elisa Portas, dados da empresa e título "Custo em Folha — {mês de referência}".
   - Tabela com colunas: Colaborador, Salário Base, Ajuda Custo, Horas Extras, Bônus, Pensão, Total, Previsão, Adiantamento, Pago (Sim/Não), Data Pagamento, Chave PIX.
   - Linha final de totais (Salário Base, Ajuda, H.Extras, Bônus, Pensão, Total, Previsão, Adiantamento).
   - Rodapé padrão e download como `custo-folha-{YYYY-MM}.pdf`.
   - Apenas inclui colaboradores que tenham algum dado preenchido no mês (mesma regra do save).

2. **`src/pages/administrativo/CustoFolhaMensal.tsx`**
   - Importar ícone `FileDown` e a nova função.
   - Adicionar botão "Exportar PDF" na barra do seletor de mês (ao lado direito), desabilitado durante `loading`.
   - Handler `handleExportPDF()` monta o array de linhas a partir de `colaboradores` + `valores` (usando `getLinha`, `totalLinha`, `formatBRL`) e chama o utilitário com `mesLabel` e `totais`.

## Detalhes técnicos
- Sem alterações de banco, hooks ou lógica de negócio — apenas leitura do estado já carregado em tela.
- Mantém estética glassmorphism existente (botão `bg-white/5 border-white/10`).
- Formatação BRL via `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.
- Datas formatadas como `dd/MM/yyyy` (pt-BR), com `T12:00:00` para evitar shift de fuso.
