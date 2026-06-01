import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ProdutoVenda } from '@/hooks/useVendas';
import { calcularLimitesDesconto, calcularTotalVenda } from '@/utils/descontoVendasRules';
import { useConfiguracoesVendas } from '@/hooks/useConfiguracoesVendas';
import { Percent, DollarSign, AlertCircle, CheckCircle2, AlertTriangle, Key, Infinity } from 'lucide-react';

interface DescontoVendaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  produtos: ProdutoVenda[];
  onAplicarDesconto: (produtosAtualizados: ProdutoVenda[]) => void;
  formaPagamento: string;
  vendaPresencial: boolean;
}

export function DescontoVendaModal({
  open,
  onOpenChange,
  produtos,
  onAplicarDesconto,
  formaPagamento,
  vendaPresencial
}: DescontoVendaModalProps) {
  const [produtosSelecionados, setProdutosSelecionados] = useState<boolean[]>([]);
  const [tipoDesconto, setTipoDesconto] = useState<'percentual' | 'valor'>('percentual');
  const [valorDesconto, setValorDesconto] = useState('');
  
  const { limites: configLimites } = useConfiguracoesVendas();

  useEffect(() => {
    if (open) {
      // Resetar seleção quando abrir o modal
      setProdutosSelecionados(produtos.map(() => false));
      setValorDesconto('');
      setTipoDesconto('percentual');
    }
  }, [open, produtos]);

  const limites = calcularLimitesDesconto(formaPagamento, vendaPresencial, {
    avista: configLimites.avista,
    presencial: configLimites.presencial,
    adicionalResponsavel: configLimites.adicionalResponsavel
  });
  const totalVenda = calcularTotalVenda(produtos);

  // Calcular desconto já aplicado
  const descontoAtual = produtos.reduce((total, produto) => {
    const valorBase = (
      produto.valor_produto + 
      produto.valor_pintura + 
      produto.valor_instalacao
    ) * produto.quantidade;
    
    const desconto = produto.tipo_desconto === 'valor'
      ? produto.desconto_valor
      : valorBase * (produto.desconto_percentual / 100);
    
    return total + desconto;
  }, 0);

  const percentualDescontoAtual = totalVenda > 0 ? (descontoAtual / totalVenda) * 100 : 0;

  // Calcular novo desconto
  const produtosSelecionadosData = produtos.filter((_, index) => produtosSelecionados[index]);
  const totalProdutosSelecionados = produtosSelecionadosData.reduce((total, produto) => {
    return total + (
      produto.valor_produto + 
      produto.valor_pintura + 
      produto.valor_instalacao
    ) * produto.quantidade;
  }, 0);

  const valorDescontoNumerico = parseFloat(valorDesconto) || 0;
  const novoDescontoValor = tipoDesconto === 'valor' 
    ? valorDescontoNumerico 
    : totalProdutosSelecionados * (valorDescontoNumerico / 100);

  const novoDescontoTotal = descontoAtual + novoDescontoValor;
  const novoPercentualDesconto = totalVenda > 0 ? (novoDescontoTotal / totalVenda) * 100 : 0;

  // Determinar status do desconto
  const excedente = novoPercentualDesconto - limites.limiteTotal;
  const dentroDoLimite = excedente <= 0;
  const requerSenhaResponsavel = excedente > 0 && novoPercentualDesconto <= limites.limiteMaximo;
  const requerSenhaMaster = novoPercentualDesconto > limites.limiteMaximo;

  const handleAplicar = () => {
    if (produtosSelecionados.every(sel => !sel)) {
      return;
    }

    if (valorDescontoNumerico <= 0) {
      return;
    }

    // Distribuir o desconto proporcionalmente entre os produtos selecionados
    const produtosAtualizados = produtos.map((produto, index) => {
      if (!produtosSelecionados[index]) return produto;

      const valorBaseProduto = (
        produto.valor_produto + 
        produto.valor_pintura + 
        produto.valor_instalacao
      ) * produto.quantidade;

      const proporcao = valorBaseProduto / totalProdutosSelecionados;
      const descontoProduto = novoDescontoValor * proporcao;

      // Converter para percentual ou valor baseado no tipo escolhido
      if (tipoDesconto === 'valor') {
        return {
          ...produto,
          tipo_desconto: 'valor' as const,
          desconto_valor: (produto.desconto_valor || 0) + descontoProduto,
          desconto_percentual: 0
        };
      } else {
        const percentualProduto = (descontoProduto / valorBaseProduto) * 100;
        const novoPercentual = (produto.desconto_percentual || 0) + percentualProduto;
        return {
          ...produto,
          tipo_desconto: 'percentual' as const,
          // Arredondar para 2 casas decimais para compatibilidade com numeric(6,2) no banco
          desconto_percentual: Math.round(novoPercentual * 100) / 100,
          desconto_valor: 0
        };
      }
    });

    onAplicarDesconto(produtosAtualizados);
    onOpenChange(false);
  };

  const getTipoProdutoLabel = (tipo: string) => {
    switch (tipo) {
      case 'porta_enrolar': return 'Porta de Enrolar';
      case 'porta_social': return 'Porta Social';
      case 'pintura_epoxi': return 'Pintura Eletrostática';
      case 'acessorio': return 'Acessório';
      case 'adicional': return 'Adicional';
      case 'manutencao': return 'Manutenção';
      case 'instalacao': return 'Instalação';
      default: return tipo;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Desconto</DialogTitle>
          <DialogDescription>
            Selecione os produtos e defina o valor do desconto a ser aplicado
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações de Limite */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <p className="text-sm text-muted-foreground">Total da Venda</p>
              <p className="text-2xl font-bold">R$ {totalVenda.toFixed(2)}</p>
            </div>
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <p className="text-sm text-muted-foreground">Desconto Atual</p>
              <p className="text-2xl font-bold">{percentualDescontoAtual.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">
                Limite: {limites.limiteTotal}% | Com senha: até {limites.limiteMaximo}% | Com master: sem limite
              </p>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {formaPagamento !== 'cartao_credito' && (
              <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Não Cartão (+{configLimites.avista}%)
              </Badge>
            )}
            {vendaPresencial && (
              <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/20">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Fria (+{configLimites.presencial}%)
              </Badge>
            )}
          </div>

          {/* Lista de Produtos */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">Selecione os Produtos</Label>
            <div className="border rounded-lg divide-y max-h-[200px] overflow-y-auto">
              {produtos.map((produto, index) => {
                const valorProduto = (
                  produto.valor_produto + 
                  produto.valor_pintura + 
                  produto.valor_instalacao
                ) * produto.quantidade;

                const detalhes = (produto.tipo_produto === 'porta_enrolar' || produto.tipo_produto === 'porta_social')
                  ? (produto.largura && produto.altura ? `${Number(produto.largura).toFixed(2)}m x ${Number(produto.altura).toFixed(2)}m` : produto.tamanho)
                  : produto.descricao || '-';

                return (
                  <div key={index} className="flex items-center gap-3 p-3 hover:bg-muted/50">
                    <Checkbox
                      checked={produtosSelecionados[index]}
                      onCheckedChange={(checked) => {
                        const novaSeleção = [...produtosSelecionados];
                        novaSeleção[index] = checked as boolean;
                        setProdutosSelecionados(novaSeleção);
                      }}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{getTipoProdutoLabel(produto.tipo_produto)}</p>
                      <p className="text-sm text-muted-foreground">{detalhes}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">R$ {valorProduto.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">Qtd: {produto.quantidade}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tipo de Desconto */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Tipo de Desconto</Label>
            <RadioGroup value={tipoDesconto} onValueChange={(value: 'percentual' | 'valor') => setTipoDesconto(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="percentual" id="percentual" />
                <Label htmlFor="percentual" className="cursor-pointer flex items-center gap-2">
                  <Percent className="w-4 h-4" />
                  Percentual
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="valor" id="valor" />
                <Label htmlFor="valor" className="cursor-pointer flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Valor Fixo
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Valor do Desconto */}
          <div className="space-y-2">
            <Label htmlFor="valorDesconto" className="text-base font-semibold">
              {tipoDesconto === 'percentual' ? 'Percentual de Desconto' : 'Valor do Desconto'}
            </Label>
            <Input
              id="valorDesconto"
              type="number"
              step={tipoDesconto === 'percentual' ? '0.1' : '0.01'}
              min="0"
              value={valorDesconto}
              onChange={(e) => setValorDesconto(e.target.value)}
              placeholder={tipoDesconto === 'percentual' ? 'Ex: 5' : 'Ex: 100.00'}
            />
          </div>

          {/* Preview do Desconto */}
          {valorDescontoNumerico > 0 && produtosSelecionados.some(sel => sel) && (
            <div className="bg-muted/50 p-4 rounded-lg space-y-3">
              <p className="font-semibold">Prévia do Desconto</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Desconto Aplicado</p>
                  <p className="font-semibold">R$ {novoDescontoValor.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Novo Total</p>
                  <p className="font-semibold">R$ {(totalVenda - novoDescontoTotal).toFixed(2)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Percentual Total de Desconto</p>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-bold">{novoPercentualDesconto.toFixed(1)}%</p>
                    {dentroDoLimite && <Badge className="bg-green-500">Dentro do limite</Badge>}
                    {requerSenhaResponsavel && <Badge className="bg-amber-500">Requer senha responsável</Badge>}
                    {requerSenhaMaster && (
                      <Badge className="bg-red-500 flex items-center gap-1">
                        <Key className="h-3 w-3" />
                        Requer senha master
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Alertas */}
          {requerSenhaResponsavel && (
            <Alert className="bg-amber-500/10 border-amber-500/20">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-900">
                Este desconto excede o limite de {limites.limiteTotal}%. Será necessária autorização do responsável ao criar a venda (máximo {limites.limiteMaximo}%).
              </AlertDescription>
            </Alert>
          )}

          {requerSenhaMaster && (
            <Alert className="bg-red-500/10 border-red-500/20">
              <Key className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-900 flex items-center gap-1">
                <Infinity className="h-4 w-4 inline" />
                Este desconto excede o limite de {limites.limiteMaximo}%. Será necessária a senha master para aprovar.
              </AlertDescription>
            </Alert>
          )}

          {/* Botões */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAplicar}
              disabled={
                !produtosSelecionados.some(sel => sel) ||
                valorDescontoNumerico <= 0
              }
            >
              Aplicar Desconto
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
