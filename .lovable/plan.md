## Objetivo

Restilizar `src/pages/direcao/PedidoViewDirecao.tsx` para adotar o mesmo idioma visual da página `/pos-vendas/pedidos` (glassmorphism `bg-white/5` / `border-white/10`, pílulas coloridas, avatar em gradiente, animações `motion.div`), e enriquecer o bloco "Informações do Cliente" com CPF/CNPJ, e‑mail e endereço completo.

## Escopo

Somente alterações de UI/apresentação no arquivo da página. Sem mudanças de regra de negócio, sem migrações, sem novos endpoints.

## Mudanças

### 1. Enriquecer o fetch de dados do cliente
No `select` de `pedidos_producao`, incluir os campos que já existem na tabela:
`endereco_rua, endereco_numero, endereco_bairro, endereco_cidade, endereco_estado, endereco_cep, cliente_email, cliente_cpf`.

No `select` embutido de `vendas!inner(...)`, incluir para fallback:
`cpf_cliente, cliente_email, cep, bairro, cidade, estado`.

Adicionar no estado `Pedido` os novos campos e uma função utilitária `getEnderecoCliente()` que monta um objeto único priorizando `pedidos_producao.endereco_*` e caindo para os campos equivalentes da venda (regra já registrada em memory: full-address-management).

Formato do endereço exibido:
```
{rua}, {número}{complemento?}
{bairro} — {cidade}/{estado}
CEP {cep}
```

### 2. Redesenho no idioma de /pos-vendas/pedidos

Substituir os `Card` shadcn atuais por blocos `rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl` com cabeçalho compacto (ícone em círculo com gradiente `from-blue-500 to-blue-700`) e `motion.div` com fade/slide de entrada (`initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}` com delay incremental por card).

Novo header do bloco Cliente:
- Avatar circular (10×10) com gradiente azul e inicial do nome, mesmo padrão do `PosVendasPedidos`.
- Nome do cliente em destaque + pílulas de status: `#numero_pedido`, `Correção` (se aplicável), etapa atual usando as mesmas cores atuais mas em formato pill `rounded-full`.
- Chips de metadados em linha (`Cidade/UF`, `Valor`, `Forma de pagamento`, `Tipo de entrega`, `Data prevista`) com o mesmo estilo de pílulas coloridas usadas em pos‑vendas (bg-*-500/15, border-*-500/30, texto *-300).

Nova seção "Dados do Cliente" (grid 1/2/3 colunas):
- CPF/CNPJ (rótulo dinâmico conforme comprimento do valor)
- E‑mail (clicável `mailto:`)
- Telefone (clicável `tel:`) — se disponível na venda
- Endereço completo (ocupando 2 colunas em md+), com ícone `MapPin` e botão discreto "Abrir no Google Maps" quando houver rua/cidade.

Ações Rápidas viram uma barra horizontal de botões pill (`rounded-full`, `bg-white/5 border-white/10`), mantendo os mesmos handlers (Ver Venda, Baixar PDF, Imprimir PDF, Excluir Pedido).

Demais seções (Ficha de Visita, Correção, Produtos da Venda, Itens do Pedido, Ordens, Histórico) recebem apenas o novo "wrapper" visual e cabeçalho padronizado; conteúdo interno das tabelas/listas/pastas permanece funcionalmente idêntico. Badges de etapa passam a `rounded-full` com as mesmas classes de cor já mapeadas em `getEtapaBadgeColor`.

### 3. Detalhes técnicos

- Novos ícones a importar: `Mail`, `Phone`, `Home`, `IdCard` (do `lucide-react`).
- Reaproveitar `MinimalistLayout` (dark, `fullWidth={false}`).
- Nenhuma alteração no `prepararDadosPDF` nem no gerador de PDF.
- Manter `useIsMobile` para as variações mobile das tabelas.
- Sem novas dependências.

## Fora de escopo
- Não editar `pedidoProducaoPDFGenerator`, `ExcluirPedidoModal` nem `PedidoHistoricoMovimentacoes`.
- Não mudar rotas, RLS ou queries de mutação.
- Não alterar outras páginas de detalhes de pedido.
