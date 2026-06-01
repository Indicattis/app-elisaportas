## Problema

O modal de autorização de desconto em `/vendas/minhas-vendas/nova` mostra **Daiane Lucrécio (desativada)** como autorizadora para descontos entre 8% e 15%. Isso acontece porque a tela usa `useLiderVendas()` (líder do setor "vendas" em `setores_lideres`), que aponta para a Daiane — independente de quem está configurado como Gerente em `/direcao/regras-vendas`.

## Comportamento desejado

- **8%–15% (responsavel_setor)** → mostrar o **Gerente** configurado em Regras de Vendas (`configuracoes_vendas.responsavel_senha_responsavel_id`).
- **Acima de 15% (master)** → mostrar o **Diretor** configurado em Regras de Vendas (`configuracoes_vendas.responsavel_senha_master_id`). *(já é assim hoje.)*
- Se o autorizador configurado estiver ausente OU desativado → mostrar alerta destrutivo com link para `/direcao/regras-vendas`, esconder o input de senha e desabilitar "Autorizar". O botão "Solicitar Aprovação" continua disponível quando aplicável.

## Arquivos alterados

### `src/components/vendas/AutorizacaoDescontoModal.tsx`
- Remover dependência de `useLiderVendas`.
- Para `tipoAutorizacao === 'responsavel_setor'`: buscar `admin_users` por `responsavel_senha_responsavel_id` (incluir `ativo`).
- Para `tipoAutorizacao === 'master'`: já busca por `responsavel_senha_master_id`; adicionar `ativo` no select.
- Se `!autorizadorConfigurado` OU `autorizadorConfigurado.ativo === false`:
  - Substituir o card "Quem está autorizando?" por `<Alert variant="destructive">` explicando o problema (não configurado / desativado) com `<Link to="/direcao/regras-vendas">Configurar agora</Link>` (usar `react-router-dom`).
  - Não renderizar o input de senha.
  - Desabilitar "Autorizar".
- Atualizar labels:
  - `responsavel_setor` → título "Autorização do Gerente Necessária", senha "Senha do Gerente *".
  - `master` → título "Autorização do Diretor Necessária", senha "Senha do Diretor *".
- Atualizar a validação local em `handleAutorizar` que hoje compara com `liderVendas.user_id` — passar a comparar com o `autorizadorConfigurado.id` (gerente ou diretor) e usar mensagens "Gerente"/"Diretor".

### Sem mudanças no backend
- Tabela `configuracoes_vendas` já tem as duas colunas. O RPC `verificar_senha_vendas` recebe `'responsavel' | 'master'` — mantemos esses tipos (apenas a UI muda o rótulo para Gerente/Diretor).
- Não mexer em `useLiderVendas` (continua usado em outros lugares, ex. ranking).

## Verificação

1. Abrir venda nova, aplicar desconto 10% → modal abre com "Autorização do Gerente" e mostra o usuário configurado em `responsavel_senha_responsavel_id`. Se desativado, mostra alerta com link.
2. Aplicar desconto 20% → modal abre com "Autorização do Diretor" mostrando `responsavel_senha_master_id`.
3. Limpar a configuração em Regras de Vendas → modal mostra alerta e botão Autorizar fica desabilitado.
