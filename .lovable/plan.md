## Objetivo

Em `/vendas/visitas-tecnicas`, permitir definir se o responsável pela visita é um **colaborador** (equipe interna) ou um **autorizado**.

## Situação atual (verificada)

- A tabela `visitas_tecnicas_agendadas` tem apenas `responsavel_id` (uuid), sem coluna que indique a origem — hoje ele sempre aponta para um registro de `admin_users`.
- No formulário de agendamento, o campo "Responsável" é **somente leitura**: mostra sempre o usuário logado (há um combobox de responsáveis no arquivo, mas não está em uso no formulário).
- O nome do responsável é resolvido buscando na lista de `admin_users` ativos — em vários pontos: card da lista, modal de detalhes e histórico de visitas.

## Mudanças propostas

### 1. Banco de dados
- Nova coluna `responsavel_tipo` (texto) em `visitas_tecnicas_agendadas`, com valores `colaborador` ou `autorizado` e padrão `colaborador`.
- Registros existentes são preenchidos como `colaborador` (comportamento atual preservado).

### 2. Formulário de agendamento (criar/editar)
- Novo seletor **"Tipo de responsável"** com duas opções: Colaborador / Autorizado.
- Quando **Colaborador**: mantém o comportamento atual (campo travado no usuário logado).
- Quando **Autorizado**: exibe um combobox com busca listando os autorizados ativos (nome + cidade/UF) para escolha.
- Trocar o tipo limpa a seleção anterior para evitar id de origem errada.

### 3. Exibição
- Modal de detalhes da visita: mostra o nome correto conforme o tipo, com uma etiqueta discreta "Colaborador" ou "Autorizado".
- Cards/lista de visitas: o nome do responsável passa a ser resolvido também na lista de autorizados, para não aparecer vazio.
- O histórico de visitas continua registrando o nome do responsável (agora resolvido pela origem certa).

## Detalhes técnicos

- Migração: `ALTER TABLE public.visitas_tecnicas_agendadas ADD COLUMN responsavel_tipo text NOT NULL DEFAULT 'colaborador'` + CHECK nos dois valores.
- `src/pages/vendas/VisitasTecnicasCalendario.tsx`: adicionar `responsavel_tipo` à interface `VisitaAgendada` e ao `emptyForm`; nova query para `autorizados` (id, nome, cidade, estado, `ativo = true`); mapa unificado de nomes (`admin_users` + `autorizados`) usado por lista, detalhes e log de histórico; incluir o campo nos `insert`/`update` e em `openEdit`.
- Reutilizar o `ResponsavelCombobox` já existente no arquivo para a seleção de autorizados.
- Sem alterações no fluxo de conclusão da visita (`VisitaTecnicaConclusao.tsx`).
