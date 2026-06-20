import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Users, Target, Star, Triangle, UserCheck, MapPin, ArrowRight, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MinimalistLayout } from '@/components/MinimalistLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { NovoClienteMinimalistaModal } from '@/components/clientes/NovoClienteMinimalistaModal';
import { DelegarClienteModal } from '@/components/clientes/DelegarClienteModal';

const META_CR = 500;

type TipoFiltro = '' | 'CR' | 'CE' | 'fidelizado' | 'parceiro';

export default function MeusClientes() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [busca, setBusca] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [delegarCliente, setDelegarCliente] = useState<{ id: string; nome: string } | null>(null);
  const [tipoFiltro, setTipoFiltro] = useState<TipoFiltro>('');

  const { data: clientes, isLoading } = useQuery({
    queryKey: ['meus-clientes', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Buscar IDs dos clientes do vendedor
      const { data: idsData, error: idsError } = await supabase
        .from('clientes')
        .select('id')
        .eq('created_by', user.id)
        .eq('ativo', true);

      if (idsError) throw idsError;
      const ids = idsData?.map(c => c.id) || [];
      if (ids.length === 0) return [];

      // Buscar detalhes dos clientes
      const { data: clientesData, error: clientesError } = await supabase
        .from('clientes')
        .select(`
          id,
          nome,
          telefone,
          email,
          cidade,
          estado,
          created_at,
          cpf_cnpj,
          tipo_cliente,
          fidelizado,
          parceiro
        `)
        .in('id', ids)
        .order('nome', { ascending: true });

      if (clientesError) throw clientesError;

      // Buscar vendas desses clientes
      const { data: vendasData, error: vendasError } = await supabase
        .from('vendas')
        .select('cliente_id, valor_venda')
        .in('cliente_id', ids)
        .not('cliente_id', 'is', null);

      if (vendasError) throw vendasError;

      // Agregar vendas por cliente
      const agg: Record<string, { qtd: number; total: number }> = {};
      vendasData?.forEach((v) => {
        const id = v.cliente_id as string;
        if (!agg[id]) agg[id] = { qtd: 0, total: 0 };
        agg[id].qtd += 1;
        agg[id].total += Number(v.valor_venda || 0);
      });

      return (clientesData || []).map((c) => ({
        ...c,
        qtd_compras: agg[c.id]?.qtd || 0,
        valor_total: agg[c.id]?.total || 0,
      }));
    },
    enabled: !!user?.id
  });

  // Estatísticas
  const stats = useMemo(() => {
    const total = clientes?.length || 0;
    const totalCR = clientes?.filter(c => c.tipo_cliente === 'CR').length || 0;
    const totalFid = clientes?.filter(c => c.fidelizado).length || 0;
    const percentual = META_CR > 0 ? (totalCR / META_CR) * 100 : 0;
    return { total, totalCR, totalFid, percentual };
  }, [clientes]);

  const clientesFiltrados = (clientes || []).filter(cliente => {
    const matchBusca =
      cliente.nome.toLowerCase().includes(busca.toLowerCase()) ||
      cliente.cpf_cnpj?.includes(busca) ||
      cliente.telefone?.includes(busca);
    if (!matchBusca) return false;
    if (!tipoFiltro) return true;
    if (tipoFiltro === 'CR') return cliente.tipo_cliente === 'CR';
    if (tipoFiltro === 'CE') return cliente.tipo_cliente !== 'CR';
    if (tipoFiltro === 'fidelizado') return !!cliente.fidelizado;
    if (tipoFiltro === 'parceiro') return !!cliente.parceiro;
    return true;
  });

  const getIniciais = (nome?: string | null) => {
    if (!nome) return '?';
    return nome.trim().split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('') || '?';
  };

  const getTipoStyle = (isCR: boolean) =>
    isCR
      ? {
          bar: 'from-emerald-400 to-green-500',
          ring: 'ring-emerald-400/40',
          avatarBg: 'bg-gradient-to-br from-emerald-500/30 to-green-700/20',
          iconColor: 'text-emerald-300',
          badgeBg: 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300',
          label: 'CR',
        }
      : {
          bar: 'from-blue-400 to-blue-600',
          ring: 'ring-blue-400/40',
          avatarBg: 'bg-gradient-to-br from-blue-500/30 to-blue-700/20',
          iconColor: 'text-blue-300',
          badgeBg: 'bg-blue-500/15 border-blue-400/30 text-blue-300',
          label: 'CE',
        };

  return (
    <MinimalistLayout 
      title="Meus Clientes" 
      subtitle={`${clientesFiltrados.length} cliente${clientesFiltrados.length !== 1 ? 's' : ''}`}
      breadcrumbItems={[
        { label: "Home", path: "/home" },
        { label: "Vendas", path: "/vendas" },
        { label: "Meus Clientes" }
      ]}
      headerActions={
        <Button 
          onClick={() => setModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Cliente
        </Button>
      }
    >
      {/* Cards de estatísticas */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="relative overflow-hidden rounded-2xl p-4 backdrop-blur-xl border border-blue-400/20 bg-gradient-to-br from-blue-500/15 via-blue-600/5 to-transparent">
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-blue-500/20 blur-2xl" />
          <div className="relative flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white leading-none">{stats.total}</p>
              <p className="text-xs text-blue-200/70 mt-1">Total</p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl p-4 backdrop-blur-xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/15 via-green-600/5 to-transparent">
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-emerald-500/20 blur-2xl" />
          <div className="relative flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
              <Target className="w-5 h-5 text-emerald-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-2xl font-bold text-white leading-none">
                {stats.totalCR}
                <span className="text-sm text-white/40 font-normal">/{META_CR}</span>
              </p>
              <p className="text-xs text-emerald-200/70 mt-1">CR · {stats.percentual.toFixed(1)}%</p>
              <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-green-500 transition-all duration-500"
                  style={{ width: `${Math.min(stats.percentual, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl p-4 backdrop-blur-xl border border-amber-400/20 bg-gradient-to-br from-amber-500/15 via-yellow-600/5 to-transparent">
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-amber-500/20 blur-2xl" />
          <div className="relative flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center">
              <Star className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white leading-none">{stats.totalFid}</p>
              <p className="text-xs text-amber-200/70 mt-1">Fidelizados</p>
            </div>
          </div>
        </div>
      </div>

      {/* Busca */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
        <Input
          placeholder="Buscar por nome, CPF/CNPJ ou telefone..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-10 bg-primary/5 border-primary/10 text-white placeholder:text-white/40"
        />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-6">
        {([
          { value: '', label: 'Todos' },
          { value: 'CR', label: 'CR' },
          { value: 'CE', label: 'CE' },
          { value: 'fidelizado', label: 'Fidelizados' },
          { value: 'parceiro', label: 'Parceiros' },
        ] as { value: TipoFiltro; label: string }[]).map(opt => (
          <button
            key={opt.value}
            onClick={() => setTipoFiltro(opt.value)}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
              tipoFiltro === opt.value
                ? 'bg-blue-500 text-white'
                : 'bg-primary/5 text-white/70 hover:bg-primary/10'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Lista de clientes */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 bg-white/5" />
          ))
        ) : clientesFiltrados.length > 0 ? (
          clientesFiltrados.map((cliente) => {
            const isCR = cliente.tipo_cliente === 'CR';
            const s = getTipoStyle(isCR);

            return (
              <div
                key={cliente.id}
                onClick={() => navigate(`/vendas/meus-clientes/${cliente.id}`)}
                className="group relative flex items-center gap-4 pl-3 pr-4 py-3 rounded-full border border-white/10 bg-white/5 backdrop-blur-xl cursor-pointer transition-all duration-300 hover:bg-white/10 hover:border-white/20"
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div className={`w-11 h-11 rounded-full ${s.avatarBg} ring-2 ${s.ring} flex items-center justify-center font-bold text-white text-sm shadow-lg`}>
                    {getIniciais(cliente.nome)}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center">
                    {isCR ? (
                      <Target className={`w-3 h-3 ${s.iconColor}`} />
                    ) : (
                      <Users className={`w-3 h-3 ${s.iconColor}`} />
                    )}
                  </div>
                </div>

                {/* Nome + cpf */}
                <div className="min-w-0 w-44 sm:w-52">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-white font-semibold truncate text-sm">{cliente.nome}</h4>
                    {cliente.fidelizado && <Star className="h-3 w-3 text-amber-400 fill-amber-400 shrink-0" />}
                    {cliente.parceiro && <Triangle className="h-3 w-3 text-purple-400 fill-purple-400 shrink-0" />}
                  </div>
                  <p className="text-[11px] text-white/50 truncate font-mono">
                    {cliente.cpf_cnpj || (cliente.telefone ?? '—')}
                  </p>
                </div>

                {/* Localização */}
                {(cliente.cidade || cliente.estado) && (
                  <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
                    <MapPin className={`w-3.5 h-3.5 ${s.iconColor}`} />
                    <span className="text-white/90 font-semibold text-sm truncate max-w-[160px]">
                      {[cliente.cidade, cliente.estado].filter(Boolean).join(' - ')}
                    </span>
                  </div>
                )}

                {/* Barra */}
                <div className="flex-1 min-w-0">
                  <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${s.bar} transition-all duration-500`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                {/* Badge tipo */}
                <div className={`relative flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${s.badgeBg}`}>
                  {isCR ? <Target className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
                  <span className="text-xs font-bold">{s.label}</span>
                </div>

                {/* Delegar */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDelegarCliente({ id: cliente.id, nome: cliente.nome });
                  }}
                  title="Delegar cliente"
                  className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition"
                >
                  <UserCheck className="w-4 h-4" />
                </button>

                <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-white/60 transition-colors flex-shrink-0" />
              </div>
            );
          })
        ) : (
          <div className="text-center py-12">
            <UserPlus className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/60">
              {busca || tipoFiltro ? 'Nenhum cliente encontrado' : 'Você ainda não tem clientes'}
            </p>
            <Button
              onClick={() => setModalOpen(true)}
              variant="outline"
              className="mt-4 border-white/20 text-white hover:bg-white/10"
            >
              <Plus className="w-4 h-4 mr-2" />
              Cadastrar cliente
            </Button>
          </div>
        )}
      </div>

      {/* Modal de novo cliente */}
      <NovoClienteMinimalistaModal 
        open={modalOpen} 
        onOpenChange={setModalOpen}
      />

      {delegarCliente && (
        <DelegarClienteModal
          open={!!delegarCliente}
          onOpenChange={(open) => !open && setDelegarCliente(null)}
          clienteId={delegarCliente.id}
          clienteNome={delegarCliente.nome}
        />
      )}
    </MinimalistLayout>
  );
}
