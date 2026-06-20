## Objetivo

Aplicar em **Meus Clientes** o mesmo layout em pílula usado em **Meus Parceiros**, mantendo as funcionalidades atuais (busca, novo cliente, delegar, meta CR, fidelizado/parceiro).

## Mudanças em `src/pages/vendas/MeusClientes.tsx`

### Cards de estatísticas (topo)
Substituir o card único da Meta CR por um grid de 3 cards no estilo dos parceiros (gradiente + ícone + glow):
- **Total** (azul, `Users`) — total de clientes
- **CR** (esmeralda, `Target`) — clientes recorrentes (`tipo_cliente = 'CR'`) com `X/META_CR`
- **Fidelizados** (âmbar, `Star`) — total `fidelizado = true`

A barra de progresso da meta CR vira uma linha fina dentro do próprio card CR (mantém o cálculo de percentual).

### Filtros em pílulas
Logo abaixo dos cards, pílulas no mesmo padrão dos parceiros:
- Todos · CR · CE · Fidelizados · Parceiros (clique alterna o filtro `tipoFiltro`).

A busca por texto permanece, mas estilizada como input compacto acima das pílulas (ou inline ao lado), no mesmo visual já presente.

### Lista em pílulas (igual a Meus Parceiros)
Trocar o grid de cards por linhas em formato pill:
- Avatar circular com iniciais + ring colorida (azul para CE, esmeralda para CR).
- Badge inferior no avatar com ícone (`Users` ou `Target`).
- Bloco "Nome + tipo/CPF" com truncamento.
- Localização (cidade - estado) com ícone `MapPin`.
- Barra horizontal proporcional ao "peso" do cliente (CR = 100%, CE = 50%, ou simplesmente proporcional à contagem do tipo dentro do total — mesmo padrão usado nos parceiros).
- Badges discretos para `fidelizado` (Star âmbar) e `parceiro` (Triangle roxo) quando aplicáveis.
- Botão circular `UserCheck` para delegar (mantém `stopPropagation`).
- `ArrowRight` no fim, com hover.

Clique na linha navega para `/vendas/meus-clientes/:id` (comportamento atual).

### Estado vazio
Mesmo bloco centralizado de Meus Parceiros (ícone grande, texto, e botão "Cadastrar cliente" no estilo outline atual).

## Fora de escopo
- Sem mudanças nas queries, no modal de novo cliente, no modal de delegar, ou na navegação para detalhes.
- Sem mudanças na meta CR (`META_CR = 500`) nem nas regras de filtragem por CPF/CNPJ/telefone.
