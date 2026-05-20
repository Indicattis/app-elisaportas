import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Trash2, Pencil, X, MessageSquare, MessageSquarePlus } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useState } from 'react';
import { ProdutoVenda } from '@/hooks/useVendas';
import { useCatalogoCores } from '@/hooks/useCatalogoCores';

interface ProdutosVendaTableProps {
  produtos: ProdutoVenda[];
  onRemoveProduto: (index: number) => void;
  onEditProduto?: (index: number) => void;
  onUpdateQuantidade?: (index: number, quantidade: number) => void;
  onRemoverDesconto?: (index: number) => void;
  onUpdateObservacao?: (index: number, observacao: string) => void;
}

const getTipoProdutoLabel = (tipo: string) => {
  switch (tipo) {
    case 'porta_enrolar': return 'Porta de Enrolar';
    case 'porta_social': return 'Porta Social';
    case 'pintura_epoxi': return 'Pintura Eletrostática';
    case 'acessorio': return 'Acessório';
    case 'adicional': return 'Adicional';
    case 'manutencao': return 'Manutenção';
    case 'instalacao': return 'Instalação';
    // Retrocompatibilidade
    case 'porta': return 'Porta de Enrolar';
    default: return tipo;
  }
};

const getTipoProdutoVariant = (tipo: string): "default" | "secondary" | "outline" | "destructive" => {
  switch (tipo) {
    case 'porta_enrolar': return 'default';
    case 'porta_social': return 'default';
    case 'pintura_epoxi': return 'destructive';
    case 'acessorio': return 'secondary';
    case 'adicional': return 'outline';
    case 'manutencao': return 'secondary';
    case 'instalacao': return 'secondary';
    // Retrocompatibilidade
    case 'porta': return 'default';
    default: return 'default';
  }
};

function ObservacaoCell({
  valor,
  onSalvar,
}: {
  valor: string;
  onSalvar: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [texto, setTexto] = useState(valor || '');
  const temObs = !!valor && valor.trim().length > 0;
  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setTexto(valor || ''); }}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 max-w-[180px] gap-1 px-2 text-left"
          title={valor || 'Adicionar observação'}
        >
          {temObs ? (
            <MessageSquare className="w-3.5 h-3.5 shrink-0 text-primary" />
          ) : (
            <MessageSquarePlus className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
          )}
          <span className={`truncate text-xs ${temObs ? '' : 'text-muted-foreground'}`}>
            {temObs ? valor : 'Adicionar'}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-2">
          <p className="text-xs font-medium">Observação do item</p>
          <Textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Anotações específicas deste item..."
            className="min-h-[100px] text-sm"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => { onSalvar(texto.trim()); setOpen(false); }}
            >
              Salvar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function ProdutosVendaTable({ produtos, onRemoveProduto, onEditProduto, onUpdateQuantidade, onRemoverDesconto, onUpdateObservacao }: ProdutosVendaTableProps) {
  const { cores } = useCatalogoCores();

  if (produtos.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground border rounded-lg bg-muted/50">
        Nenhum produto adicionado
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tipo</TableHead>
          <TableHead>Detalhes</TableHead>
          <TableHead>Cor</TableHead>
          <TableHead>Qtd</TableHead>
          <TableHead>Tamanho</TableHead>
          <TableHead>Valor Unit.</TableHead>
          <TableHead>Desconto</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Observação</TableHead>
          <TableHead className="w-[120px]">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {produtos.map((produto, index) => {
          // valor_produto já considera o tamanho unitário para itens decimais (armazenado como preco * tamanho).
          const valorBase = (produto.valor_produto + produto.valor_pintura + produto.valor_instalacao) * produto.quantidade;
          const descontoAplicado = produto.tipo_desconto === 'valor' 
            ? produto.desconto_valor 
            : valorBase * (produto.desconto_percentual / 100);
          const valorTotal = valorBase - descontoAplicado;
          
          // Priorizar largura x altura sobre tamanho (para novos registros)
          const detalhes = (produto.tipo_produto === 'porta_enrolar' || produto.tipo_produto === 'porta_social' || produto.tipo_produto === 'porta')
            ? (produto.largura && produto.altura ? `${Number(produto.largura).toFixed(2)}m x ${Number(produto.altura).toFixed(2)}m` : produto.tamanho)
            : produto.descricao || '-';
          const isCatalogoDecimal = ['acessorio', 'adicional', 'manutencao'].includes(produto.tipo_produto)
            && ['metro', 'kg', 'litro'].includes((produto.unidade || '').toLowerCase());
          const unidadeShort = (produto.unidade || '').toLowerCase() === 'metro' ? 'm'
            : (produto.unidade || '').toLowerCase() === 'kg' ? 'kg'
            : (produto.unidade || '').toLowerCase() === 'litro' ? 'L' : '';
          const tamanhoNumPV = parseFloat(produto.tamanho || '') || 0;
          const valorUnitBase = produto.valor_produto + produto.valor_pintura + produto.valor_instalacao;
          const valorUnitDisplay = isCatalogoDecimal && tamanhoNumPV > 0
            ? valorUnitBase / tamanhoNumPV
            : valorUnitBase;
          
          return (
            <TableRow key={index}>
              <TableCell>
                <Badge variant={getTipoProdutoVariant(produto.tipo_produto)}>
                  {getTipoProdutoLabel(produto.tipo_produto)}
                </Badge>
              </TableCell>
              <TableCell>{detalhes}</TableCell>
              <TableCell>
                {(() => {
                  const cor = produto.cor_id ? cores.find(c => c.id === produto.cor_id) : null;
                  if (!cor) return <span className="text-muted-foreground">-</span>;
                  return (
                    <div className="flex items-center gap-2">
                      <div
                        className="h-4 w-4 rounded-full border border-border"
                        style={{ backgroundColor: cor.codigo_hex }}
                      />
                      <span className="text-sm">{cor.nome}</span>
                    </div>
                  );
                })()}
              </TableCell>
              <TableCell>
                {onUpdateQuantidade ? (
                  (() => {
                    const permiteDecimal = produto.unidade?.toLowerCase() === 'metro' || 
                                          produto.unidade?.toLowerCase() === 'kg' || 
                                          produto.unidade?.toLowerCase() === 'litro';
                    return (
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          value={produto.quantidade}
                          onChange={(e) => {
                            const novaQtd = parseInt(e.target.value);
                            if (novaQtd >= 1) {
                              onUpdateQuantidade(index, novaQtd);
                            }
                          }}
                          className="w-20"
                        />
                      </div>
                    );
                  })()
                ) : (
                  <span>
                    {produto.quantidade}
                  </span>
                )}
              </TableCell>
              <TableCell>
                {isCatalogoDecimal ? (
                  <div className="flex items-center gap-1">
                    <span className="text-sm">{produto.tamanho || '-'}</span>
                    {produto.tamanho && unidadeShort && (
                      <span className="text-xs text-muted-foreground">{unidadeShort}</span>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>R$ {valorUnitDisplay.toFixed(2)}{isCatalogoDecimal && unidadeShort ? `/${unidadeShort}` : ''}</TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <span>
                    {produto.tipo_desconto === 'valor' 
                      ? `R$ ${produto.desconto_valor.toFixed(2)}`
                      : `${produto.desconto_percentual}%`
                    }
                  </span>
                  {onRemoverDesconto && (produto.desconto_valor > 0 || produto.desconto_percentual > 0) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => onRemoverDesconto(index)}
                      title="Remover desconto"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </TableCell>
              <TableCell className="font-semibold">R$ {valorTotal.toFixed(2)}</TableCell>
            <TableCell>
              {onUpdateObservacao ? (
                <ObservacaoCell
                  valor={produto.observacao_item || ''}
                  onSalvar={(v) => onUpdateObservacao(index, v)}
                />
              ) : (
                <span className="text-xs text-muted-foreground truncate block max-w-[180px]" title={produto.observacao_item || ''}>
                  {produto.observacao_item || '—'}
                </span>
              )}
            </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveProduto(index)}
                    title="Remover produto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
