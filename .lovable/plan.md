## Objetivo

Hoje a página `/direcao/estrategia/precos/regras` mistura dados editáveis (limites de desconto, senhas) salvos em `configuracoes_vendas` com várias regras hardcoded no JSX (intervalos de boleto, parcelas de cartão, regra de crédito, campos obrigatórios). A proposta cria uma tabela dedicada **`regras_vendas`** que armazena todas as regras de negócio de vendas em um único lugar, deixando `configuracoes_vendas` apenas para credenciais (senhas + responsáveis).

## Nova tabela `regras_vendas` (linha única, singleton)

Colunas:

- **Limites de desconto**
  - `limite_desconto_avista` numeric (default 3)
  - `limite_desconto_fria` numeric (default 5)  *(renomeado de `presencial`)*
  - `limite_adicional_responsavel` numeric (default 5)

- **Regras de acréscimo (crédito)**
  - `acrescimo_permite_com_desconto` boolean (default false)
  - `acrescimo_descricao` text

- **Boleto**
  - `boleto_intervalos_dias` integer[] (default `{7,15,21,28,30,45,60}`)

- **Cartão de crédito**
  - `cartao_parcelas_min` integer (default 1)
  - `cartao_parcelas_max` integer (default 12)
  - `cartao_habilita_desconto_avista` boolean (default false)

- **Pagamento à vista / dinheiro**
  - `avista_exige_comprovante` boolean (default true)

- **Campos obrigatórios (cliente / endereço / produtos)**
  - `obrigatorio_nome` / `obrigatorio_telefone` / `obrigatorio_estado` / `obrigatorio_cidade` / `obrigatorio_cep` boolean
  - `obrigatorio_bairro_min_chars` / `obrigatorio_endereco_min_chars` integer (default 2)
  - `produto_minimo_quantidade` integer (default 1)
  - `cpf_digitos` / `cnpj_digitos` integer (default 11 / 14)

- **Outras regras já presentes no projeto** (deixar editáveis aqui também)
  - `max_formas_pagamento` integer (default 2)
  - `pagamento_imediato_exige_comprovante` boolean (default true)
  - `bloqueia_desconto_com_credito` boolean (default true)

Trigger de `updated_at`, RLS (admin/CEO via `is_admin`/`has_role` editam, demais autenticados só leem), GRANTs corretos.

## Migração de dados

1. Criar `public.regras_vendas` com 1 linha default.
2. Copiar os valores atuais de `limite_desconto_avista`, `limite_desconto_presencial` (→ `limite_desconto_fria`) e `limite_adicional_responsavel` de `configuracoes_vendas` para `regras_vendas`.
3. **Manter** as colunas em `configuracoes_vendas` por ora (fallback), mas o código passa a ler/gravar em `regras_vendas`.

## Mudanças de código

- Novo hook `useRegrasVendas` (substitui a parte de "limites" do `useConfiguracoesVendas`), expondo `regras`, `updateRegras`, e os limites calculados (`totalSemSenha`, `totalComResponsavel`).
- `useConfiguracoesVendas` passa a ser apenas para senhas/responsáveis.
- `useConfiguracoesVendasPublicas` lê os limites da nova tabela.
- `RegrasVendasDirecao.tsx`: cada seção (Acréscimo, Boleto, Cartão, À vista, Campos obrigatórios) vira editável e persiste em `regras_vendas`.
- Atualizar consumidores dos limites: `DescontoVendaModal`, `FaturamentoVendaMinimalista`, `FaturamentoVendasMinimalista`, `VendaPendenteDetalhesSheet`, `EstrategiaItens`, `descontoVendasRules`, `useVendas`.

## Fora do escopo

- Remover de fato as colunas de limites de `configuracoes_vendas` (faremos numa migração posterior, após confirmar que tudo lê da nova tabela).
- Aplicar as regras editáveis novas (ex.: parcelas máx, intervalos de boleto dinâmicos) nos formulários de venda — esta etapa cobre apenas armazenamento + edição na página de regras; integração nos formulários pode vir em seguida.
