## Objetivo

Em `/direcao/vendas/parceiros`, cada linha (nas três abas: Autorizados, Representantes, Franqueados) passa a ter um botão "Editar" que abre uma página de edição específica daquele parceiro.

## O que já existe

- **Autorizados** e **Franqueados** já têm página de edição completa: `EditarAutorizadoDirecao` em `/direcao/autorizados/:id/editar` (nome, contatos, endereço, logo, contrato, vendedor responsável, preços, etapa, cidades secundárias, chave PIX etc.).
- **Representantes** hoje só permite editar comissão via popover na própria listagem. Não existe página de edição.

## Mudanças

### 1. `src/pages/direcao/ParceirosDirecao.tsx`
- Adicionar ícone/botão "Editar" (lápis) em cada `Row` das três listagens, ao lado do toggle de ativo.
- Autorizados → navega para `/direcao/autorizados/{id}/editar` (rota existente).
- Franqueados → navega para `/direcao/autorizados/{id}/editar` (mesma página, já suporta ambos os tipos).
- Representantes → navega para `/direcao/representantes/{id}/editar` (nova rota).

### 2. Nova página `src/pages/direcao/EditarRepresentanteDirecao.tsx`
Formulário minimalista glassmorphism (mesmo padrão visual do resto do módulo Direção) para editar um representante, com os campos disponíveis na tabela `representantes`:
- Nome
- E-mail
- Telefone
- Foto de perfil (upload via `LogoUpload` reutilizado)
- Comissão (%)
- Ativo (switch)
- Reprovado (switch, somente leitura de status ou editável — manter como leitura para não confundir com fluxo de aprovação)

Header com botão voltar + `AnimatedBreadcrumb` (Home › Direção › Vendas › Parceiros › Editar representante). Salvar faz `update` em `representantes` pelo id e invalida a query `['parceiros-representantes']`.

### 3. `src/App.tsx`
- Registrar a rota `/direcao/representantes/:id/editar` protegida por `routeKey="direcao_vendas"` apontando para `EditarRepresentanteDirecao`.

## Fora de escopo

- Não altera RLS, hooks, nem a página de aprovação de representantes.
- Não mexe no fluxo de comissão via popover (continua funcionando na listagem).
- Não cria página nova para autorizados/franqueados — reutiliza a existente.
