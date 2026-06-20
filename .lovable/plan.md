## Botões de macrorregião do Brasil

Adicionar uma barra de botões acima do mapa do Brasil no `RegiaoFormDialog.tsx` com as 5 macrorregiões: **Norte, Nordeste, Centro-Oeste, Sudeste, Sul**.

### Comportamento

- Clicar em um botão (ex: Sudeste) seleciona **todas as cidades cadastradas em `frete_cidades`** dos estados daquela região (SP, RJ, MG, ES), respeitando:
  - Cidades já em outra região da mesma transportadora são ignoradas (continuam bloqueadas).
  - Clicar novamente no mesmo botão **desmarca** apenas as cidades daquela região (toggle).
- Estado visual: botão fica "ativo" (preenchido) quando todas as cidades disponíveis da região já estão selecionadas; "parcial" (outline destacado) quando algumas estão; "inativo" caso contrário.
- Tooltip no botão mostrando "X cidades disponíveis nos estados Y".

### Fonte de dados

- **API IBGE** `https://servicodados.ibge.gov.br/api/v1/localidades/regioes` — chamada uma vez ao montar o dialog, cacheada em memória (sessão).
- Resposta mapeia `sigla` (N/NE/CO/SE/S) → lista de UFs. Fallback estático embutido caso a API falhe (as 5 regiões são imutáveis).
- Para listar cidades por região, usamos as UFs retornadas + hook existente `useFreteCidadesPorEstado` (ou query agregada em `frete_cidades` filtrando por `estado IN (...)`).

### Arquivos

- **Novo:** `src/hooks/useMacroRegioesBrasil.ts` — busca/cacheia regiões do IBGE, expõe `{ regioes: { sigla, nome, ufs: string[] }[], isLoading }`.
- **Editado:** `src/components/logistica/RegiaoFormDialog.tsx`
  - Novo componente interno `MacroRegiaoButtons` renderizado acima do `MapaEstadosBrasil` (apenas no modo "Brasil", não no modo drill-down de estado).
  - Lógica de toggle que adiciona/remove `cidade_id` em lote no estado `selectedCidades`, filtrando cidades já bloqueadas em outras regiões da transportadora.

### Fora de escopo

- Não altera o mapa municipal (drill-down) — botões só aparecem na visão Brasil.
- Não cria botões para mesorregiões dentro de um estado.
- Não muda schema do banco.
