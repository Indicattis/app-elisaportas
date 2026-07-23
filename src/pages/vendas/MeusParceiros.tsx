import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Handshake, Building2, Users, Store, MapPin, Phone, ArrowRight, UserCheck, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MinimalistLayout } from '@/components/MinimalistLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { TIPO_PARCEIRO_LABELS, getEtapasByTipo, getCurrentEtapa } from '@/utils/parceiros';
import { TransferirParceiroModal } from '@/components/parceiros/TransferirParceiroModal';
import { RepresentanteFormDialog } from '@/components/parceiros/RepresentanteFormDialog';

type TipoParceiro = 'autorizado' | 'representante' | 'franqueado';

export default function MeusParceiros() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tipoFiltro, setTipoFiltro] = useState<TipoParceiro | ''>('');
  const [transferirParceiro, setTransferirParceiro] = useState<{ id: string; nome: string } | null>(null);
  const [cadastrarRepOpen, setCadastrarRepOpen] = useState(false);

  const { data: parceiros, isLoading } = useQuery({
    queryKey: ['meus-parceiros', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // Primeiro buscar o admin_user para obter o id
      const { data: adminUser, error: adminError } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (adminError || !adminUser) return [];
      
      const { data, error } = await supabase
        .from('autorizados')
        .select(`
          id,
          nome,
          tipo_parceiro,
          cidade,
          estado,
          telefone,
          email,
          etapa,
          representante_etapa,
          franqueado_etapa
        `)
        .eq('vendedor_id', adminUser.id)
        .eq('ativo', true)
        .order('nome', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  const parceirosFiltrados = parceiros?.filter(p => 
    !tipoFiltro || p.tipo_parceiro === tipoFiltro
  ) || [];

  const getTipoIcon = (tipo: TipoParceiro) => {
    switch (tipo) {
      case 'autorizado': return Store;
      case 'representante': return Users;
      case 'franqueado': return Building2;
      default: return Handshake;
    }
  };

  const getTipoStyle = (tipo: TipoParceiro) => {
    switch (tipo) {
      case 'autorizado':
        return {
          bar: 'from-blue-400 to-blue-600',
          ring: 'ring-blue-400/40',
          avatarBg: 'bg-gradient-to-br from-blue-500/30 to-blue-700/20',
          iconColor: 'text-blue-300',
          badgeBg: 'bg-blue-500/15 border-blue-400/30 text-blue-300',
        };
      case 'representante':
        return {
          bar: 'from-purple-400 to-purple-600',
          ring: 'ring-purple-400/40',
          avatarBg: 'bg-gradient-to-br from-purple-500/30 to-purple-700/20',
          iconColor: 'text-purple-300',
          badgeBg: 'bg-purple-500/15 border-purple-400/30 text-purple-300',
        };
      case 'franqueado':
        return {
          bar: 'from-emerald-400 to-green-500',
          ring: 'ring-emerald-400/40',
          avatarBg: 'bg-gradient-to-br from-emerald-500/30 to-green-600/20',
          iconColor: 'text-emerald-300',
          badgeBg: 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300',
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

  // Contadores por tipo
  const autorizados = parceiros?.filter(p => p.tipo_parceiro === 'autorizado').length || 0;
  const representantes = parceiros?.filter(p => p.tipo_parceiro === 'representante').length || 0;
  const franqueados = parceiros?.filter(p => p.tipo_parceiro === 'franqueado').length || 0;

  const totalParceiros = parceiros?.length || 1;
  const countByTipo = (tipo: TipoParceiro) =>
    parceiros?.filter(p => p.tipo_parceiro === tipo).length || 0;

  return (
    <MinimalistLayout 
      title="Meus Parceiros" 
      subtitle={`${parceirosFiltrados.length} parceiro${parceirosFiltrados.length !== 1 ? 's' : ''}`}
      breadcrumbItems={[
        { label: "Home", path: "/home" },
        { label: "Vendas", path: "/vendas" },
        { label: "Meus Parceiros" }
      ]}
    >
      {/* Cards de estatísticas (índices coloridos) */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="relative overflow-hidden rounded-2xl p-4 backdrop-blur-xl border border-blue-400/20 bg-gradient-to-br from-blue-500/15 via-blue-600/5 to-transparent">
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-blue-500/20 blur-2xl" />
          <div className="relative flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center">
              <Store className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white leading-none">{autorizados}</p>
              <p className="text-xs text-blue-200/70 mt-1">Autorizados</p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl p-4 backdrop-blur-xl border border-purple-400/20 bg-gradient-to-br from-purple-500/15 via-purple-600/5 to-transparent">
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-purple-500/20 blur-2xl" />
          <div className="relative flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-300" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white leading-none">{representantes}</p>
              <p className="text-xs text-purple-200/70 mt-1">Representantes</p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-2xl p-4 backdrop-blur-xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/15 via-green-600/5 to-transparent">
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-emerald-500/20 blur-2xl" />
          <div className="relative flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white leading-none">{franqueados}</p>
              <p className="text-xs text-emerald-200/70 mt-1">Franqueados</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtro por tipo */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {([
          { value: '', label: 'Todos' },
          { value: 'autorizado', label: 'Autorizados' },
          { value: 'representante', label: 'Representantes' },
          { value: 'franqueado', label: 'Franqueados' },
        ] as { value: TipoParceiro | ''; label: string }[]).map(opt => (
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

        <button
          type="button"
          onClick={() => setCadastrarRepOpen(true)}
          className="ml-auto inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-400 hover:to-purple-600 border border-purple-400/40 shadow-lg shadow-purple-900/30 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          Cadastrar Representante
        </button>
      </div>

      {/* Lista de parceiros */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 bg-white/5" />
          ))
        ) : parceirosFiltrados.length > 0 ? (
          parceirosFiltrados.map((parceiro) => {
            const tipo = parceiro.tipo_parceiro as TipoParceiro;
            const TipoIcon = getTipoIcon(tipo);
            const etapaAtual = getCurrentEtapa(parceiro);
            const etapasInfo = getEtapasByTipo(tipo);
            const s = getTipoStyle(tipo);
            const sameTipoCount = Math.max(1, countByTipo(tipo));
            const percent = Math.min(100, Math.max(8, (sameTipoCount / totalParceiros) * 100));

            return (
              <div
                key={parceiro.id}
                onClick={() => {
                  if (tipo === 'autorizado') {
                    navigate(`/vendas/meus-parceiros/${parceiro.id}/editar`);
                  } else {
                    navigate(`/dashboard/parceiros/${parceiro.tipo_parceiro}/${parceiro.id}`);
                  }
                }}
                className="group relative flex items-center gap-4 pl-3 pr-4 py-3 rounded-full border border-white/10 bg-white/5 backdrop-blur-xl cursor-pointer transition-all duration-300 hover:bg-white/10 hover:border-white/20"
              >
                {/* Avatar com inicial + ícone do tipo */}
                <div className="relative flex-shrink-0">
                  <div className={`w-11 h-11 rounded-full ${s.avatarBg} ring-2 ${s.ring} flex items-center justify-center font-bold text-white text-sm shadow-lg`}>
                    {getIniciais(parceiro.nome)}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center">
                    <TipoIcon className={`w-3 h-3 ${s.iconColor}`} />
                  </div>
                </div>

                {/* Nome + etapa */}
                <div className="min-w-0 w-44 sm:w-52">
                  <h4 className="text-white font-semibold truncate text-sm">
                    {parceiro.nome}
                  </h4>
                  <p className="text-[11px] text-white/50 truncate">
                    {etapaAtual ? (etapasInfo.etapas[etapaAtual] || etapaAtual) : TIPO_PARCEIRO_LABELS[tipo]}
                  </p>
                </div>

                {/* Localização */}
                {(parceiro.cidade || parceiro.estado) && (
                  <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
                    <MapPin className={`w-3.5 h-3.5 ${s.iconColor}`} />
                    <span className="text-white/90 font-semibold text-sm truncate max-w-[160px]">
                      {[parceiro.cidade, parceiro.estado].filter(Boolean).join(' - ')}
                    </span>
                  </div>
                )}

                {/* Barra proporcional */}
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
                  <TipoIcon className="w-3.5 h-3.5" />
                  <span className="text-xs font-bold">{TIPO_PARCEIRO_LABELS[tipo]}</span>
                </div>

                {/* Transferir */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setTransferirParceiro({ id: parceiro.id, nome: parceiro.nome });
                  }}
                  title="Transferir para outro colaborador"
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
            <Handshake className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/60">
              {tipoFiltro ? 'Nenhum parceiro encontrado nesta categoria' : 'Você ainda não tem parceiros vinculados'}
            </p>
          </div>
        )}
      </div>

      {transferirParceiro && (
        <TransferirParceiroModal
          open={!!transferirParceiro}
          onOpenChange={(o) => { if (!o) setTransferirParceiro(null); }}
          parceiroId={transferirParceiro.id}
          parceiroNome={transferirParceiro.nome}
        />
      )}

      <RepresentanteFormDialog
        open={cadastrarRepOpen}
        onOpenChange={setCadastrarRepOpen}
      />
    </MinimalistLayout>
  );
}
