# Ajustes estéticos no PDF do DRE

Arquivo único: `src/pages/direcao/DREMesDirecao.tsx` (componente `PrintReport`, linhas 110–445). Nenhuma mudança de dados/lógica.

## 1. Remover a linha abaixo do cabeçalho

No `<div>` do cabeçalho (linha ~189), remover `borderBottom: '3px solid #1e3a8a'` e o `paddingBottom: 10`, deixando apenas `marginBottom` para espaçar do bloco de KPIs.

## 2. Enquadrar cada KPI principal (faturamento bruto, lucro bruto, etc.)

Hoje cada card de KPI (linhas ~233–250) usa `border: '1px solid #e2e8f0'` com `borderTop: '3px solid ...'` (linha azul/verde só no topo).

Trocar para um quadro completo ao redor de cada KPI:
- `border: '1.5px solid #1e3a8a'` (ou usar `k.accent` para diferenciar Lucro/Margem Líquida em verde).
- Remover o `borderTop` extra.
- Manter `background: '#fafbfc'`, `padding`, conteúdo interno e tipografia atuais.
- Pequeno `borderRadius: 4` para suavizar (opcional, combina com o restante).

Resultado: cada índice fica visualmente cercado por uma caixa, em vez de só uma régua no topo.

## 3. Fundo azul nos títulos de seção

O estilo `H2` (linhas ~152–161) é usado em "1. Faturamento por Categoria", "2. Resumo Final", "3. Despesas Fixas", "4. Folha Salarial", "5. Despesas Variáveis", "6. Despesas Projetadas do Ano" e "7. Estoque".

Atualizar `H2` para virar uma faixa azul preenchida:
- `background: '#1e3a8a'`
- `color: '#ffffff'`
- `padding: '6px 10px'`
- `borderBottom: 'none'`
- `borderRadius: 3`
- Manter `fontSize`, `fontWeight`, `textTransform`, `letterSpacing`.

Todos os títulos numerados (1 a 7) ganham automaticamente o mesmo fundo azul.

## 4. Destacar % Margem Líquida e Lucro Líquido no Resumo Final

Hoje a última linha da tabela "Resumo Final" (linhas ~319–326) junta tudo: `LUCRO LÍQUIDO ... R$ X (Y%)`.

Mudança:
- Manter a tabela com as linhas de receitas/despesas (Faturamento Bruto, Margem Bruta, Lucro Bruto, (–) Despesas Fixas, (–) Folha, (–) Variáveis), removendo a linha final fundida.
- Logo abaixo da tabela, adicionar dois cards destacados lado a lado (mesmo padrão visual dos KPIs do topo, em verde/vermelho conforme sinal):
  - **Margem Líquida** — `${percLiquidFinal.toFixed(1)}%`, cor verde se ≥ 0, vermelha caso contrário.
  - **Lucro Líquido Final** — `formatCurrency(lucroLiquidoFinal)`, mesma regra de cor.
- Cards com `border` de 1.5px na cor do valor (verde `#047857` / vermelho `#b91c1c`), fundo `#fafbfc`, label em caps pequeno e valor grande, com `pageBreakInside: 'avoid'`.

Ambos os valores já existem no escopo (`percLiquidFinal`, `lucroLiquidoFinal`) — não há cálculo novo.

## Fora de escopo

- Não alterar a versão em tela (`#dre-screen-area`), apenas o PrintReport (PDF).
- Sem mudanças em hooks, dados ou cálculos.
