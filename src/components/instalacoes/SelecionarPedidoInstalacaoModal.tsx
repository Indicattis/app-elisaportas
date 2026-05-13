import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Package, MapPin, Calendar as CalendarIcon, Loader2, Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface PedidoDisponivel {
  id: string;
  numero_pedido: string;
  etapa_atual: string;
  venda: {
    id: string;
    cliente_nome: string;
    cliente_telefone: string | null;
    cidade: string | null;
    estado: string | null;
    data_prevista_entrega: string | null;
  };
}

interface SelecionarPedidoInstalacaoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataSelecionada: Date;
  onPedidoSelecionado?: () => void;
}

export function SelecionarPedidoInstalacaoModal({
  open,
  onOpenChange,
  dataSelecionada,
  onPedidoSelecionado
}: SelecionarPedidoInstalacaoModalProps) {
  const [pedidos, setPedidos] = useState<PedidoDisponivel[]>([]);
  const [loading, setLoading] = useState(true);
  const [criandoInstalacao, setCriandoInstalacao] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dataEscolhida, setDataEscolhida] = useState<Date>(dataSelecionada);

  useEffect(() => {
    if (open) {
      fetchPedidosDisponiveis();
      setSearchTerm('');
      setDataEscolhida(dataSelecionada);
    }
  }, [open]);

  const fetchPedidosDisponiveis = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('pedidos_producao')
        .select(`
          id,
          numero_pedido,
          etapa_atual,
          vendas!inner (
            id,
            cliente_nome,
            cliente_telefone,
            cidade,
            estado,
            data_prevista_entrega
          )
        `)
        .eq('etapa_atual', 'expedicao_instalacao')
        .order('numero_pedido', { ascending: false });

      if (error) throw error;

      // Buscar instalações existentes COM DATA para filtrar apenas pedidos já agendados
      const { data: instalacoesExistentes } = await supabase
        .from('instalacoes')
        .select('pedido_id')
        .not('pedido_id', 'is', null)
        .not('data_instalacao', 'is', null);

      const pedidosComInstalacao = new Set(
        instalacoesExistentes?.map(i => i.pedido_id) || []
      );

      const pedidosFormatados: PedidoDisponivel[] = (data || [])
        .filter(p => !pedidosComInstalacao.has(p.id))
        .map(p => ({
          id: p.id,
          numero_pedido: p.numero_pedido,
          etapa_atual: p.etapa_atual,
          venda: Array.isArray(p.vendas) ? p.vendas[0] : p.vendas
        }));

      setPedidos(pedidosFormatados);
    } catch (error) {
      console.error('Erro ao buscar pedidos disponíveis:', error);
      toast.error('Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  };

  const handleSelecionarPedido = async (pedido: PedidoDisponivel) => {
    try {
      setCriandoInstalacao(true);

      // Formatar data no formato YYYY-MM-DD
      const dataFormatada = format(dataEscolhida, 'yyyy-MM-dd');

      // Criar instalação vinculada ao pedido
      const { error: insertError } = await supabase
        .from('instalacoes')
        .insert({
          pedido_id: pedido.id,
          venda_id: pedido.venda.id,
          nome_cliente: pedido.venda.cliente_nome,
          telefone_cliente: pedido.venda.cliente_telefone,
          cidade: pedido.venda.cidade || '',
          estado: pedido.venda.estado || '',
          data_instalacao: dataFormatada,
          hora: '08:00',
          produto: '',
          status: 'pronta_fabrica',
          tipo_instalacao: null,
          responsavel_instalacao_id: null,
          responsavel_instalacao_nome: null
        });

      if (insertError) throw insertError;

      // Atualizar data_producao do pedido (data de carregamento)
      const { error: updateError } = await supabase
        .from('pedidos_producao')
        .update({ data_producao: dataFormatada })
        .eq('id', pedido.id);

      if (updateError) throw updateError;

      toast.success('Instalação criada com sucesso!');
      onOpenChange(false);
      onPedidoSelecionado?.();
    } catch (error) {
      console.error('Erro ao criar instalação:', error);
      toast.error('Erro ao criar instalação');
    } finally {
      setCriandoInstalacao(false);
    }
  };

  // Filtrar pedidos por busca
  const pedidosFiltrados = pedidos.filter(pedido => {
    const searchLower = searchTerm.toLowerCase();
    return (
      pedido.numero_pedido.toLowerCase().includes(searchLower) ||
      pedido.venda.cliente_nome.toLowerCase().includes(searchLower) ||
      pedido.venda.cidade?.toLowerCase().includes(searchLower) ||
      pedido.venda.estado?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-slate-950/80 backdrop-blur-xl border-white/10 text-white shadow-[0_0_0_1px_rgba(96,165,250,0.15),0_20px_60px_-20px_rgba(0,0,0,0.8)]">
        <DialogHeader>
          <DialogTitle>Selecionar Pedido para Instalação</DialogTitle>
          <DialogDescription>
            Escolha a data e selecione o pedido para agendar
          </DialogDescription>
        </DialogHeader>

        {/* Date picker */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Data:</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[220px] justify-start text-left font-normal",
                  !dataEscolhida && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(dataEscolhida, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dataEscolhida}
                onSelect={(date) => date && setDataEscolhida(date)}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Barra de pesquisa */}
        {!loading && pedidos.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por pedido, cliente ou localização..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : pedidos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum pedido disponível para instalação
          </div>
        ) : pedidosFiltrados.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum pedido encontrado com "{searchTerm}"
          </div>
        ) : (
          <ScrollArea className="max-h-[500px] pr-4">
            <div className="space-y-3">
              {pedidosFiltrados.map((pedido) => (
                <Card key={pedido.id} className="hover:border-primary transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                         <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">{pedido.numero_pedido}</span>

                          <span className="text-xs text-muted-foreground">
                            (Expedição Instalação)
                          </span>
                        </div>
                        
                        <div className="text-sm">
                          <strong>Cliente:</strong> {pedido.venda.cliente_nome}
                        </div>
                        
                        {(pedido.venda.cidade || pedido.venda.estado) && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {pedido.venda.cidade && <span>{pedido.venda.cidade}</span>}
                            {pedido.venda.cidade && pedido.venda.estado && <span>-</span>}
                            {pedido.venda.estado && <span>{pedido.venda.estado}</span>}
                          </div>
                        )}

                        {pedido.venda.data_prevista_entrega && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>Entrega prevista: {format(new Date(pedido.venda.data_prevista_entrega), 'dd/MM/yyyy')}</span>
                          </div>
                        )}
                      </div>

                      <Button
                        onClick={() => handleSelecionarPedido(pedido)}
                        disabled={criandoInstalacao}
                        size="sm"
                      >
                        {criandoInstalacao ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Selecionar'
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
