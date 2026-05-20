# Plano: Hub Estratégia em /direcao

## 1. Novo botão "Estratégia" no Hub
Em `src/pages/direcao/DirecaoHub.tsx`, adicionar item no início do `menuItems` (acima de "Caixa Elisa"):
- label: "Estratégia", icon: `Lightbulb` (ou `Sparkles`), path: `/direcao/estrategia`, routePrefix: `direcao_estrategia`.

## 2. Nova página Hub `/direcao/estrategia`
Arquivo: `src/pages/direcao/estrategia/EstrategiaHub.tsx`.
Mesmo padrão visual do `DirecaoHub` / `MetasHubDirecao` (fundo preto, breadcrumb, FloatingProfileMenu, botões gradiente azul), com título "Estratégia" e 5 botões:
1. Itens → `/direcao/estrategia/itens`
2. Tabela de Kits → `/direcao/estrategia/kits`
3. Tabela de Preços → `/direcao/estrategia/precos`
4. Despesas → `/direcao/estrategia/despesas`
5. Resultados → `/direcao/estrategia/resultados`

## 3. Sub-páginas

### 3.1 Itens (`EstrategiaItens.tsx`)
Reaproveitar o conteúdo de `src/pages/direcao/estoque/ProdutosFabrica.tsx`, removendo da listagem:
- Coluna **SKU**
- Botão/seção **Matéria Prima**
- Coluna/contagem de **Pedidos**
- Botão **Conferir**
- Clique na linha que navega para edição (apenas exibição)

Implementação: criar componente novo que renderiza a mesma tabela mas com props/flags para esconder essas colunas/ações, ou duplicar enxuto. Preferir refatorar `ProdutosFabrica` aceitando props `hideSku`, `hideMateriaPrima`, `hidePedidos`, `hideConferir`, `readOnly`.

### 3.2 Tabela de Kits (`EstrategiaKits.tsx`)
Renderiza exatamente o conteúdo de `src/pages/TabelaPrecos.tsx` (sem alterações).

### 3.3 Tabela de Preços (`EstrategiaPrecos.tsx`)
Renderiza `TabelaPrecos` ocultando colunas **Lucro** e **Ações**. Refatorar `TabelaPrecos` aceitando props `hideLucro` e `hideAcoes`, ou extrair a tabela em subcomponente reutilizável.

### 3.4 Despesas (`EstrategiaDespesas.tsx`)
- Grid de 3 colunas com os 12 meses do ano atual (cards clicáveis estilo glassmorphism).
- Ao clicar, expandir abaixo exibindo apenas as seções **Despesas Fixas**, **Despesas Variáveis** e **Folha Salarial** de `DREMesDirecao` para o mês selecionado.
- Extrair essas seções de `DREMesDirecao.tsx` em componentes reutilizáveis (`DespesasFixasSection`, `DespesasVariaveisSection`, `FolhaSalarialSection`) que recebem `mes` (YYYY-MM) como prop.

### 3.5 Resultados (`EstrategiaResultados.tsx`)
- Listagem de meses como em `DREDirecao` (`src/pages/direcao/DREDirecao.tsx`).
- Ao clicar no mês, expandir abaixo apenas a **seção final de Resultados** de `DREMesDirecao`. Extrair em `ResultadosFinaisSection` recebendo `mes`.

## 4. Rotas (`src/App.tsx`)
Adicionar rotas protegidas com `routeKey="direcao_estrategia"`:
```
/direcao/estrategia
/direcao/estrategia/itens
/direcao/estrategia/kits
/direcao/estrategia/precos
/direcao/estrategia/despesas
/direcao/estrategia/resultados
```

## 5. Permissões
Registrar prefixo `direcao_estrategia` no sistema de rotas/permissões (igual aos outros itens do hub).

## Notas técnicas
- Manter estética glassmorphism unificada (bg-white/5, backdrop-blur-xl, border-white/10, gradiente azul).
- Preferir refatorar componentes existentes (`ProdutosFabrica`, `TabelaPrecos`, seções do `DREMesDirecao`) com props para evitar duplicação de lógica/dados.
- Nenhuma migration de banco necessária.

## Pontos a confirmar
1. Ícone do botão "Estratégia": `Lightbulb`, `Sparkles`, `Target` ou outro?
2. Em "Resultados", qual exatamente é "a sessão final" do DRE — apenas o card de Lucro/Prejuízo final, ou todo o bloco de totais consolidados?
3. Em "Despesas", o ano exibido deve ser sempre o atual ou permitir trocar de ano?
