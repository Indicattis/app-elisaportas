# Gerenciar tipos de despesa (adicionar / excluir)

Hoje as 11 seções de despesa (Fixas, Variáveis, Impostos, Projetadas, Autorizados, Salários, Fretes, etc.) estão fixas no código. O painel "Tipos no DRE" só liga/desliga o débito no lucro. A ideia é torná-las gerenciáveis: criar novas e excluir existentes, decidindo para onde vão os custos já cadastrados.

## O que muda para o usuário

No painel "Tipos no DRE" (botão no header de `/direcao/estrategia/despesas`, da página do mês e das Configurações padrão):

- **Adicionar tipo**: campo de nome + chave "Debita do lucro no DRE". O novo tipo passa a aparecer como uma seção própria nas telas de despesas e no DRE/PDF.
- **Excluir tipo**: só habilitado quando o tipo não é de sistema. Ao clicar, abre uma confirmação mostrando quantos tipos de custo estão cadastrados naquela seção e um seletor "Mover os N custos para:" com os demais tipos. A exclusão só ocorre depois da realocação.
- Tipos sem nenhum custo cadastrado são excluídos direto, com confirmação simples.
- **Folha Salarial** não pode ser excluída nem renomeada (é uma seção calculada, não tem custos em `tipos_custos`); fica marcada como "seção do sistema", apenas com a chave de débito.
- Renomear o rótulo de um tipo existente também fica disponível (edição inline do nome).

## Detalhes técnicos

Banco:
- Nova tabela `public.despesas_tipos`: `chave` (text, único, slug), `nome`, `debita_dre` (bool, default true), `ordem` (int), `sistema` (bool, default false), `ativo`, timestamps. Com GRANTs (`authenticated` leitura/escrita, `service_role` all), RLS habilitada e políticas equivalentes às de `despesas_categoria_dre_config`.
- Seed com as 11 seções atuais, preservando a ordem exibida hoje e o valor de `debita_dre` já gravado em `despesas_categoria_dre_config` (`folha` marcada como `sistema = true`).
- `despesas_categoria_dre_config` continua sendo a fonte do flag para não quebrar nada; `despesas_tipos.debita_dre` é sincronizado com ela nas gravações (ou o hook passa a ler de `despesas_tipos` e escrever nas duas). A coluna `tipos_custos.tipo` já é `text`, então não há enum a alterar.
- Exclusão com realocação: `UPDATE tipos_custos SET tipo = <destino> WHERE tipo = <origem>` e então remoção da linha em `despesas_tipos` — feito por uma função `SECURITY DEFINER` (`excluir_tipo_despesa(origem, destino)`) para garantir atomicidade.

Frontend:
- `useCategoriaDreConfig` passa a carregar a lista de tipos de `despesas_tipos` (com fallback para a lista fixa se a tabela estiver vazia) e expõe `tipos`, `criarTipo`, `excluirTipo(origem, destino)`, `renomearTipo`, além do `debita`/`toggle` atuais. O tipo `CategoriaDespesa` vira `string`.
- `TiposDreDialog.tsx`: lista vinda do hook, botão "Novo tipo", ação de excluir por linha e diálogo de realocação com contagem por tipo.
- As listas hardcoded de grupos em `EstrategiaDespesasConfiguracoes.tsx`, `EstrategiaDespesasMes.tsx`, `DespesasResumoTopo.tsx`, `useDRE.ts`, `GastoFormDialog.tsx` e o PDF do DRE (`DREMesDirecao.tsx`) passam a iterar sobre os tipos vindos do banco, mantendo os rótulos atuais via seed.
