import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProdutoVenda } from '@/hooks/useVendas';
import { calcularDescontoTotal, calcularPercentualDesconto, calcularTotalVenda } from '@/utils/descontoVendasRules';
import { X } from 'lucide-react';

interface VendaResumoProps {
  produtos: ProdutoVenda[];
  valorFrete?: number;
  valorCredito?: number;
  percentualCredito?: number;
  onRemoverCredito?: () => void;
}

export function VendaResumo({ 
  produtos, 
  valorFrete = 0, 
  valorCredito = 0,
  percentualCredito = 0,
  onRemoverCredito
}: VendaResumoProps) {
  const totais = produtos.reduce((acc, produto) => {
    const valorBase = (
      produto.valor_produto + 
      produto.valor_pintura + 
      produto.valor_instalacao
    ) * produto.quantidade;
    
    const descontoAplicado = produto.tipo_desconto === 'valor' 
      ? produto.desconto_valor 
      : valorBase * (produto.desconto_percentual / 100);
    
    const valorFinal = valorBase - descontoAplicado;

    // Instalação e pintura agora são linhas separadas (tipo_produto === 'instalacao'
    // ou 'pintura_epoxi'), com o valor armazenado em `valor_produto`. Roteamos
    // esses valores para as suas respectivas somas para exibição correta.
    const qtd = produto.quantidade || 1;
    const isInstalacaoRow = produto.tipo_produto === 'instalacao';
    const isPinturaRow = produto.tipo_produto === 'pintura_epoxi';
    const valorProdutoLinha = produto.valor_produto * qtd;

    return {
      produto:
        acc.produto + (isInstalacaoRow || isPinturaRow ? 0 : valorProdutoLinha),
      pintura:
        acc.pintura + (produto.valor_pintura * qtd) + (isPinturaRow ? valorProdutoLinha : 0),
      instalacao:
        acc.instalacao + (produto.valor_instalacao * qtd) + (isInstalacaoRow ? valorProdutoLinha : 0),
      total: acc.total + valorFinal,
    };
  }, {
    produto: 0,
    pintura: 0,
    instalacao: 0,
    total: 0
  });

  const totalVendaSemDesconto = calcularTotalVenda(produtos);
  const descontoAplicado = calcularDescontoTotal(produtos);
  const percentualDescontoCalc = calcularPercentualDesconto(descontoAplicado, totalVendaSemDesconto);
  
  // Total final = produtos + frete + crédito da venda
  const valorTotalFinal = totais.total + valorFrete + valorCredito;

  const cardClass = "bg-white/5 border-white/10 backdrop-blur-xl";

  return (
    <Card className={cardClass}>
      <CardHeader className="pb-3 pt-4">
        <CardTitle className="text-base font-semibold text-white">Resumo da Venda</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pb-4">
        <div className="flex justify-between">
          <span className="text-white/50 text-sm">Valor Produtos:</span>
          <span className="font-semibold text-white text-sm">R$ {totais.produto.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/50 text-sm">Valor Pintura:</span>
          <span className="font-semibold text-white text-sm">R$ {totais.pintura.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/50 text-sm">Valor Instalação:</span>
          <span className="font-semibold text-white text-sm">R$ {totais.instalacao.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/50 text-sm">Valor Frete:</span>
          <span className="font-semibold text-white text-sm">R$ {valorFrete.toFixed(2)}</span>
        </div>
        {descontoAplicado > 0 && (
          <div className="flex justify-between text-red-400">
            <span className="font-medium text-sm">Desconto Aplicado:</span>
            <span className="font-semibold text-sm">
              -R$ {descontoAplicado.toFixed(2)} ({percentualDescontoCalc.toFixed(2)}%)
            </span>
          </div>
        )}
        {valorCredito > 0 && (
          <div className="flex justify-between items-center text-emerald-400">
            <span className="font-medium text-sm">Crédito Aplicado:</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">
                +R$ {valorCredito.toFixed(2)} ({percentualCredito.toFixed(2)}%)
              </span>
              {onRemoverCredito && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  onClick={onRemoverCredito}
                  title="Remover crédito"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        )}
        <div className="h-px bg-white/10 my-2" />
        <div className="flex justify-between text-lg">
          <span className="font-bold text-white">Total:</span>
          <span className="font-bold text-white">R$ {valorTotalFinal.toFixed(2)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
