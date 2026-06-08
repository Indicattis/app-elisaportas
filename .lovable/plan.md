## 1. Coluna "Hora Extra" na Folha Salarial

### Banco

Adicionar coluna `hora_extra numeric NOT NULL DEFAULT 0` em:
- `public.despesas_padrao`
- `public.despesas_mes_folha_override`

### Cálculo

Atualizar `calcTotalFolha` em `src/pages/direcao/estrategia/EstrategiaDespesasConfiguracoes.tsx` para usar **base = salário + hora extra** nos encargos:

- `FGTS = base × FGTS%`
- `Previsão 13° = base ÷ 12`
- `FGTS 13° = FGTS ÷ 12`
- `Férias + 1/3 = base ÷ 3 ÷ 12`
- `Multa FGTS = FGTS × 40%`
- `Insalubridade` continua sobre o salário mínimo (sem mudança)
- `Total = base + aux_combustivel + insalub + FGTS + prev13 + fgts13 + férias + multa`

Aplicar a mesma fórmula em `FolhaRowCells`, `FolhaSetorGroup` (subtotal), `FolhaBlock` (total da folha) e no preview do dialog "Novo colaborador".

### UI

Em `EstrategiaDespesasConfiguracoes.tsx`:

- Nova coluna **Hora Extra** entre "Combustível" e "Insalub %" no `FolhaTableHeader`, `FolhaColGroup` e `FolhaRowCells` (editável via `InlineNum format="currency"`).
- Campo "Hora extra" no diálogo "Novo colaborador" (grid junto de Aux. combustível).
- Estado `horaExtra` no `FolhaBlock` e reset incluindo o campo.

### Hook / tipos

- `src/hooks/useDespesasPadrao.ts`: incluir `hora_extra` no tipo `DespesaPadrao` e no payload de `insert`/`update`.
- `src/hooks/useDespesasPadraoMes.ts`: incluir `hora_extra` no override mensal e no merge com o padrão.

### PDF

`src/utils/folhaSalarialPDFGenerator.ts`: adicionar coluna Hora Extra e usar a mesma base nas demais colunas calculadas.

## 2. Banco no gasto automático de acordos pagos (ajuste do fluxo anterior)

Hoje o gasto criado ao marcar um acordo como pago usa o primeiro banco cadastrado. Substituir por um **diálogo de confirmação** que pede o banco antes de criar o gasto.

- Novo componente `ConfirmarPagamentoAcordoDialog` com `Select` de bancos (lista `bancos` ordenada por nome).
- Em `AcordosMesAutorizados.tsx` e `AutorizadosPrecosDirecao.tsx`: ao clicar em "Marcar como pago", abrir o diálogo; só depois da escolha do banco rodar `update` em `acordos_instalacao_autorizados` + `criarGastoAcordoAutorizado` passando `bancoId`. Desmarcar continua sem diálogo (apenas remove o gasto).
- `src/lib/gastoAcordoAutorizado.ts`: receber `bancoId` por parâmetro (obrigatório); remover a busca automática do banco padrão.

## Detalhes técnicos

- Total mostrado em "Total estimado" do dialog usa `calcTotalFolha` já atualizado.
- Linha desativada (`em_folha === false`) continua exibindo `R$ 0` para hora extra e demais encargos; total = salário (mantém comportamento atual).
- Override mensal segue o padrão dos demais campos: se `hora_extra` estiver em override usa-o, senão herda do padrão.
