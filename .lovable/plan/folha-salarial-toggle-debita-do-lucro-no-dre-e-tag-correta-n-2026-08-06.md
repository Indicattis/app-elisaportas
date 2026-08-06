# Folha salarial: toggle "Debita do lucro no DRE" e tag correta no PDF

## Situação atual (verificada)
- Na tabela de configuração `despesas_categoria_dre_config`, a chave `salario` está com "não debita". Essa chave hoje é usada por **duas** coisas diferentes: a seção "Salários" (tipos de custo) e a seção "Folha Salarial".
- No cálculo do lucro líquido do DRE, a **folha salarial é sempre subtraída** (debita), independentemente da configuração.
- Por isso o PDF mostra a tag "○ Não debita" na seção "4. Folha Salarial", mesmo ela debitando — é apenas rótulo errado, o cálculo está certo.
- A seção da folha em `/direcao/estrategia/despesas/2026-08` não tem o controle "Debita do lucro no DRE" que as outras seções já possuem.

## O que será feito
1. Separar a folha salarial da categoria "Salários" criando uma chave própria de configuração (`folha`), com padrão **debita = sim**, refletindo o comportamento atual.
2. Adicionar na seção "Folha Salarial" da página de despesas o mesmo controle "Debita do lucro no DRE" das demais seções, já ligado (verde).
3. No DRE:
   - A tag da seção "4. Folha Salarial" no PDF e a tag na linha "(–) Folha Salarial" do Resumo Final passam a ler a nova chave — portanto exibirão "● Debita DRE".
   - O cálculo do lucro líquido passa a respeitar esse toggle (hoje é fixo), mantendo o resultado atual enquanto estiver ligado.
4. A seção "13. Salários" continua usando a chave `salario` como hoje.

## Detalhes técnicos
- `src/hooks/useCategoriaDreConfig.ts`: incluir `'folha'` no tipo `CategoriaDespesa`.
- Migração: inserir a linha `('folha', true)` em `despesas_categoria_dre_config`.
- `src/pages/direcao/estrategia/EstrategiaDespesasConfiguracoes.tsx`: no cabeçalho de `FolhaBlock`, reutilizar o mesmo bloco de switch usado nas seções de tipos de custo, chamando `toggle('folha')`.
- `src/pages/direcao/DREMesDirecao.tsx`:
  - linha 743: `badgeDebita(debitaCat('folha'))`;
  - Resumo Final (linha ~615): `cat: 'folha'`;
  - lucro líquido (linha 2209): `- (debitaCat('folha') ? totalDespFolha : 0)`.
