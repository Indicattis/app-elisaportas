# Completar acessórios na conclusão da visita técnica

## Alteração
- Trocar a origem da lista “Acessórios inclusos” para o catálogo oficial de acessórios usado nas vendas.
- Exibir todos os itens cadastrados, incluindo Alçapão, Central, Controle Avulso e Nobreak, além dos já visíveis.
- Manter a seleção por porta, quantidade, gravação da visita concluída e exibição no PDF funcionando como hoje.
- Preservar acessórios já salvos em visitas anteriores, mesmo que tenham vindo da lista antiga.

## Detalhes técnicos
- Ajustar a consulta e o mapeamento em `VisitaTecnicaConclusao.tsx`, convertendo `acessorios.id/nome` para o formato usado pelo formulário.
- Não será necessária alteração no banco: o catálogo `acessorios` já contém os itens ausentes e a visita salva a seleção como JSON.

## Verificação
- Conferir que a lista mostra os 9 acessórios atuais em ordem alfabética.
- Selecionar itens, alterar quantidades, concluir uma visita e confirmar a persistência.
- Gerar o PDF e confirmar que os acessórios selecionados aparecem corretamente.
