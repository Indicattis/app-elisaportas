
## Objetivo

Transformar as páginas `/direcao/estrategia/kits/lucro-pinturas` e `/direcao/estrategia/kits/lucro-instalacoes` em telas de configuração reais, oferecendo como **primeira opção (modo padrão)** o cálculo estático mais simples: o usuário informa a **% de custo** e o sistema calcula automaticamente a **% de lucro** (lucro% = 100% − custo%). O valor configurado passa a ser usado no faturamento da venda.

## O que muda na prática

Hoje, no faturamento da venda:
- Instalação: lucro = 40% do valor total (fixo no código)
- Pintura Epóxi: lucro = (altura × largura) × 25 (fórmula fixa no código)

Depois desta mudança:
- Instalação: lucro = (100% − custo% configurado) × valor total
- Pintura Epóxi: lucro = (100% − custo% configurado) × valor total
- Os valores padrão iniciais ficam iguais ao comportamento atual (instalação 60% custo / 40% lucro; pintura também passa a usar o modelo estático, padrão sugerido a definir com o usuário — proposta: 60% custo / 40% lucro).

A fórmula antiga da pintura (`altura × largura × 25`) deixa de ser usada nesse modo estático.

## Telas

Ambas as páginas terão a mesma estrutura:

1. **Card "Modo de cálculo"** — exibe a opção ativa. Inicialmente só existe a opção "Estático (% de custo fixa)", já marcada como padrão. Espaço preparado para futuras opções (ex.: fórmula por dimensão).
2. **Card "Configuração estática"** — campo numérico para informar a **% de custo** (0–100, aceita 1 casa decimal). Ao lado, exibe automaticamente a **% de lucro calculada** (100 − custo). Botão "Salvar".
3. **Card "Pré-visualização"** — mostra um exemplo: para um valor de R$ 1.000, qual seria o custo e o lucro resultantes com a configuração atual.

## Persistência

Criar tabela `vendas_config_lucro` no Supabase para guardar as configurações por tipo:

- `tipo` (text, único): `'instalacao'` ou `'pintura_epoxi'`
- `modo` (text): `'estatico'` (único valor por enquanto)
- `percentual_custo` (numeric): 0–100
- updated_at / updated_by

Seed inicial:
- `instalacao` → 60% custo (mantém comportamento atual)
- `pintura_epoxi` → 60% custo (a confirmar com o usuário)

RLS: leitura para `authenticated`; escrita apenas para perfis com acesso a `direcao_estrategia` (via `has_role` ou helper já usado nas outras telas de estratégia — confirmar padrão existente).

## Integração com o faturamento

No `src/pages/administrativo/FaturamentoVendaMinimalista.tsx`:

- **Instalação** (efeito que hoje faz `lucroInstalacao = valor_total * 0.40`): passa a ler `percentual_custo` da config `instalacao` e calcular `lucro = valor_total * (1 - custo/100)`.
- **Pintura Epóxi** (efeito que hoje faz `lucroPintura = (altura * largura) * 25`): passa a ler `percentual_custo` da config `pintura_epoxi` e calcular `lucro = valor_total * (1 - custo/100)`. O badge "Fórmula" exibido no item passa a ser "Estático".

Cache leve via React Query para evitar chamadas repetidas dentro do mesmo faturamento.

## Detalhes técnicos

- Novo hook `useConfigLucro(tipo)` com React Query (`select`/`upsert` em `vendas_config_lucro`).
- Componente compartilhado `ConfigLucroEstatico` que recebe `tipo` e renderiza os 3 cards acima, reutilizado pelas duas páginas.
- Validação: custo entre 0 e 100, máximo 1 casa decimal.
- Estilo seguindo o glassmorphism unificado (bg-white/5, backdrop-blur-xl, border-white/10).

## Itens a confirmar antes de implementar

1. % de custo padrão inicial para **pintura epóxi** no modo estático (sugestão: 60%).
2. Permissão de edição: liberar para qualquer usuário com acesso à rota `direcao_estrategia`, ou exigir papel específico (ex.: CEO/Diretor)?

## Fora de escopo

- Outros modos de cálculo (por dimensão, por faixa de valor, por tipo de pintura) — ficam preparados estruturalmente, mas não implementados agora.
- Recalcular vendas já faturadas com a nova configuração — só passa a valer para faturamentos novos.
