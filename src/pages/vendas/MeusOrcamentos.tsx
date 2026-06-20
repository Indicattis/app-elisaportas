import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, FileText, Clock, CheckCircle, XCircle, AlertCircle, FileSignature, ArrowRight, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MinimalistLayout } from '@/components/MinimalistLayout';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ContratosOrcamentoModal } from '@/components/vendas/ContratosOrcamentoModal';

export default function MeusOrcamentos() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mesAtual] = useState(new Date());
  const [statusFiltro, setStatusFiltro] = useState<string>('');
  const [contratoOrcamentoId, setContratoOrcamentoId] = useState<string | null>(null);

  const inicioMes = startOfMonth(mesAtual);
  const fimMes = endOfMonth(mesAtual);

  const { data: orcamentos, isLoading } = useQuery({
    queryKey: ['meus-orcamentos', user?.id, format(mesAtual, 'yyyy-MM')],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('orcamentos')
        .select(`
          id,
          created_at,
          status,
          valor_total,
          cliente_nome,
          requer_analise
        `)
        .eq('atendente_id', user.id)
        .gte('created_at', inicioMes.toISOString())
        .lte('created_at', fimMes.toISOString())
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  const orcamentoIds = (orcamentos || []).map(o => o.id);
  const { data: contratosCountMap } = useQuery({
    queryKey: ['contratos-orcamentos-counts', orcamentoIds],
    queryFn: async () => {
      if (orcamentoIds.length === 0) return {} as Record<string, number>;
      const { data, error } = await supabase
        .from('contratos_orcamentos')
        .select('orcamento_id')
        .in('orcamento_id', orcamentoIds);
      if (error) throw error;
      const map: Record<string, number> = {};
      (data || []).forEach((r: any) => { map[r.orcamento_id] = (map[r.orcamento_id] || 0) + 1; });
      return map;
    },
    enabled: orcamentoIds.length > 0,
  });

  const orcamentosFiltrados = orcamentos?.filter(orc => 
    !statusFiltro || orc.status === statusFiltro
  ) || [];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStatusInfo = (status: string, requerAnalise: boolean) => {
    if (status === 'pendente' && requerAnalise) {
      return { 
        icon: AlertCircle, 
        label: 'Aguardando Análise', 
        color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' 
      };
    }
    
    switch (status) {
      case 'aprovado':
        return { 
          icon: CheckCircle, 
          label: 'Aprovado', 
          color: 'bg-green-500/20 text-green-400 border-green-500/30' 
        };
      case 'reprovado':
        return { 
          icon: XCircle, 
          label: 'Reprovado', 
          color: 'bg-red-500/20 text-red-400 border-red-500/30' 
        };
      case 'pendente':
        return { 
          icon: Clock, 
          label: 'Pendente', 
          color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' 
        };
      default:
        return { 
          icon: FileText, 
          label: status, 
          color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' 
        };
    }
  };

  const statusOptions = [
    { value: '', label: 'Todos' },
    { value: 'pendente', label: 'Pendentes' },
    { value: 'aprovado', label: 'Aprovados' },
    { value: 'reprovado', label: 'Reprovados' }
  ];

  // Contadores
  const pendentes = orcamentos?.filter(o => o.status === 'pendente').length || 0;
  const aprovados = orcamentos?.filter(o => o.status === 'aprovado').length || 0;
  const reprovados = orcamentos?.filter(o => o.status === 'reprovado').length || 0;

  const maxValor = Math.max(1, ...(orcamentos?.map(o => Number(o.valor_total) || 0) || [0]));

  const getStatusStyle = (status: string, requerAnalise: boolean) => {
    if (status === 'pendente' && requerAnalise) {
      return {
        bar: 'from-amber-400 to-yellow-500',
        ring: 'ring-amber-400/40',
        avatarBg: 'bg-gradient-to-br from-amber-500/30 to-yellow-600/20',
        iconColor: 'text-amber-300',
        badgeBg: 'bg-amber-500/15 border-amber-400/30 text-amber-300',
      };
    }
    switch (status) {
      case 'aprovado':
        return {
          bar: 'from-emerald-400 to-green-500',
          ring: 'ring-emerald-400/40',
          avatarBg: 'bg-gradient-to-br from-emerald-500/30 to-green-600/20',
          iconColor: 'text-emerald-300',
          badgeBg: 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300',
        };
      case 'reprovado':
        return {
          bar: 'from-rose-400 to-red-500',
          ring: 'ring-rose-400/40',
          avatarBg: 'bg-gradient-to-br from-rose-500/30 to-red-600/20',
          iconColor: 'text-rose-300',
          badgeBg: 'bg-rose-500/15 border-rose-400/30 text-rose-300',
        };
      case 'pendente':
        return {
          bar: 'from-blue-400 to-blue-600',
          ring: 'ring-blue-400/40',
          avatarBg: 'bg-gradient-to-br from-blue-500/30 to-blue-700/20',
          iconColor: 'text-blue-300',
          badgeBg: 'bg-blue-500/15 border-blue-400/30 text-blue-300',
        };
      default:
        return {
          bar: 'from-slate-400 to-slate-500',
          ring: 'ring-white/20',
          avatarBg: 'bg-white/10',
          iconColor: 'text-white/70',
          badgeBg: 'bg-white/10 border-white/15 text-white/70',
        };
    }
  };

  const getIniciais = (nome?: string | null) => {
    if (!nome) return '?';
    return nome.trim().split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('') || '?';
  };

  return (
    <MinimalistLayout 
      title="Meus Orçamentos" 
      subtitle={format(mesAtual, "MMMM 'de' yyyy", { locale: ptBR })}
      breadcrumbItems={[
        { label: "Home", path: "/home" },
        { label: "Vendas", path: "/vendas" },
        { label: "Meus Orçamentos" }
      ]}
      headerActions={
        <Button 
          onClick={() => navigate('/vendas/meus-orcamentos/novo')}
          className="bg-blue-600 hover:bg-blue-700"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Orçamento
        </Button>
      }
    >
      {/* Cards de estatísticas (índices coloridos) */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="relative overflow-hidden rounded-2xl p-4 backdrop-blur-xl border border-blue-400/20 bg-gradient-to-br from-blue-500/15 via-blue-600/5 to-transparent">
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-blue-500/20 blur-2xl" />
          <div className="relative flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white leading-none">{pendentes}</p>
              <p className="text-xs text-blue-200/70 mt-1">Pendentes</p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl p-4 backdrop-blur-xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/15 via-green-600/5 to-transparent">
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-emerald-500/20 blur-2xl" />
          <div className="relative flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white leading-none">{aprovados}</p>
              <p className="text-xs text-emerald-200/70 mt-1">Aprovados</p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl p-4 backdrop-blur-xl border border-rose-400/20 bg-gradient-to-br from-rose-500/15 via-red-600/5 to-transparent">
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-rose-500/20 blur-2xl" />
          <div className="relative flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-rose-300" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white leading-none">{reprovados}</p>
              <p className="text-xs text-rose-200/70 mt-1">Reprovados</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtro por status */}
      <div className="flex flex-wrap gap-2 mb-6">
        {statusOptions.map(opt => (
          <button
            key={opt.value}
            onClick={() => setStatusFiltro(opt.value)}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
              statusFiltro === opt.value 
                ? 'bg-blue-500 text-white' 
                : 'bg-primary/5 text-white/70 hover:bg-primary/10'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Lista de orçamentos */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 bg-white/5" />
          ))
        ) : orcamentosFiltrados.length > 0 ? (
          orcamentosFiltrados.map((orcamento) => {
            const statusInfo = getStatusInfo(orcamento.status, orcamento.requer_analise);
            const StatusIcon = statusInfo.icon;
            const s = getStatusStyle(orcamento.status, orcamento.requer_analise);
            const valor = Number(orcamento.valor_total) || 0;
            const percent = Math.min(100, Math.max(4, (valor / maxValor) * 100));
            const contratos = contratosCountMap?.[orcamento.id] || 0;

            return (
              <div
                key={orcamento.id}
                onClick={() => navigate(`/vendas/meus-orcamentos/${orcamento.id}`)}
                className="group relative flex items-center gap-4 pl-3 pr-4 py-3 rounded-full border border-white/10 bg-white/5 backdrop-blur-xl cursor-pointer transition-all duration-300 hover:bg-white/10 hover:border-white/20"
              >
                {/* Avatar com inicial + status icon */}
                <div className="relative flex-shrink-0">
                  <div className={`w-11 h-11 rounded-full ${s.avatarBg} ring-2 ${s.ring} flex items-center justify-center font-bold text-white text-sm shadow-lg`}>
                    {getIniciais(orcamento.cliente_nome)}
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center`}>
                    <StatusIcon className={`w-3 h-3 ${s.iconColor}`} />
                  </div>
                </div>

                {/* Nome + data */}
                <div className="min-w-0 w-44 sm:w-52">
                  <h4 className="text-white font-semibold truncate text-sm">
                    {orcamento.cliente_nome || 'Cliente não informado'}
                  </h4>
                  <p className="text-[11px] text-white/50 truncate">
                    {format(new Date(orcamento.created_at), "dd 'de' MMM", { locale: ptBR })} · {statusInfo.label}
                  </p>
                </div>

                {/* Valor */}
                <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
                  <DollarSign className={`w-3.5 h-3.5 ${s.iconColor}`} />
                  <span className="text-white/90 font-semibold text-sm tabular-nums">
                    {formatCurrency(valor)}
                  </span>
                </div>

                {/* Barra proporcional ao valor */}
                <div className="flex-1 min-w-0">
                  <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${s.bar} transition-all duration-500`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                {/* Badge de contratos */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setContratoOrcamentoId(orcamento.id); }}
                  title="Contratos do orçamento"
                  className={`relative flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${s.badgeBg} hover:brightness-125 transition`}
                >
                  <FileSignature className="w-3.5 h-3.5" />
                  <span className="text-xs font-bold tabular-nums">{contratos}</span>
                </button>

                <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-white/60 transition-colors flex-shrink-0" />
              </div>
            );
          })
        ) : (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/60">Nenhum orçamento encontrado neste mês</p>
            <Button 
              onClick={() => navigate('/vendas/meus-orcamentos/novo')}
              variant="outline"
              className="mt-4 border-white/20 text-white hover:bg-white/10"
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar primeiro orçamento
            </Button>
          </div>
        )}
      </div>

      {contratoOrcamentoId && (
        <ContratosOrcamentoModal
          open={!!contratoOrcamentoId}
          onOpenChange={(o) => { if (!o) setContratoOrcamentoId(null); }}
          orcamentoId={contratoOrcamentoId}
        />
      )}
    </MinimalistLayout>
  );
}
