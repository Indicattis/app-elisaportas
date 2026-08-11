# Painel único: tipos de despesa que debitam do DRE

## O que será feito
Criar um painel central onde todas as seções de despesa aparecem em uma só lista, com o status "debita / não debita" do DRE e a chave para alternar cada uma.

- Botão novo no cabeçalho da página do mês (`/direcao/estrategia/despesas/AAAA-MM`) e também na página de Configurações padrão: **"Tipos no DRE"**.
- Abre um modal no estilo da página (glassmorphism, fundo escuro translúcido) listando as 11 seções:
  Folha Salarial, Despesa projetada, Fixas, Variáveis, Autorizados, Impostos, Investimentos, Fornecedores, Financiamentos, Fretes e Logística, Salários.
- Cada linha mostra: nome da seção, selo "● Debita DRE" (verde) ou "○ Não debita" (âmbar) e a chave para alternar.
- No topo do modal: contagem de quantas debitam e quantas não debitam, e o aviso de que a configuração é global (vale para todos os meses).
- Alternar no painel reflete imediatamente na chave da própria seção da página, e vice-versa.
- A chave existente no cabeçalho de cada seção continua como está.

## Detalhes técnicos
- Novo componente `src/components/direcao/estrategia/TiposDreDialog.tsx`, usando `useCategoriaDreConfig` (`debita`, `toggle`, `refetch`) — mesma tabela `despesas_categoria_dre_config`, sem migração de banco.
- Lista de seções definida como constante local `{ key: CategoriaDespesa, label: string }[]`, na mesma ordem da página.
- Botão adicionado em `EstrategiaDespesasMes.tsx` (junto ao botão de status) e no header de `EstrategiaDespesasConfiguracoes.tsx`.
- Para manter os dois pontos em sincronia sem recarregar, o dialog chama `refetch` do hook ao fechar; as seções já leem do mesmo hook por instância, então cada uma revalida ao remontar.
