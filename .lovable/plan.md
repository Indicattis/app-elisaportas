## Objetivo

Adicionar um botão "Exportar PDF" no header de `/direcao/caixa-elisa/capital-giro` que gera um PDF com o conteúdo da página (indicadores + lista de obrigações).

## Implementação

**`src/pages/direcao/caixa-elisa/CapitalGiroPage.tsx`**

1. Adicionar botão "Exportar PDF" (ícone `FileDown`) no header, ao lado do "Nova obrigação", com o mesmo estilo minimalista glassmorphism (variante secundária, `bg-white/5 border-white/10`).
2. Ao clicar, gerar o PDF usando `jspdf` + `jspdf-autotable` (já presentes no projeto — utilizados em outras exportações como `estrategiaPrecosExport.ts`).

**Conteúdo do PDF** (A4 retrato):
- Cabeçalho: título "2 Milhões Capital de Giro" e data de geração.
- Bloco de indicadores (cards): Capital de Giro, Total Pendente, Saldo Disponível — em formato R$ BRL.
- Tabela de obrigações com colunas: Nome, Data (dd/MM/yyyy), Valor (R$), Status (Pago / Pendente). Ordenada por data (asc), como já vem do banco.
- Linha final de totais: soma de valores pagos, pendentes e total geral.
- Rodapé com numeração de páginas.

**Nome do arquivo**: `capital-giro-YYYY-MM-DD.pdf`.

## Escopo

Frontend apenas — nada de banco/edge functions. Reutiliza libs já instaladas.
