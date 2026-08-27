# Processos Justiça

Novo botão em /direcao (abaixo de "Organograma RH") levando a uma página de cadastro e acompanhamento dos processos jurídicos da empresa.

## Cadastro de processo
- Modelo: Trabalhista ou Judicial
- Nome: texto
- Acordo Sugerido: valor em R$ (opcional) e/ou observação em texto
- Acordo Proposto: valor em R$ ou marcação "Sem acordo"
- Valor Final: valor em R$ (preenchido quando encerrado)
- Status: Em andamento / Encerrado
- Atualizações: comentários que o usuário vai adicionando ao longo do tempo (com autor e data), exibidos em linha do tempo

## Tela
- Rota `/direcao/processos-justica`, no mesmo estilo minimalista/glass das demais páginas de direção.
- Lista em formato planilha: Modelo, Nome, Acordo Sugerido, Acordo Proposto, Valor Final, Status, nº de atualizações.
- Botão "Novo Processo" abre dialog com os campos acima.
- Clique na linha abre painel lateral com detalhes + histórico de atualizações e campo para adicionar novo comentário.
- Totais no rodapé (soma de acordo proposto e valor final).

## Detalhes técnicos
- Migração: tabela `processos_justica` (modelo enum-texto, nome, acordo_sugerido_valor, acordo_sugerido_texto, acordo_proposto_valor, sem_acordo bool, valor_final, status, created_by, timestamps) e `processos_justica_atualizacoes` (processo_id, comentario, autor_id, created_at). GRANTs para authenticated/service_role, RLS restrita a usuários autenticados, trigger de updated_at.
- Novo item em `menuItems` de `DirecaoHub.tsx` com `routePrefix: 'direcao_processos_justica'` e registro da rota protegida em `App.tsx` + `app_routes` para o controle de permissões.
- Hook `useProcessosJustica` (React Query) com CRUD e mutação de atualizações.
