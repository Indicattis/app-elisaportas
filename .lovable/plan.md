Vou corrigir isso em dois pontos:

1. **Banco / permissões**
   - A tabela `requisicoes_venda` tem 1 registro, mas os `GRANTs` ainda não aparecem aplicados no banco.
   - Vou criar/aplicar uma migração garantindo acesso Data API para `requisicoes_venda`, `representantes` e `orcamentos_app`, porque a tela usa joins com essas tabelas.

2. **RLS da página da Direção**
   - A policy atual de `requisicoes_venda` só libera o representante dono ou admin/administrador.
   - Vou ajustar para também liberar quem tem acesso à rota `direcao_vendas`, mantendo representantes vendo apenas as próprias requisições.
   - Também vou liberar leitura relacionada em `representantes` e `orcamentos_app` para quem tem `direcao_vendas`, para os dados vinculados aparecerem na tabela.

3. **Tratamento no frontend**
   - A tela hoje engole erro silenciosamente e mostra “Nenhuma requisição encontrada”.
   - Vou exibir/logar erro real quando a query falhar, para não mascarar problema de permissão novamente.