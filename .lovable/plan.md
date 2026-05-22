# Etapas de multas com responsável em /administrativo/multas

## Objetivo
Substituir a tela atual de multas por uma navegação por **abas de status** no mesmo padrão visual do hub `/direcao/gestao-fabrica` (tabs largos com avatar do responsável, contador colorido e estado ativo destacado). As etapas são, em ordem:

```text
Aberta → Advertida → Paga → Concluída
```

Cada aba possui um **responsável** persistido no banco. **Apenas esse responsável pode avançar** uma multa para a próxima etapa.

## Comportamento

- A barra de abas mostra as 4 etapas. Cada trigger renderiza:
  - Avatar do responsável da etapa (ou ícone neutro quando não atribuído).
  - Label da etapa.
  - Pill com a contagem de multas naquela etapa.
  - Mesmo estilo glassmorphism + ring azul em ativo já usado em `GestaoFabricaDirecao` (linhas 918-973).
- Clicar no avatar/ícone abre um modal para **atribuir/remover** o responsável da etapa (lista de `admin_users`).
- O conteúdo da aba ativa lista as multas com aquele status, reutilizando os atuais `MultaCard` (com badges de vencimento como decoração).
- Cada card mostra um botão **"Avançar"** somente quando:
  - A etapa atual não é a última (`Concluída`); **e**
  - `auth.uid()` é igual ao `responsavel_id` da etapa atual.
  - Caso contrário, o botão aparece desabilitado com tooltip "Somente {nome do responsável} pode avançar".
- Ações já existentes (cadastrar nova multa, excluir) permanecem.
- Botões de "Marcar como paga" e o cálculo automático de status por data são removidos — o avanço passa a ser explícito via fluxo de etapas.

## Modelo de dados

1. **`multas.status`**: passa a aceitar `aberta | advertida | paga | concluida`. Default vira `aberta`.
   - Migração de dados: registros com `status = 'pendente'` → `'aberta'`.
2. **Nova tabela** `public.multas_etapa_responsaveis`:
   - `id uuid pk default gen_random_uuid()`
   - `status text not null unique` (com check `in ('aberta','advertida','paga','concluida')`)
   - `responsavel_id uuid not null` (sem FK para `auth.users`, padrão do projeto)
   - `created_at`, `updated_at` (trigger `update_updated_at_column`)
   - RLS habilitada com `USING (auth.uid() IS NOT NULL)` em SELECT/INSERT/UPDATE/DELETE, no mesmo padrão de `etapa_responsaveis`.

Nenhuma RLS extra em `multas` para travar avanço — a restrição de "somente o responsável avança" é validada na UI (igual ao que já acontece em outras telas com `etapa_responsaveis`). Posso adicionar policy de UPDATE condicional se você preferir; me avise.

## Implementação técnica

Arquivos novos:
- `src/hooks/useMultasEtapaResponsaveis.ts` — análogo a `useEtapaResponsaveis`, porém com `status: 'aberta' | 'advertida' | 'paga' | 'concluida'` como chave.
- `src/components/multas/SelecionarResponsavelMultaModal.tsx` — modal de busca em `admin_users` com confirmar/remover (versão enxuta do `SelecionarResponsavelEtapaModal`, sem dependência de `EtapaPedido`).

Arquivos editados:
- `src/hooks/useMultas.ts`:
  - Tipar `status` como `'aberta' | 'advertida' | 'paga' | 'concluida'`.
  - Manter `updateStatus` genérico, usado para avançar.
- `src/pages/administrativo/MultasMinimalista.tsx` (refatorado):
  - Usar `Tabs` com `value={statusAtivo}` e a `TabsList` no mesmo template visual das abas de `GestaoFabricaDirecao` (mesmas classes do grupo `flex gap-1 border-2 border-...` e do `TabsTrigger` com avatar + label + pill).
  - Mapa de cores por etapa: Aberta = azul, Advertida = âmbar, Paga = verde, Concluída = emerald/cinza.
  - Filtrar multas por `m.status === statusAtivo` (sem o cálculo por data atual).
  - `MultaCard` recebe `podeAvancar` e `proximaEtapaLabel` e renderiza botão "Avançar" (chevron) que chama `updateStatus.mutate({ id, status: proximaEtapa })`.
  - Resumo no topo é simplificado para "Total pendente" (soma de `aberta+advertida`), "Total" e "Concluídas".

## Fora de escopo
- Histórico de transições (quem avançou cada multa e quando).
- Notificação ao responsável quando uma multa cai na sua aba.
- Permitir retroceder etapa.
