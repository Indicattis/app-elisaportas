# Botão "Empresas" no header de /direcao/estrategia/despesas

## Mudança
Em `src/pages/direcao/estrategia/EstrategiaDespesas.tsx`, ao lado do botão "Configurações padrão" no `headerActions`, adicionar um novo botão **"Empresas"** (ícone `Building2`) que navega para `/administrativo/empresas`, com o mesmo estilo do botão existente.

## Detalhes técnicos
- Envelopar os dois botões em um `<div className="flex items-center gap-2">` para acomodar múltiplos `headerActions`.
- Sem mudanças de rota, banco ou permissões — apenas reuso da rota já criada em `/administrativo/empresas`.

## Arquivos alterados
- `src/pages/direcao/estrategia/EstrategiaDespesas.tsx`
