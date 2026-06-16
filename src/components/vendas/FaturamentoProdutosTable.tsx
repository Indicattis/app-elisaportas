import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Edit, CheckCircle2 } from "lucide-react";

interface Produto {
  id: string;
  tipo_produto?: string;
  descricao: string;
  tamanho?: string;
  desconto_percentual?: number;
  desconto_valor?: number;
  valor_instalacao?: number;
  valor_total: number;
  quantidade: number;
  lucro_item?: number;
  custo_producao?: number;
  faturamento?: boolean;
  unidade?: string | null;
}

interface FaturamentoProdutosTableProps {
  produtos: Produto[];
  valorFrete: number;
  onEditLucro: (produto: Produto) => void;
}

export function FaturamentoProdutosTable({
  produtos,
  valorFrete,
  onEditLucro,
}: FaturamentoProdutosTableProps) {
  const getTipoProdutoLabel = (tipo?: string) => {
    const tipos: Record<string, string> = {
      'porta_enrolar': 'Porta Enrolar',
      'porta_social': 'Porta Social',
      'acessorio': 'Acessório',
      'manutencao': 'Manutenção',
      'adicional': 'Adicional',
      'pintura_epoxi': 'Pintura Epóxi',
      'instalacao': 'Instalação',
    };
    return tipos[tipo || ''] || tipo || '-';
  };

  return (
    <ScrollArea className="w-full rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tipo</TableHead>
            <TableHead>Produto</TableHead>
            <TableHead>Tamanho</TableHead>
            <TableHead className="text-right">Desc. / Acrésc.</TableHead>
            <TableHead className="text-right">Valor Unit.</TableHead>
            <TableHead className="text-center">Qtd</TableHead>
            <TableHead className="text-right">Valor Total</TableHead>
            <TableHead className="text-right">Instalação</TableHead>
            <TableHead className="text-right">Lucro Informado</TableHead>
            <TableHead className="text-center">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {produtos?.map((produto) => {
            const temLucro = produto.lucro_item !== null && produto.lucro_item !== undefined;
            const valorTotalLinha = produto.valor_total; // Já é o total da linha no banco
            const unidadeLower = (produto.unidade || '').toLowerCase();
            const isDecimal = ['metro', 'kg', 'litro'].includes(unidadeLower);
            const tamanhoNum = parseFloat(produto.tamanho || '') || 0;
            const unidadeShort = unidadeLower === 'metro' ? 'm'
              : unidadeLower === 'kg' ? 'kg'
              : unidadeLower === 'litro' ? 'L' : '';
            const valorUnitario = isDecimal && tamanhoNum > 0 && produto.quantidade > 0
              ? produto.valor_total / (produto.quantidade * tamanhoNum)
              : produto.quantidade > 0 ? produto.valor_total / produto.quantidade : 0;
            const pct = produto.desconto_percentual || 0;
            const val = produto.desconto_valor || 0;
            // Sinal: positivo = desconto, negativo = acréscimo
            const sinalRef = pct !== 0 ? pct : val;
            const isAcrescimo = sinalRef < 0;
            const isDesconto = sinalRef > 0;
            const ajusteLabel = isAcrescimo ? 'Acréscimo' : isDesconto ? 'Desconto' : '';
            const ajusteSinal = isAcrescimo ? '+' : isDesconto ? '−' : '';
            const ajusteCor = isAcrescimo
              ? 'text-amber-600'
              : isDesconto
                ? 'text-orange-600'
                : 'text-muted-foreground';
            const ajusteValorTxt = pct !== 0
              ? `${Math.abs(pct)}%`
              : val !== 0
                ? `R$ ${Math.abs(val).toFixed(2)}`
                : '';
            const unidadeLabel = unidadeShort ? ` ${unidadeShort}` : '';
            
            return (
              <TableRow key={produto.id}>
                <TableCell className="text-sm">
                  {getTipoProdutoLabel(produto.tipo_produto)}
                </TableCell>
                <TableCell className="font-medium">
                  {produto.descricao}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {produto.tamanho ? `${produto.tamanho}${unidadeLabel}` : "-"}
                </TableCell>
                <TableCell className={`text-right ${ajusteCor}`}>
                  {ajusteValorTxt ? (
                    <div className="flex flex-col items-end leading-tight">
                      <span className="text-[10px] uppercase tracking-wider opacity-70">
                        {ajusteLabel}
                      </span>
                      <span className="font-medium">
                        {ajusteSinal} {ajusteValorTxt}
                      </span>
                    </div>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell className="text-right">
                  R$ {valorUnitario.toFixed(2)}{isDecimal && unidadeShort ? `/${unidadeShort}` : ''}
                </TableCell>
                <TableCell className="text-center">
                  {produto.quantidade}
                </TableCell>
                <TableCell className="text-right font-medium">
                  R$ {valorTotalLinha.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  {produto.valor_instalacao 
                    ? `R$ ${produto.valor_instalacao.toFixed(2)}` 
                    : "-"}
                </TableCell>
                <TableCell className="text-right">
                  {produto.faturamento ? (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Faturado
                    </Badge>
                  ) : temLucro ? (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      R$ {produto.lucro_item!.toFixed(2)}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                      Pendente
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEditLucro(produto)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}

          {/* Linha do Frete */}
          <TableRow className="bg-muted/50 font-medium">
            <TableCell colSpan={6}>
              <span className="text-sm font-semibold">Frete</span>
            </TableCell>
            <TableCell className="text-right font-semibold">
              R$ {valorFrete.toFixed(2)}
            </TableCell>
            <TableCell colSpan={3} className="text-muted-foreground text-sm">
              Apenas visualização
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
