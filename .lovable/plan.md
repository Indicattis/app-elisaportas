## Objetivo

Em `/logistica/instalacoes` (página `Instalações Finalizadas`):
1. Adicionar coluna **Tipo de Serviço** (Instalação / Entrega / Manutenção / Correção / Serviço) vinda de `vendas.tipo_entrega`.
2. Tornar as células **Equipe Instalação**, **Autorizado Correção** e **Carregamento** clicáveis, abrindo um menu para definir/alterar o responsável. A escrita atualiza a tabela de origem; o snapshot `instalacoes_finalizadas` reflete via trigger.

---

## Mudanças

### 1. Coluna "Tipo de Serviço"

- Em `src/hooks/useInstalacoesFinalizadas.ts`, mudar o `select` para `*, vendas:venda_id(tipo_entrega)` e expor `tipo_entrega` na interface `InstalacaoFinalizada`.
- Em `OrdensInstalacoesLogistica.tsx`, inserir nova coluna **Tipo** logo após "Cidade / UF", renderizando um chip com cor por valor:
  - `instalacao` → azul ("Instalação")
  - `entrega` → âmbar ("Entrega")
  - `manutencao` → roxo ("Manutenção")
  - `correcao` → vermelho ("Correção")
  - `servico` → cinza ("Serviço")
  - `null` → traço

### 2. Células clicáveis

Para evitar disparar o `onClick` da linha (que abre o `PedidoDetalhesSheet`), as 3 células ganham `onClick={(e) => e.stopPropagation()}` e envolvem o conteúdo num `DropdownMenu`.

**Equipe Instalação**
- Reaproveitar `SelecionarResponsavelMenu` filtrando só `tipo='equipe_interna'` (adicionar prop `filtro?: 'equipes' | 'autorizados' | 'todos'`).
- Atualiza `instalacoes.responsavel_instalacao_id/nome` + `tipo_instalacao='elisa'`, indexado por `pedido_id` (buscar `instalacoes.id` a partir do `pedido_id` do registro).
- Trigger existente `sync_instalacao_finalizada_responsavel` já reflete em `instalacoes_finalizadas.equipe_instalacao_*`.

**Autorizado Correção**
- Mesmo componente, filtrando `tipo='autorizado'`.
- Atualiza `correcoes.responsavel_correcao_id/nome` (linha da correção do pedido). Se não existir linha de correção, mostrar como desabilitado ("Sem correção registrada").
- Trigger `sync_correcao_finalizada_responsavel` reflete no snapshot.

**Carregamento**
- Novo componente `SelecionarResponsavelCarregamentoMenu` lista usuários internos (mesma fonte de equipes internas via `useResponsaveisInstalacao` ou colaboradores logística).
- Atualiza `ordens_carregamento.responsavel_carregamento_id/nome` da ordem vinculada ao pedido.
- Será criada uma nova trigger `sync_carregamento_finalizada_responsavel` em `ordens_carregamento` (AFTER UPDATE de `responsavel_carregamento_*`) que atualiza `instalacoes_finalizadas.responsavel_carregamento_*` para o `pedido_id` correspondente.

### 3. Migração SQL

- Criar função `sync_carregamento_finalizada_responsavel()` + trigger em `ordens_carregamento`.
- (Sem alterações de schema; apenas trigger.)

### 4. UX

- Após selecionar responsável: toast de sucesso (já existente) + `refetch()` da query `instalacoes-finalizadas`.
- Cursor `pointer` nas células editáveis, com hover destacando.
- Click na linha continua abrindo o detalhe; só as 3 células interceptam.

---

## Arquivos afetados

- `src/hooks/useInstalacoesFinalizadas.ts` (join + tipo)
- `src/pages/logistica/OrdensInstalacoesLogistica.tsx` (coluna + dropdowns)
- `src/components/instalacoes/SelecionarResponsavelMenu.tsx` (prop `filtro`)
- `src/components/instalacoes/SelecionarResponsavelCarregamentoMenu.tsx` (novo)
- Migração: trigger de sincronização do carregamento.
