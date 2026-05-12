import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProdutoVenda } from '@/hooks/useVendas';
import { MinimalistLayout } from '@/components/MinimalistLayout';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Package, AlertTriangle, Lock, Loader2, FileText } from 'lucide-react';
import { ProdutoVendaForm } from '@/components/vendas/ProdutoVendaForm';
import { ProdutosVendaTable } from '@/components/vendas/ProdutosVendaTable';
import { SelecionarAcessoriosModal } from '@/components/vendas/SelecionarAcessoriosModal';
import { useConfiguracoesVendas } from '@/hooks/useConfiguracoesVendas';
import { useCriarPedidoCorrecaoCompleto } from '@/hooks/useCriarPedidoCorrecaoCompleto';
import { formatarNumeroPedidoMensal } from '@/utils/pedidoFormatters';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

// Styles matching VendaNovaMinimalista
const sectionWrapperClass = "p-1.5 rounded-xl bg-gradient-to-br from-purple-500/5 to-purple-900/10 backdrop-blur-xl border border-purple-500/20";
const inputClass = "h-10 bg-purple-500/5 border-purple-500/20 text-foreground placeholder:text-muted-foreground/50 rounded-lg focus:border-purple-400 focus:ring-2 focus:ring-purple-500/30 focus:bg-purple-500/10 transition-all";
const textareaClass = "bg-purple-500/5 border-purple-500/20 text-foreground placeholder:text-muted-foreground/50 rounded-lg focus:border-purple-400 focus:ring-2 focus:ring-purple-500/30 focus:bg-purple-500/10 transition-all resize-none";

const Section = ({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) => (
  <div className={sectionWrapperClass}>
    <div className="px-4 py-3 border-b border-purple-500/10 bg-gradient-to-r from-purple-500/10 to-transparent">
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 shadow-lg shadow-purple-500/30">
          <Icon className="w-4 h-4 text-white" />
        </div>
        <h3 className="text-sm font-semibold text-purple-200 tracking-wide">{title}</h3>
      </div>
    </div>
    <div className="p-4">{children}</div>
  </div>
);

const ProductButton = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="group flex items-center gap-2 h-10 px-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-purple-600/5 border border-purple-500/25 text-purple-200 hover:from-purple-500/20 hover:to-purple-600/10 hover:text-white hover:border-purple-400/40 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-200"
  >
    <Plus className="w-4 h-4 text-purple-400 group-hover:text-purple-300" />
    <span className="text-sm font-medium">{label}</span>
  </button>
);

interface PedidoBusca {
  id: string;
  numero_pedido: string;
  numero_mes: number | null;
  mes_vigencia: string | null;
  cliente_nome: string | null;
  venda_id: string | null;
}

export default function PedidoCorrecaoNovo() {
  const navigate = useNavigate();
  const { verificarSenhaMaster } = useConfiguracoesVendas();
  const { criarPedidoCorrecao, isLoading: isCriando } = useCriarPedidoCorrecaoCompleto();

  // States
  const [buscaPedido, setBuscaPedido] = useState('');
  const [pedidoSelecionado, setPedidoSelecionado] = useState<PedidoBusca | null>(null);
  const [showResultados, setShowResultados] = useState(false);
  const [produtos, setProdutos] = useState<ProdutoVenda[]>([]);
  const [observacoes, setObservacoes] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [acessoriosOpen, setAcessoriosOpen] = useState(false);
  const [tipoInicial, setTipoInicial] = useState<'porta_enrolar' | 'porta_social' | 'pintura_epoxi' | 'acessorio' | 'adicional' | 'manutencao'>('porta_enrolar');
  const [produtoEditando, setProdutoEditando] = useState<ProdutoVenda | undefined>();
  const [indexEditando, setIndexEditando] = useState<number | undefined>();
  const [showSenhaModal, setShowSenhaModal] = useState(false);
  const [senhaMaster, setSenhaMaster] = useState('');
  const [senhaErro, setSenhaErro] = useState('');

  // Buscar pedidos
  const { data: pedidosResultado = [] } = useQuery({
    queryKey: ['pedidos-busca-correcao', buscaPedido],
    enabled: buscaPedido.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pedidos_producao')
        .select('id, numero_pedido, numero_mes, mes_vigencia, cliente_nome, venda_id')
        .or(`cliente_nome.ilike.%${buscaPedido}%,numero_pedido.ilike.%${buscaPedido}%`)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data || []) as PedidoBusca[];
    },
  });

  const handleSelecionarPedido = (pedido: PedidoBusca) => {
    setPedidoSelecionado(pedido);
    setBuscaPedido('');
    setShowResultados(false);
  };

  const handleAddProduto = (produto: ProdutoVenda) => {
    if (indexEditando !== undefined) {
      const novosProdutos = [...produtos];
      novosProdutos[indexEditando] = produto;
      setProdutos(novosProdutos);
    } else {
      setProdutos([...produtos, produto]);
    }
    setProdutoEditando(undefined);
    setIndexEditando(undefined);
    setDialogOpen(false);
  };

  const handleRemoveProduto = (index: number) => {
    setProdutos(produtos.filter((_, i) => i !== index));
  };

  const handleEditProduto = (index: number) => {
    setProdutoEditando(produtos[index]);
    setIndexEditando(index);
    setDialogOpen(true);
  };

  const handleAddAcessorios = (novos: ProdutoVenda[]) => {
    setProdutos([...produtos, ...novos]);
    setAcessoriosOpen(false);
  };

  const handleOpenForm = (tipo: typeof tipoInicial) => {
    setTipoInicial(tipo);
    setProdutoEditando(undefined);
    setIndexEditando(undefined);
    setDialogOpen(true);
  };

  const handleCriar = () => {
    if (!pedidoSelecionado) {
      toast.error('Selecione um pedido de referência');
      return;
    }
    if (produtos.length === 0) {
      toast.error('Adicione pelo menos um produto');
      return;
    }
    setShowSenhaModal(true);
    setSenhaMaster('');
    setSenhaErro('');
  };

  const handleConfirmarSenha = async () => {
    if (!senhaMaster.trim()) {
      setSenhaErro('Informe a senha master');
      return;
    }
    const senhaOk = await verificarSenhaMaster(senhaMaster);
    if (!senhaOk) {
      setSenhaErro('Senha master incorreta');
      return;
    }
    setShowSenhaModal(false);

    const novoId = await criarPedidoCorrecao(pedidoSelecionado!.id, produtos, observacoes || undefined);
    if (novoId) {
      navigate(`/dashboard/pedido/${novoId}/view`);
    }
  };

  const numeroPedidoFormatado = pedidoSelecionado
    ? formatarNumeroPedidoMensal(pedidoSelecionado.numero_mes, pedidoSelecionado.mes_vigencia, pedidoSelecionado.numero_pedido)
    : '';

  return (
    <MinimalistLayout
      title="Pedido de Correção"
      subtitle="Crie um pedido de correção vinculado a um pedido existente"
      breadcrumbItems={[
        { label: "Home", path: "/home" },
        { label: "Vendas", path: "/vendas" },
        { label: "Minhas Vendas", path: "/vendas/minhas-vendas" },
        { label: "Pedido de Correção" },
      ]}
    >
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Seletor de Pedido Referência */}
        <div className="relative z-20">
          <Section title="Pedido de Referência" icon={Search}>
            {pedidoSelecionado ? (
              <div className="flex items-center justify-between bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                <div>
                  <p className="text-sm font-semibold text-purple-300">
                    Pedido: <span className="text-purple-200">{numeroPedidoFormatado}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">{pedidoSelecionado.cliente_nome || 'Sem cliente'}</p>
                </div>
                <button
                  onClick={() => setPedidoSelecionado(null)}
                  className="text-xs text-purple-400 hover:text-purple-300 underline transition-colors"
                >
                  Alterar
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className={cn(inputClass, "pl-10")}
                  placeholder="Busque por número do pedido ou nome do cliente..."
                  value={buscaPedido}
                  onChange={(e) => {
                    setBuscaPedido(e.target.value);
                    setShowResultados(true);
                  }}
                  onFocus={() => setShowResultados(true)}
                />
                {showResultados && pedidosResultado.length > 0 && (
                  <div className="absolute z-50 top-full mt-1 w-full rounded-lg border border-purple-500/30 bg-background/95 backdrop-blur-xl shadow-xl max-h-60 overflow-auto">
                    {pedidosResultado.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleSelecionarPedido(p)}
                        className="w-full text-left px-4 py-3 hover:bg-purple-500/10 transition-colors border-b border-border/50 last:border-0"
                      >
                        <p className="text-sm font-medium text-foreground">
                          {formatarNumeroPedidoMensal(p.numero_mes, p.mes_vigencia, p.numero_pedido)}
                        </p>
                        <p className="text-xs text-muted-foreground">{p.cliente_nome || 'Sem cliente'}</p>
                      </button>
                    ))}
                  </div>
                )}
                {showResultados && buscaPedido.length >= 2 && pedidosResultado.length === 0 && (
                  <div className="absolute z-50 top-full mt-1 w-full rounded-lg border border-border bg-background/95 backdrop-blur-xl shadow-xl p-4 text-center text-sm text-muted-foreground">
                    Nenhum pedido encontrado
                  </div>
                )}
              </div>
            )}
          </Section>
        </div>

        {/* Produtos */}
        <Section title="Produtos da Correção" icon={Package}>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <ProductButton label="Porta de Enrolar" onClick={() => handleOpenForm('porta_enrolar')} />
              <ProductButton label="Porta Social" onClick={() => handleOpenForm('porta_social')} />
              <ProductButton label="Pintura" onClick={() => handleOpenForm('pintura_epoxi')} />
              <ProductButton label="Acessórios" onClick={() => setAcessoriosOpen(true)} />
              <ProductButton label="Manutenção" onClick={() => handleOpenForm('manutencao')} />
            </div>

            <ProdutosVendaTable
              produtos={produtos}
              onRemoveProduto={handleRemoveProduto}
              onEditProduto={handleEditProduto}
              onUpdateQuantidade={(index, quantidade) => {
                const novosProdutos = [...produtos];
                novosProdutos[index] = { ...novosProdutos[index], quantidade };
                setProdutos(novosProdutos);
              }}
            />
          </div>
        </Section>

        {/* Observações */}
        <Section title="Observações" icon={FileText}>
          <Textarea
            className={textareaClass}
            placeholder="Descreva o motivo da correção e detalhes relevantes..."
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            rows={4}
          />
        </Section>

        {/* Botão de criação */}
        <div className="flex justify-end">
          <button
            onClick={handleCriar}
            disabled={isCriando || !pedidoSelecionado || produtos.length === 0}
            className="h-12 px-8 rounded-lg font-semibold text-white border
              bg-gradient-to-r from-purple-500 to-purple-700 border-purple-400/30
              shadow-lg shadow-purple-500/30
              hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/40
              transition-all duration-200 flex items-center gap-2
              disabled:opacity-50 disabled:hover:scale-100"
          >
            {isCriando ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <AlertTriangle className="w-5 h-5" />
                Criar Pedido de Correção
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modals */}
      <ProdutoVendaForm
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onAddProduto={handleAddProduto}
        produtoEditando={produtoEditando}
        indexEditando={indexEditando}
        tipoInicial={tipoInicial}
      />

      <SelecionarAcessoriosModal
        open={acessoriosOpen}
        onOpenChange={setAcessoriosOpen}
        onConfirm={handleAddAcessorios}
      />

      {/* Modal Senha Master */}
      <Dialog open={showSenhaModal} onOpenChange={setShowSenhaModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-purple-500" />
              Senha Master
            </DialogTitle>
            <DialogDescription>
              Insira a senha master para autorizar a criação do pedido de correção.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              type="password"
              placeholder="Senha master..."
              value={senhaMaster}
              onChange={(e) => {
                setSenhaMaster(e.target.value);
                setSenhaErro('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleConfirmarSenha()}
              autoFocus
            />
            {senhaErro && (
              <p className="text-sm text-destructive">{senhaErro}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSenhaModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmarSenha}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MinimalistLayout>
  );
}
