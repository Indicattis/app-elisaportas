## Objetivo

Substituir a navegação para `/direcao/autorizados/:id/editar` por um modal de edição inline dentro da aba Autorizados em `/direcao/vendas/parceiros`. Isso elimina o problema de "voltar" cair na rota do estado do autorizado.

## Escopo

- Apenas a aba **Autorizados** de `/direcao/vendas/parceiros`.
- Representantes e Franqueados permanecem inalterados.
- A página `EditarAutorizadoDirecao` continua existindo para os outros contextos (`/direcao/autorizados/...`, `/logistica/...`, `/autorizados/...`, `/vendas/meus-parceiros`).

## Como vai funcionar

1. Clicar no ícone de editar do autorizado abre um `Dialog` sobreposto — a URL continua `/direcao/vendas/parceiros`.
2. O modal carrega os dados do autorizado e permite editar os mesmos campos essenciais já disponíveis na página completa.
3. Salvar atualiza o registro, fecha o modal e revalida a lista (`parceiros-autorizados`).
4. Cancelar/fechar apenas descarta as alterações.

## Campos do modal

Manter paridade com o formulário atual, agrupados em seções compactas:

- **Identificação**: nome, responsável, email, telefone, whatsapp, logo.
- **Localização**: CEP, estado, cidade, endereço, bairro, número, complemento.
- **Equipe**: atendente (select com todos os usuários ativos via `get_active_users_basic`) e vendedor responsável.
- **Status**: ativo/inativo.

Campos avançados (cidades secundárias, geocodificação, negociação, preços, contratos) ficam fora do modal — para esses, adicionar um link "Abrir edição completa" que leva à página existente (mantendo `state.from` para voltar corretamente).

## Arquivos afetados

- **Novo**: `src/components/parceiros/EditarAutorizadoModal.tsx` — dialog com o formulário, mutations e validação.
- **Editado**: `src/pages/direcao/ParceirosDirecao.tsx`
  - `AutorizadosList` passa a controlar estado `editandoId` e renderizar o modal.
  - Botão "Editar" abre o modal em vez de navegar.
  - Após salvar, `invalidateQueries(['parceiros-autorizados', tipo])`.

## Fora do escopo

- Não mexer no fluxo de edição das outras rotas.
- Não remover a página `EditarAutorizadoDirecao`.
- Não alterar breadcrumb/back nos demais lugares.
