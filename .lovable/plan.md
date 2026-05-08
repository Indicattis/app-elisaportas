## Problema

Em `/producao/instalacoes`, os cards roxos (`NeoInstalacao` e `NeoCorrecao`) possuem um botão "Detalhes" que deveria abrir o drawer (`NeoInstalacaoDetails` / `NeoCorrecaoDetails`), mas nada acontece ao clicar.

## Causa

Os calendários (`CalendarioSemanalExpedicaoDesktop`, `CalendarioMensalExpedicaoDesktop`, `CalendarioSemanalExpedicaoMobile`) já aceitam e propagam as props `onOpenNeoInstalacaoDetails` e `onOpenNeoCorrecaoDetails`, mas a página `src/pages/producao/ProducaoInstalacoes.tsx` **não passa esses handlers** nem renderiza os drawers de detalhe — só trata `onOrdemClick` (cards de carregamento) com `OrdemCarregamentoDetails`.

Resultado: clicar em qualquer ação dos cards roxos cai em handler `undefined`.

## Plano

Editar apenas `src/pages/producao/ProducaoInstalacoes.tsx`:

1. Adicionar dois estados:
   - `selectedNeoInstalacao` + `neoInstalacaoOpen`
   - `selectedNeoCorrecao` + `neoCorrecaoOpen`
2. Criar handlers `handleOpenNeoInstalacaoDetails` e `handleOpenNeoCorrecaoDetails` que setam o item e abrem o respectivo drawer.
3. Repassar esses handlers como props (`onOpenNeoInstalacaoDetails` e `onOpenNeoCorrecaoDetails`) nos três calendários (Mobile, Semanal Desktop, Mensal Desktop).
4. Renderizar abaixo do `OrdemCarregamentoDetails` os componentes `NeoInstalacaoDetails` e `NeoCorrecaoDetails` controlados pelos novos estados.

Sem mudanças em hooks, regras de negócio ou nos próprios cards/calendários — eles já estão preparados.
