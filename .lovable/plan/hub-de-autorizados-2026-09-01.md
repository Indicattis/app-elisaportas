# Hub de Autorizados

Transformar `/autorizados` em um hub com dois caminhos, sem alterar o comportamento de `/direcao/autorizados`.

## Como fica

`/autorizados` passa a exibir apenas dois cards (estilo glassmorphism igual aos demais hubs):

```text
+---------------------------+  +---------------------------+
|  Instalação Autorizados   |  |   Gestão Autorizados      |
|  Acordos por mês          |  |  Estados, cidades e       |
|                           |  |  cadastro de autorizados  |
+---------------------------+  +---------------------------+
```

- Instalação Autorizados -> `/autorizados/instalacao`: nova página contendo somente a seção "Acordos com Autorizados" (navegação por ano, grid de meses, contagem/valores e pendentes), agora sempre expandida em vez de recolhível.
- Gestão Autorizados -> `/autorizados/gestao`: exatamente o conteúdo atual de `/autorizados` (indicadores, estados por região com drag-and-drop, histórico de cadastros, botões do header) menos a seção de acordos.

O detalhe do mês continua em `/autorizados/acordos/:ano/:mes`, com o "voltar" apontando para a página de Instalação.

## Detalhes técnicos

- `src/pages/AutorizadosHome.tsx`: vira o hub (dois cards + `MinimalistLayout`, breadcrumb Home > Autorizados).
- Nova `src/pages/autorizados/AutorizadosGestaoHome.tsx`: renderiza `AutorizadosPrecosDirecao` com `contexto="home"` e uma nova prop `mostrarAcordos={false}`.
- Nova `src/pages/autorizados/InstalacaoAutorizados.tsx`: usa `useAcordosAutorizados`, reaproveita o grid de meses (ano selecionável) e navega para `/autorizados/acordos/:ano/:mes`.
- `src/pages/direcao/AutorizadosPrecosDirecao.tsx`: ganha as props opcionais `mostrarAcordos` (default `true`) para ocultar a seção de acordos quando usado na página de Gestão; nenhuma outra mudança de lógica.
- `src/App.tsx`: adicionar rotas `/autorizados/gestao` e `/autorizados/instalacao` protegidas com o mesmo `routeKey="logistica_autorizados"` já usado pelas rotas de `/autorizados`; manter as demais rotas filhas inalteradas (`/autorizados/novo`, `/autorizados/estado/:estadoId`, `/autorizados/:id/editar`, `/autorizados/acordos/:ano/:mes`).
- Breadcrumbs e `backPath` das páginas filhas ajustados para retornarem ao hub ou à página correta.
