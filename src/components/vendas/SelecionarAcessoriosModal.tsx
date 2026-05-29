import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Search, Package } from 'lucide-react';
import type { ProdutoVenda } from '@/hooks/useVendas';
import { toast } from 'sonner';

interface SelecionarAcessoriosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (produtos: ProdutoVenda[]) => void;
}

interface ItemSelecionavel {
  id: string;
  nome: string;
  preco: number;
  tipo: 'acessorio' | 'adicional';
  descricao?: string;
  categoria: string;
  imagem_url?: string;
  unidade?: string;
}

export function SelecionarAcessoriosModal({
  open,
  onOpenChange,
  onConfirm
}: SelecionarAcessoriosModalProps) {
  const [itensSelecionados, setItensSelecionados] = useState<Set<string>>(new Set());
  const [busca, setBusca] = useState('');
  // Para itens com unidade decimal (Metro/Kg/Litro), o usuário informa Qtd e Tamanho separadamente.
  const [quantidades, setQuantidades] = useState<Record<string, number>>({});
  const [tamanhos, setTamanhos] = useState<Record<string, string>>({});

  const { data: produtosEstoque = [], isLoading } = useQuery({
    queryKey: ['custos-itens-modal'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custos_itens')
        .select('id, descricao, preco_venda, categoria, unidade, ordem')
        .order('categoria', { ascending: true })
        .order('ordem', { ascending: true })
        .order('descricao', { ascending: true });

      if (error) throw error;
      return (data || []).map(item => ({
        id: item.id,
        nome: item.descricao,
        preco: Number(item.preco_venda) || 0,
        // Itens vindos da Estratégia de Custos são tratados como 'acessorio' por padrão.
        // O vendedor pode trocar pelo dropdown específico de "Adicional" no ProdutoVendaForm.
        tipo: 'acessorio' as 'acessorio' | 'adicional',
        descricao: '',
        categoria: item.categoria || 'Sem categoria',
        imagem_url: undefined as string | undefined,
        unidade: item.unidade || 'Unitário',
      }));
    },
    enabled: open
  });

  const produtosFiltrados = useMemo(() => {
    if (!busca.trim()) return produtosEstoque;
    const termoBusca = busca.toLowerCase().trim();
    return produtosEstoque.filter(item => 
      item.nome.toLowerCase().includes(termoBusca) ||
      item.categoria.toLowerCase().includes(termoBusca)
    );
  }, [produtosEstoque, busca]);

  const toggleItem = (itemId: string) => {
    setItensSelecionados(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleConfirmar = () => {
    const itensSelecionadosArray = produtosEstoque.filter(item => itensSelecionados.has(item.id));

    // Validar tamanho obrigatório para itens decimais (metro/kg/litro)
    const semTamanho = itensSelecionadosArray.filter(item => {
      const isDecimal = ['metro', 'kg', 'litro'].includes((item.unidade || '').toLowerCase());
      const tam = parseFloat(tamanhos[item.id] || '') || 0;
      return isDecimal && tam <= 0;
    });

    if (semTamanho.length > 0) {
      toast.error(
        `Informe o tamanho para: ${semTamanho.map(i => i.nome).join(', ')}`
      );
      return;
    }
    
    const produtos: ProdutoVenda[] = itensSelecionadosArray.map(item => {
      const isDecimal = ['metro', 'kg', 'litro'].includes((item.unidade || '').toLowerCase());
      const qtd = quantidades[item.id] ?? 1;
      const tam = isDecimal ? (tamanhos[item.id] || '') : '';
      const tamanhoNum = isDecimal ? (parseFloat(tam) || 0) : 0;
      // Para itens medidos por unidade decimal, o valor unitário armazenado considera o tamanho
      // (preco_venda * tamanho_unitario), permitindo que o trigger do DB calcule valor_total
      // como valor_unitario_efetivo * quantidade.
      const valorUnitario = isDecimal && tamanhoNum > 0 ? item.preco * tamanhoNum : item.preco;
      return {
        tipo_produto: item.tipo === 'acessorio' ? 'acessorio' : 'adicional',
        largura: 0,
        altura: 0,
        valor_produto: valorUnitario,
        valor_pintura: 0,
        valor_instalacao: 0,
        valor_frete: 0,
        quantidade: qtd,
        descricao: item.nome,
        tamanho: tam,
        desconto_valor: 0,
        desconto_percentual: 0,
        tipo_desconto: 'valor' as const,
        custos_itens_id: item.id,
        unidade: item.unidade
      } as ProdutoVenda;
    });

    onConfirm(produtos);
    resetState();
  };

  const resetState = () => {
    setItensSelecionados(new Set());
    setBusca('');
    setQuantidades({});
    setTamanhos({});
    onOpenChange(false);
  };

  const temItemDecimalSemTamanho = useMemo(() => {
    return produtosEstoque.some(item => {
      if (!itensSelecionados.has(item.id)) return false;
      const isDecimal = ['metro', 'kg', 'litro'].includes((item.unidade || '').toLowerCase());
      if (!isDecimal) return false;
      const tam = parseFloat(tamanhos[item.id] || '') || 0;
      return tam <= 0;
    });
  }, [itensSelecionados, tamanhos, produtosEstoque]);

  const getCategoriaColor = (categoria: string) => {
    const c = (categoria || '').toLowerCase();
    if (c.includes('acessório') || c.includes('acessorio')) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (c.includes('motor')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (c.includes('avuls')) return 'bg-purple-100 text-purple-800 border-purple-200';
    return 'bg-muted text-muted-foreground border-border';
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetState(); else onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Catálogo de Produtos</DialogTitle>
          <DialogDescription>
            Selecione os itens que deseja adicionar à venda
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produto..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <ScrollArea className="h-[350px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Carregando itens...
            </div>
          ) : produtosFiltrados.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {busca ? (
                <>
                  Nenhum produto encontrado para "{busca}".
                  <br />
                  <span className="text-xs">Tente outro termo de busca</span>
                </>
              ) : (
                <>
                  Nenhum produto disponível para venda avulsa.
                  <br />
                  <span className="text-xs">Configure produtos no módulo de Estoque</span>
                </>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="h-8">
                  <TableHead className="w-10"></TableHead>
                  <TableHead className="w-14">Img</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="w-24">Categoria</TableHead>
                  <TableHead className="text-right w-24">Preço</TableHead>
                  <TableHead className="text-right w-20">Qtd</TableHead>
                  <TableHead className="text-right w-24">Tamanho</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {produtosFiltrados.map((item) => {
                  const isDecimal = ['metro', 'kg', 'litro'].includes((item.unidade || '').toLowerCase());
                  const selected = itensSelecionados.has(item.id);
                  const unidadeLabel = (item.unidade || '').toLowerCase() === 'metro' ? 'm'
                    : (item.unidade || '').toLowerCase() === 'kg' ? 'kg'
                    : (item.unidade || '').toLowerCase() === 'litro' ? 'L'
                    : '';
                  return (
                  <TableRow
                    key={item.id} 
                    className="h-[52px] cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => toggleItem(item.id)}
                  >
                    <TableCell className="py-1 px-3">
                      <Checkbox
                        checked={selected}
                        onCheckedChange={() => toggleItem(item.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                    <TableCell className="py-1">
                      {item.imagem_url ? (
                        <img 
                          src={item.imagem_url} 
                          alt={item.nome}
                          className="w-10 h-10 object-cover rounded-md border border-border"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-muted rounded-md flex items-center justify-center">
                          <Package className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-1 font-medium text-sm">
                      {item.nome}
                    </TableCell>
                    <TableCell className="py-1">
                      <Badge 
                        variant="outline" 
                        className={`text-[10px] px-1.5 py-0 h-5 ${getCategoriaColor(item.categoria)}`}
                      >
                        {item.categoria}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-1 text-right font-semibold text-primary text-sm">
                      R$ {item.preco.toFixed(2)}
                    </TableCell>
                    <TableCell className="py-1 text-right" onClick={(e) => e.stopPropagation()}>
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        value={quantidades[item.id] ?? 1}
                        disabled={!selected}
                        onChange={(e) => setQuantidades(prev => ({ ...prev, [item.id]: Math.max(1, parseInt(e.target.value) || 1) }))}
                        className="h-7 w-16 text-right text-xs px-1.5"
                      />
                    </TableCell>
                    <TableCell className="py-1 text-right" onClick={(e) => e.stopPropagation()}>
                      {isDecimal ? (
                        <div className="flex items-center justify-end gap-1">
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            placeholder={selected ? "obrigatório" : "0,00"}
                            value={tamanhos[item.id] ?? ''}
                            disabled={!selected}
                            onChange={(e) => setTamanhos(prev => ({ ...prev, [item.id]: e.target.value }))}
                            className={`h-7 w-20 text-right text-xs px-1.5 ${
                              selected && (!(parseFloat(tamanhos[item.id] || '') > 0))
                                ? 'border-destructive focus-visible:ring-destructive'
                                : ''
                            }`}
                          />
                          <span className="text-[10px] text-muted-foreground">{unidadeLabel}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={resetState}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirmar}
            disabled={itensSelecionados.size === 0 || temItemDecimalSemTamanho}
            title={temItemDecimalSemTamanho ? 'Informe o tamanho dos itens medidos por metro, kg ou litro' : undefined}
          >
            Adicionar {itensSelecionados.size > 0 && `(${itensSelecionados.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
