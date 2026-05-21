## Botão "Definir % padrões"

Adicionar botão ao lado do input de busca em `/direcao/estrategia/itens` para configurar as taxas padrão (imposto, desconto de gerente, cartão) e aplicá-las em massa a todos os itens.

### UI

- No card da barra de busca (`EstrategiaItens.tsx`, linha ~351), trocar o conteúdo para um `flex` com o `Input` de busca + um `Button` "Definir % padrões" (ícone `Percent`) ao lado.
- Botão abre um `Dialog` com 3 campos numéricos:
  - Imposto (%) — cor laranja
  - Desconto Gerente (%) — cor amarela
  - Cartão (%) — cor teal
- Os campos vêm pré-preenchidos com os valores salvos atualmente (ver persistência abaixo).
- Rodapé do dialog: "Cancelar" e "Aplicar a todos os itens" (com confirmação inline tipo "Isso vai sobrescrever as % de todos os X itens").

### Persistência das % padrões

Criar tabela `custos_itens_padroes` (singleton, 1 linha) com os campos `taxa_impostos`, `taxa_descontos`, `taxa_cartao` para guardar o último valor configurado, para reabrir o dialog já preenchido.

### Aplicação em massa

Ao clicar em "Aplicar a todos os itens":
1. `UPDATE custos_itens SET taxa_impostos = X, taxa_descontos = Y, taxa_cartao = Z` (sem `WHERE`, atualiza tudo).
2. `UPSERT` na tabela `custos_itens_padroes`.
3. Invalidar query `["custos_itens"]` e fechar o dialog. Toast: "% padrões aplicadas a todos os itens".

### Arquivos

- `supabase/migrations/...` — criar tabela `custos_itens_padroes` (singleton) com RLS (apenas usuários autenticados leem/escrevem, alinhado ao padrão de `custos_itens`).
- `src/hooks/useCustosItens.ts` — adicionar:
  - `useCustosItensPadroes()` query para ler a linha singleton.
  - mutation `aplicarPadroesEmTodos({ taxa_impostos, taxa_descontos, taxa_cartao })` que faz o UPDATE em massa + UPSERT do singleton.
- `src/pages/direcao/estrategia/EstrategiaItens.tsx` — adicionar o botão + dialog, estado local dos 3 inputs, integração com a mutation.

### Fora de escopo

- Não muda colunas existentes nem o fluxo de edição célula-a-célula.
- Não altera estilo da tabela nem cabeçalho da página.