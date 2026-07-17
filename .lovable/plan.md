## Diagnóstico

Na nova venda, "Instalação" é uma **linha própria de produto** (`tipo_produto='instalacao'`) — o formulário adiciona a instalação como item separado ao lado da porta (`ProdutoVendaForm.tsx:288-306`) e a própria porta sempre é salva com `valor_instalacao = 0` (`ProdutoVendaForm.tsx:275`).

Ao salvar o rascunho (`useVendas.ts`), essas linhas de instalação são persistidas normalmente em `produtos_vendas` como itens independentes com `tipo_produto='instalacao'` e o valor da instalação em `valor_produto`.

O bug está na hidratação em `src/pages/vendas/VendaNovaMinimalista.tsx:291-325`:

```ts
const portasHidratadas = raw
  .filter((p) => p.tipo_produto !== 'instalacao')   // <-- descarta TODAS as instalações
  .map((p) => { ...tenta reanexar via .find()... });
```

Como o novo fluxo nunca deixa `valor_instalacao > 0` na porta, o `.find()` legado não serve para nada e as linhas de instalação simplesmente somem ao transformar o rascunho em venda.

## Correção

Editar apenas o `useEffect` de hidratação em `src/pages/vendas/VendaNovaMinimalista.tsx` (linhas 290-325):

1. Remover o `filter` que descarta `tipo_produto === 'instalacao'`.
2. Remover o bloco `instalacaoParceira`/`.find()` (legado inútil no fluxo atual).
3. Mapear cada linha de `produtos_vendas` preservando o `tipo_produto` original — incluindo `instalacao`, `pintura_epoxi`, `acessorio`, `adicional`, `manutencao` e portas — com todos os campos como estão no banco (`valor_produto`, `valor_pintura`, `descricao`, `quantidade`, dimensões, cor, etc.).
4. Para linhas `instalacao`: manter `valor_produto` como o valor da instalação (o `VendaResumo` e demais componentes já esperam essa estrutura — ver `VendaResumo.tsx:39` que trata `isInstalacaoRow`).

Isso garante que qualquer tipo de produto salvo no rascunho apareça de volta ao transformar em venda — resolvendo o caso reportado da instalação e prevenindo o mesmo problema para outros tipos.

## Escopo

- **1 arquivo alterado**: `src/pages/vendas/VendaNovaMinimalista.tsx` (apenas o `useEffect` de hidratação).
- Sem mudanças em banco, hooks ou fluxo de save (o save já persiste corretamente).
- Sem impacto em vendas legadas (rascunho é feature nova).
