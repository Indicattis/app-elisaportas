
## Objetivo

Em `/direcao/estrategia/kits/lucro-pinturas`, transformar o card "Modo de cálculo" em uma **lista selecionável** com duas opções, deixando o usuário escolher qual é usada no faturamento:

1. **Estático (% de custo fixa)** — já existente. Lucro = (100% − custo%) × valor_total.
2. **Fórmula por dimensão (Epóxi clássica)** — nova. Lucro = (altura × largura) × R$ por m². Custo = valor_total − lucro.

A opção fica em "Instalações" continua exibindo apenas o modo Estático (a fórmula por dimensão não faz sentido lá).

## Comportamento da tela

- O card "Modo de cálculo" passa a mostrar dois cards/linhas clicáveis (radio). O selecionado fica destacado em azul como hoje, o outro em estilo neutro.
- Ao trocar de modo, o card de configuração abaixo muda:
  - **Estático**: campos atuais (% de custo, % de lucro calculada).
  - **Fórmula por dimensão**: campo editável `Valor por m² (R$)`, padrão R$ 25,00. Mostra a fórmula como texto: `lucro = (altura × largura) × valor_m²`.
- O card "Pré-visualização" também se adapta:
  - **Estático**: mantém exemplo de R$ 1.000.
  - **Fórmula**: exemplo de uma porta 3,00 m × 2,50 m → mostra lucro = 7,5 × valor_m² e custo (depende do valor_total — exibimos só o lucro absoluto e, se quiser, um valor total de exemplo configurável; proposta: usar 7,5 m² × valor_m² e exibir só o lucro, deixando claro que o custo depende do valor cobrado).
- Botão "Salvar configuração" persiste o modo ativo e os parâmetros daquele modo.

## Persistência

Estender a tabela `vendas_config_lucro`:

- Adicionar coluna `parametros JSONB NOT NULL DEFAULT '{}'::jsonb` para guardar parâmetros específicos do modo (ex.: `{ "valor_m2": 25 }` para a fórmula).
- Relaxar o `CHECK` de `modo` para aceitar `'estatico'` e `'formula_dimensao'`.
- Manter `percentual_custo` (usado apenas no modo estático). Quando o modo for `formula_dimensao`, o valor de `percentual_custo` é ignorado.

Sem mudança no registro de instalação — ele continua em modo estático.

## Integração com o faturamento

No efeito de auto-faturar pintura em `FaturamentoVendaMinimalista.tsx`:

- Buscar a config completa (`modo`, `percentual_custo`, `parametros`).
- Se `modo === 'estatico'`: continua como hoje (custo = valor_total × %custo).
- Se `modo === 'formula_dimensao'`: extrair altura/largura como antes (campo `tamanho` ou `altura`/`largura`), aplicar `lucro = altura × largura × valor_m2` (default 25), `custo = valor_total − lucro` (clamp em 0 caso o resultado fique negativo).
- O badge no item mostra "Estático" ou "Fórmula" conforme o modo ativo.

`fetchPercentualCusto` será substituído / acompanhado por uma nova função `fetchConfigLucro(tipo)` que retorna o objeto completo, e o hook `useConfigLucro` passa a expor `parametros` e aceitar salvar `{ modo, percentual_custo, parametros }`.

## Detalhes técnicos

- Tipo `ConfigLucroModo = 'estatico' | 'formula_dimensao'`.
- `useConfigLucro` retorna `{ modo, percentual_custo, parametros }`; `save` aceita os 3 campos.
- Componente `ConfigLucroEstatico` é renomeado/refatorado para `ConfigLucro` recebendo `tipo` e `modosDisponiveis`. Para `tipo='instalacao'` passamos `['estatico']`; para `tipo='pintura_epoxi'` passamos `['estatico','formula_dimensao']`.
- Validação do valor por m²: número > 0, até 2 casas decimais.

## Fora de escopo

- Recalcular vendas já faturadas.
- Adicionar a fórmula por dimensão ao card de Instalações.
- Outros modos (faixa de valor, por tipo de tinta).
