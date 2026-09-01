# Ficha de Colaboradores (RH/DP)

Novo botão "Ficha de Colaboradores" em /administrativo/rh-dp, levando a uma página onde o RH preenche/edita uma ficha pessoal de cada colaborador.

## O que será construído

1. **Botão no hub RH/DP** — quinto item do menu (`/administrativo/rh-dp/fichas`), no mesmo estilo dos existentes.

2. **Página "Ficha de Colaboradores"** (estilo glassmorphism das demais páginas):
   - Lista de todos os colaboradores ativos (`admin_users`, tipo colaborador/metamorfo), com busca por nome e badge indicando "Ficha preenchida" ou "Pendente".
   - Ao clicar num colaborador, abre um painel/dialog com a ficha para preencher e salvar.

3. **Campos da ficha**
   - Preferências: comida favorita, bebida favorita, preferência de bebida (café / chá / outra + campo livre quando "outra"), doce favorito, prefere doce ou salgado, cor favorita.
   - Dados pessoais: data de nascimento, sexo, estado civil, nacionalidade.
   - Data de nascimento é gravada em `admin_users.data_nascimento` (campo já existente) para não duplicar o dado; os demais ficam na nova tabela da ficha.

4. **Exportação** — botão para baixar PDF da lista de fichas preenchidas, seguindo o padrão dos outros relatórios do sistema (opcional, incluído por consistência).

## Detalhes técnicos

- Migração: tabela `public.colaborador_fichas` com `admin_user_id` (único, FK para `admin_users`), `comida_favorita`, `bebida_favorita`, `preferencia_bebida` (café/chá/outra), `preferencia_bebida_outra`, `doce_favorito`, `doce_ou_salgado`, `cor_favorita`, `sexo`, `estado_civil`, `nacionalidade`, `created_at`, `updated_at` (com trigger de atualização). GRANTs para `authenticated`/`service_role`, RLS habilitada com leitura/escrita para usuários autenticados (mesmo padrão das tabelas de RH existentes).
- Hook `src/hooks/useColaboradorFichas.ts` (React Query): lista fichas + upsert por `admin_user_id`.
- Página `src/pages/administrativo/rh-dp/FichasColaboradores.tsx` + rota em `App.tsx` protegida por `routeKey="administrativo_hub"`.
- Registro da rota em `app_routes` (interface `padrao`) para aparecer na gestão de permissões.
- Datas seguem o padrão do projeto (`T12:00:00`) para evitar deslocamento de fuso.
