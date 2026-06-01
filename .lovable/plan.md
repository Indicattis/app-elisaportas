### Objetivo
Atualizar os rótulos de justificativa do desconto exibidos no tooltip da coluna "Desconto" na página `/direcao/vendas/todas`.

### Alteração
Em `src/pages/direcao/VendasDirecao.tsx` (linhas 452-454 do tooltip de desconto):

- `responsavel_setor` → **"Senha do Gerente"**
- `master` → **"Senha Master (Diretor)"**

### Escopo restrito
Somente a página `/direcao/vendas/todas` (VendasDirecao.tsx). Outras páginas como detalhes de venda ou faturamento permanecem inalteradas, a menos que o usuário solicite consistência em seguida.