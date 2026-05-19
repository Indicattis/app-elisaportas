## Replicar modal de detalhes em Pintura, Acessórios e Itens Avulso

Atualmente, no header da tabela de Faturamento/Lucro de `/direcao/dre/:mes`, apenas o título **Portas** abre o `PortasDetalheDialog` ao ser clicado, mostrando venda por venda os itens daquele tipo no mês.

Vamos aplicar o mesmo padrão (botão sublinhado com tracejado no header + dialog full com lista de vendas, itens, descontos, líquido e lucro) para:

- **Pintura** → `tipo_produto = 'pintura_epoxi'` **e** o componente "pintura" embutido em portas (`valor_pintura` em itens `porta_enrolar`/`porta_social` quando > 0).
- **Acessórios** → `tipo_produto = 'acessorio'`.
- **Itens Avulso** → `tipo_produto = 'adicional'` (corresponde à coluna `adicionais` no código).

### UX
- Cada um dos 3 títulos vira um botão clicável com `underline decoration-dotted` (igual ao Portas).
- Mantém o tooltip "Top 5 mais vendidos" hoje exibido em Acessórios e Itens Avulso: passa a aparecer como hint ao lado, mas o clique abre o novo modal (não bloqueia o tooltip — o tooltip é exibido em hover normal do botão).
- O modal segue o mesmo visual do `PortasDetalheDialog`: cards por venda com data/cliente/valor da venda, tabela de itens, subtotal por venda, e card azul de totais consolidados no rodapé.

### Estrutura técnica

1. **Generalizar o dialog.** Renomear/extrair `PortasDetalheDialog` para um `ItensDetalheDialog` reutilizável, parametrizado por:
   - `titulo` (ex.: "Vendas com Pintura — Abril/2026")
   - `colunas` exibidas (Portas tem Porta/Pintura/Instalação; Pintura tem Pintura; Acessórios e Avulso têm apenas Valor unit. × Qtd → Líquido). Definir 2 layouts: "porta" (atual) e "simples" (descrição, qtd, valor unit, desconto, líquido, lucro).
   - `vendas: VendaComItensRow[]` (estrutura genérica já compatível, sem campos específicos de porta).

2. **Buscar dados no `fetchData`** do `DREMesDirecao.tsx` (mesmo bloco que monta `portasDetalhe`), criando 3 novos states:
   - `pinturaDetalhe` — vendas que tenham `tipo_produto = 'pintura_epoxi'` **OU** itens `porta_enrolar`/`porta_social` com `valor_pintura > 0`. Cada item exibe valor da pintura (proporcional ao desconto, igual à lógica usada hoje no cálculo de `fat.pintura`).
   - `acessoriosDetalhe` — vendas com `tipo_produto = 'acessorio'`.
   - `avulsosDetalhe` — vendas com `tipo_produto = 'adicional'`.
   
   Cada consulta segue o mesmo padrão do `portasRaw` (join com `vendas!inner`, filtro de período, agrupamento por `vendaId` em `Map`).

3. **Cabeçalho da tabela.** No bloco `columns.map` (linhas ~1309-1346), adicionar branches `isPintura`, `isAcessorios`, `isAdicionais` que renderizam o mesmo botão clicável de Portas, abrindo o respectivo modal. O tooltip de Top 5 continua sendo exibido como `Tooltip` ao redor do botão para Acessórios e Itens Avulso.

4. **States e renders dos modais.** Adicionar `pinturaModalOpen`, `acessoriosModalOpen`, `avulsosModalOpen` e renderizar 3 `ItensDetalheDialog` no final do componente, mantendo o `PortasDetalheDialog` (ou usando o componente generalizado também para portas).

### Escopo
- Só `src/pages/direcao/DREMesDirecao.tsx`.
- Sem mudanças em hooks, banco ou regras de negócio. Os totais já calculados (fat/luc por categoria) continuam a fonte de verdade para a tabela; os novos modais apenas detalham as vendas que compõem cada coluna.
- Os modais não aparecem no PDF impresso (são triggers de tela, fora de `#dre-print-document`).
