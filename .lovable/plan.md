# Replicar cadastro de produto da venda nova na edição

## Contexto

A página `/vendas/minhas-vendas/nova` (`VendaNovaMinimalista.tsx`) tem um conjunto mais completo de botões/modais de cadastro de produto. A página `/vendas/minhas-vendas/editar/:id` (`MinhasVendasEditar.tsx`) — que é usada **tanto para editar rascunhos quanto vendas já cadastradas** — está defasada e precisa receber o mesmo sistema.

## Diferenças identificadas

Hoje a /nova oferece estes botões na seção Produtos:

1. Porta de Enrolar  
2. Porta Social  
3. Pintura Eletrostática → abre `PinturaItemCatalogoModal` (catálogo de pinturas vinculadas às portas)  
4. **Serviços** (`tipo_inicial='manutencao'`) → abre `ProdutoVendaForm`  
5. Catálogo → abre `SelecionarAcessoriosModal`  

E também o fluxo automático **`PinturaRapidaModal`** após adicionar uma Porta de Enrolar (sugere pintura imediatamente com as medidas da porta).

A /editar atualmente só tem: Porta de Enrolar, Porta Social, Pintura Eletrostática (via `ProdutoVendaForm` simples) e Catálogo. Faltam: **Serviços**, troca de Pintura Eletrostática para o `PinturaItemCatalogoModal`, e o fluxo `PinturaRapidaModal`.

## Mudanças propostas em `src/pages/vendas/MinhasVendasEditar.tsx`

1. **Imports**: adicionar `PinturaItemCatalogoModal` e `PinturaRapidaModal`.
2. **Estados novos**:
   - `pinturaItemModalOpen`
   - `pinturaRapidaOpen` + `portaRecemAdicionada` (`{ largura, altura } | null`)
3. **Botão "Serviços"**: incluir na barra de botões com `tipoInicial='manutencao'`, `permitirTrocaTipo=false`, abrindo o `ProdutoVendaForm` existente.
4. **Botão "Pintura Eletrostática"**: trocar `onClick` para abrir `PinturaItemCatalogoModal` em vez de `ProdutoVendaForm`.
5. **`PinturaItemCatalogoModal`**: renderizar passando `portas={produtosFormatados}` e no `onConfirm` adicionar cada pintura via `addProduto({ ...pintura, venda_id: id })`.
6. **`PinturaRapidaModal`**: renderizar quando `portaRecemAdicionada` estiver setado. No `onConfirm` adicionar a pintura via `addProduto`. No `onSkip` apenas limpa o estado.
7. **Disparo do `PinturaRapidaModal`**: após `addProduto` bem-sucedido de uma Porta de Enrolar com `largura` e `altura` informadas (mesmo critério da /nova), setar `portaRecemAdicionada` e abrir o modal. Como `addProduto` é mutation, fazer dentro do callback `onAddProduto` do `ProdutoVendaForm` (depois do `await addProduto`).

## Sem mudanças

- Hooks, regras de negócio, layout geral, persistência, validações.
- A página `MinhasVendasEditar` continua sendo o ponto único para rascunho e venda — a lógica que branch em `venda.is_rascunho` permanece intocada.
- Página `VendaEditarMinimalista.tsx` está fora de uso e não será alterada.

## Arquivos

- `src/pages/vendas/MinhasVendasEditar.tsx` — única edição.
