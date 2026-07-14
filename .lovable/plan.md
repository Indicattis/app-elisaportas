## Objetivo

Na tabela de `/direcao/vendas/todas`, ao passar o mouse sobre a célula "Desconto/Acréscimo", exibir no tooltip a **quebra do desconto por faixa**: À Vista (cartão / forma de pagamento), Frio (temperatura) e Gerente/Diretor (adicional com senha) — usando a mesma distribuição já usada na tela de faturamento.

## Alterações

Arquivo único: `src/pages/direcao/VendasDirecao.tsx`

1. Importar o utilitário existente:
   ```ts
   import { calcDescontoTiersAplicados } from '@/utils/descontoTiers';
   ```

2. Dentro do `case 'desconto_acrescimo'` (linhas ~669-790), quando `desconto > 0`, calcular:
   ```ts
   const totalBase = calcularTotalVenda(venda.produtos || []);
   const tiers = calcDescontoTiersAplicados({
     totalVenda: totalBase,
     descontoTotal: desconto,
     formaPagamento: venda.forma_pagamento,
     vendaPresencial: venda.temperatura === false, // fria => apto frio
     limAvista,
     limPresencial,
   });
   ```

3. Nos dois `TooltipContent` já existentes (o de desconto+crédito e o de só desconto), adicionar uma seção "Distribuição do desconto" logo após a linha "Valor/Desconto" e antes do bloco de autorização:

   ```tsx
   <div className="pt-1 mt-1 border-t border-white/10 space-y-0.5">
     <p className="text-white/50 text-[10px] uppercase tracking-wider">Distribuição</p>
     <p className="text-white/70">
       <span className="text-white/50">À Vista ({limAvista}%):</span>{' '}
       <span className={tiers.valorAvista > 0 ? 'text-emerald-400' : 'text-white/40'}>
         {formatCurrency(tiers.valorAvista)} ({tiers.pctAvista.toFixed(2)}%)
       </span>
     </p>
     <p className="text-white/70">
       <span className="text-white/50">Frio ({limPresencial}%):</span>{' '}
       <span className={tiers.valorFrio > 0 ? 'text-cyan-400' : 'text-white/40'}>
         {formatCurrency(tiers.valorFrio)} ({tiers.pctFrio.toFixed(2)}%)
       </span>
     </p>
     <p className="text-white/70">
       <span className="text-white/50">Diretor:</span>{' '}
       <span className={tiers.valorGerente > 0 ? 'text-amber-400' : 'text-white/40'}>
         {formatCurrency(tiers.valorGerente)} ({tiers.pctGerente.toFixed(2)}%)
       </span>
     </p>
   </div>
   ```

Nenhuma outra mudança — colunas, ordenação e lógica de excedido permanecem iguais.
