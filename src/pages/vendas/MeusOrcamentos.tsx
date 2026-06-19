import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, FileText, Clock, CheckCircle, XCircle, AlertCircle, FileSignature } from 'lucide-react';
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
      {/* Cards de estatísticas */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 backdrop-blur-xl text-center">
          <Clock className="w-5 h-5 text-blue-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{pendentes}</p>
          <p className="text-xs text-white/60">Pendentes</p>
        </div>
        <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 backdrop-blur-xl text-center">
          <CheckCircle className="w-5 h-5 text-green-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{aprovados}</p>
          <p className="text-xs text-white/60">Aprovados</p>
        </div>
        <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 backdrop-blur-xl text-center">
          <XCircle className="w-5 h-5 text-red-400 mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{reprovados}</p>
          <p className="text-xs text-white/60">Reprovados</p>
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
            
            return (
              <div
                key={orcamento.id}
                onClick={() => navigate(`/vendas/meus-orcamentos/${orcamento.id}`)}
                className="bg-primary/5 border border-primary/10 rounded-xl p-4 backdrop-blur-xl
                           hover:bg-primary/10 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <StatusIcon className={`w-4 h-4 ${statusInfo.color.split(' ')[1]}`} />
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <h3 className="text-white font-medium">{orcamento.cliente_nome || 'Cliente não informado'}</h3>
                    <p className="text-sm text-white/60">
                      {format(new Date(orcamento.created_at), "dd 'de' MMMM", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-lg font-bold text-white">
                        {formatCurrency(orcamento.valor_total || 0)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setContratoOrcamentoId(orcamento.id); }}
                      title="Contratos do orçamento"
                      className="relative p-2 rounded-lg bg-white/5 hover:bg-blue-500/20 border border-white/10 text-white/70 hover:text-white transition-colors"
                    >
                      <FileSignature className="w-4 h-4" />
                      {!!contratosCountMap?.[orcamento.id] && (
                        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-blue-500 text-white text-[10px] font-semibold flex items-center justify-center">
                          {contratosCountMap[orcamento.id]}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
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
