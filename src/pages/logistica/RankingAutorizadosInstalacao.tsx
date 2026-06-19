import { useState } from "react";
import { MinimalistLayout } from "@/components/MinimalistLayout";
import { useRankingAutorizadosInstalacao, PeriodoFiltro, RankingAutorizado } from "@/hooks/useRankingAutorizadosInstalacao";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trophy, Crown, Calendar, CalendarDays, CalendarRange, Loader2, TrendingUp, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { InstalacoesHeaderActions } from "@/components/instalacoes/InstalacoesHeaderActions";
import { motion } from "framer-motion";

const periodosOptions: { value: PeriodoFiltro; label: string; icon: React.ElementType }[] = [
  { value: 'mes', label: 'Este Mês', icon: Calendar },
  { value: 'ano', label: 'Este Ano', icon: CalendarDays },
  { value: 'todos', label: 'Todo Período', icon: CalendarRange },
];

function classificarPorta(metragem: number | null | undefined): string | null {
  if (!metragem || metragem <= 0) return null;
  if (metragem < 25) return 'P';
  if (metragem <= 50) return 'G';
  return 'GG';
}

function getPodiumColor(posicao: number) {
  switch (posicao) {
    case 1: return {
      border: 'border-blue-400/50',
      bg: 'bg-gradient-to-b from-blue-500/20 to-blue-700/5',
      glow: 'shadow-blue-500/30',
      accent: 'text-blue-300',
      bar: 'from-blue-400 to-blue-600',
      medal: 'bg-gradient-to-br from-blue-400 to-blue-600',
      cup: 'from-blue-300 via-blue-400 to-blue-600',
    };
    case 2: return {
      border: 'border-slate-300/40',
      bg: 'bg-gradient-to-b from-slate-300/15 to-slate-500/5',
      glow: 'shadow-slate-400/20',
      accent: 'text-slate-200',
      bar: 'from-slate-300 to-slate-400',
      medal: 'bg-gradient-to-br from-slate-200 to-slate-400',
      cup: 'from-slate-200 via-slate-300 to-slate-500',
    };
    case 3: return {
      border: 'border-cyan-500/40',
      bg: 'bg-gradient-to-b from-cyan-500/15 to-sky-700/5',
      glow: 'shadow-cyan-500/20',
      accent: 'text-cyan-300',
      bar: 'from-cyan-400 to-sky-500',
      medal: 'bg-gradient-to-br from-cyan-300 to-sky-500',
      cup: 'from-cyan-200 via-cyan-400 to-sky-600',
    };
    default: return {
      border: 'border-white/10',
      bg: 'bg-white/5',
      glow: 'shadow-none',
      accent: 'text-white/70',
      bar: 'from-blue-400 to-blue-600',
      medal: 'bg-white/10',
      cup: 'from-white/30 to-white/10',
    };
  }
}

function getIniciais(nome: string) {
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function TrophyCup({ autorizado, posicao, onClick, elevated = false }: {
  autorizado: RankingAutorizado;
  posicao: number;
  onClick: () => void;
  elevated?: boolean;
}) {
  const styles = getPodiumColor(posicao);
  const size = elevated ? 'w-24 h-24' : 'w-20 h-20';
  const avatarSize = elevated ? 'w-14 h-14' : 'w-12 h-12';

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: posicao * 0.1, duration: 0.5 }}
      className="flex flex-col items-center cursor-pointer group"
      onClick={onClick}
    >
      {posicao === 1 && (
        <Crown className="w-6 h-6 text-blue-300 mb-1 drop-shadow-[0_0_8px_rgba(96,165,250,0.6)]" />
      )}

      <div className="relative">
        {posicao === 1 && (
          <>
            <div className="absolute top-1/2 -left-10 -translate-y-1/2 flex flex-col gap-1">
              <div className="h-0.5 w-8 bg-gradient-to-l from-blue-400/60 to-transparent rounded-full" />
              <div className="h-0.5 w-6 bg-gradient-to-l from-blue-400/40 to-transparent rounded-full ml-2" />
              <div className="h-0.5 w-5 bg-gradient-to-l from-blue-400/30 to-transparent rounded-full ml-3" />
            </div>
            <div className="absolute top-1/2 -right-10 -translate-y-1/2 flex flex-col gap-1 items-end">
              <div className="h-0.5 w-8 bg-gradient-to-r from-blue-400/60 to-transparent rounded-full" />
              <div className="h-0.5 w-6 bg-gradient-to-r from-blue-400/40 to-transparent rounded-full mr-2" />
              <div className="h-0.5 w-5 bg-gradient-to-r from-blue-400/30 to-transparent rounded-full mr-3" />
            </div>
          </>
        )}

        <div
          className={`${size} rounded-t-[3rem] rounded-b-xl bg-gradient-to-br ${styles.cup} flex items-center justify-center shadow-2xl ${styles.glow} border border-white/20 transition-transform duration-300 group-hover:scale-105`}
        >
          <Avatar className={`${avatarSize} border-2 border-white/40 shadow-inner`}>
            <AvatarImage src={autorizado.autorizado_logo_url ?? undefined} alt={autorizado.autorizado_nome} className="object-cover" />
            <AvatarFallback className="bg-blue-900 text-white font-bold text-lg">
              {getIniciais(autorizado.autorizado_nome)}
            </AvatarFallback>
          </Avatar>
        </div>
        <div className={`mx-auto -mt-1 w-3 h-3 bg-gradient-to-b ${styles.cup}`} />
        <div className={`mx-auto w-12 h-1.5 rounded-sm bg-gradient-to-b ${styles.cup} shadow-lg`} />
      </div>

      <p className={`mt-3 text-white font-semibold text-sm truncate max-w-[140px] text-center ${elevated ? 'text-base' : ''}`}>
        {autorizado.autorizado_nome}
      </p>
      <p className={`text-xs font-bold ${styles.accent}`}>
        {autorizado.quantidade_instalacoes} inst.
      </p>
    </motion.div>
  );
}

function RankingListItem({ autorizado, posicao, maxInstalacoes, onClick }: {
  autorizado: RankingAutorizado;
  posicao: number;
  maxInstalacoes: number;
  onClick: () => void;
}) {
  const styles = getPodiumColor(posicao <= 3 ? posicao : 0);
  const percent = maxInstalacoes > 0 ? (autorizado.quantidade_instalacoes / maxInstalacoes) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: posicao * 0.05, duration: 0.4 }}
      className="group relative flex items-center gap-4 pl-7 pr-5 py-3 rounded-full border border-white/10 bg-white/5 backdrop-blur-xl cursor-pointer transition-all duration-300 hover:bg-white/10 hover:border-white/20"
      onClick={onClick}
    >
      <div className="relative flex-shrink-0 -ml-3">
        <Avatar className="w-11 h-11 border-2 border-white/20 shadow-lg">
          <AvatarImage src={autorizado.autorizado_logo_url ?? undefined} alt={autorizado.autorizado_nome} className="object-cover" />
          <AvatarFallback className="bg-blue-900 text-white font-bold text-sm">
            {getIniciais(autorizado.autorizado_nome)}
          </AvatarFallback>
        </Avatar>
        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ${posicao <= 3 ? styles.medal : 'bg-slate-700'} flex items-center justify-center text-[10px] font-bold text-white border border-slate-900 z-10`}>
          {posicao}
        </div>
      </div>

      <div className="min-w-0 w-40">
        <h4 className="text-white font-semibold truncate text-sm">{autorizado.autorizado_nome}</h4>
      </div>

      <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
        <Trophy className={`w-3.5 h-3.5 ${styles.accent}`} />
        <span className="text-white/80 font-semibold text-sm tabular-nums">
          {autorizado.quantidade_instalacoes * 100}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ delay: 0.2 + posicao * 0.05, duration: 0.6 }}
            className={`h-full rounded-full bg-gradient-to-r ${styles.bar}`}
          />
        </div>
      </div>

      <div className={`flex-shrink-0 px-3 py-1 rounded-full ${styles.bg} border ${styles.border} text-xs font-bold ${styles.accent}`}>
        {autorizado.quantidade_instalacoes}
      </div>

      <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-white/60 transition-colors flex-shrink-0" />
    </motion.div>
  );
}

export default function RankingAutorizadosInstalacao() {
  const { ranking, loading, periodo, setPeriodo, maxInstalacoes } = useRankingAutorizadosInstalacao();
  const [selectedAutorizado, setSelectedAutorizado] = useState<RankingAutorizado | null>(null);

  const breadcrumbItems = [
    { label: 'Home', path: '/home' },
    { label: 'Logística', path: '/logistica' },
    { label: 'Ranking Autorizados' }
  ];

  const top3 = ranking.slice(0, 3);

  return (
    <MinimalistLayout
      title="Ranking de Autorizados"
      subtitle="Desempenho dos parceiros autorizados nas correções/instalações"
      backPath="/logistica"
      headerActions={<InstalacoesHeaderActions />}
      breadcrumbItems={breadcrumbItems}
    >
      {/* Filtros de Período */}
      <div className="mb-8">
        <div className="p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 inline-flex gap-1">
          {periodosOptions.map((opt) => {
            const Icon = opt.icon;
            const isActive = periodo === opt.value;
            return (
              <Button
                key={opt.value}
                variant={isActive ? "default" : "ghost"}
                size="sm"
                onClick={() => setPeriodo(opt.value)}
                className={`gap-2 ${isActive
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white shadow-lg shadow-blue-500/25'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4" />
                {opt.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      )}

      {/* Lista Vazia */}
      {!loading && ranking.length === 0 && (
        <div className="p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10">
          <div className="p-8 text-center">
            <Trophy className="w-12 h-12 mx-auto text-white/30 mb-4" />
            <p className="text-white/60">Nenhuma instalação concluída por autorizados neste período</p>
          </div>
        </div>
      )}

      {!loading && ranking.length > 0 && (
        <>
          {/* Pódio Top 3 */}
          {top3.length > 0 && (
            <div className="mb-10 relative">
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-40 bg-gradient-to-b from-blue-500/10 via-transparent to-transparent rounded-3xl blur-3xl pointer-events-none" />
              <div className="relative flex items-end justify-center gap-12 sm:gap-20 pt-4 pb-8">
                {top3[1] && (
                  <TrophyCup autorizado={top3[1]} posicao={2} onClick={() => setSelectedAutorizado(top3[1])} />
                )}
                {top3[0] && (
                  <div className="-mt-6">
                    <TrophyCup autorizado={top3[0]} posicao={1} elevated onClick={() => setSelectedAutorizado(top3[0])} />
                  </div>
                )}
                {top3[2] && (
                  <TrophyCup autorizado={top3[2]} posicao={3} onClick={() => setSelectedAutorizado(top3[2])} />
                )}
              </div>
            </div>
          )}

          {/* Lista completa */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-3 px-1">
              <TrendingUp className="w-4 h-4 text-white/40" />
              <span className="text-white/40 text-sm font-medium uppercase tracking-wider">Classificação</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
            {ranking.map((autorizado, index) => (
              <RankingListItem
                key={autorizado.autorizado_id}
                autorizado={autorizado}
                posicao={index + 1}
                maxInstalacoes={maxInstalacoes}
                onClick={() => setSelectedAutorizado(autorizado)}
              />
            ))}
          </div>
        </>
      )}

      {/* Dialog de Detalhes */}
      <Dialog open={!!selectedAutorizado} onOpenChange={(open) => !open && setSelectedAutorizado(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto bg-slate-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedAutorizado && (
                <>
                  <Avatar className="w-8 h-8 border border-white/20">
                    <AvatarImage src={selectedAutorizado.autorizado_logo_url ?? undefined} className="object-cover" />
                    <AvatarFallback className="bg-blue-900 text-white text-xs">
                      {getIniciais(selectedAutorizado.autorizado_nome)}
                    </AvatarFallback>
                  </Avatar>
                  {selectedAutorizado.autorizado_nome}
                  <Badge className="bg-white/10 text-white/70">
                    {selectedAutorizado.quantidade_instalacoes} instalações
                  </Badge>
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedAutorizado && selectedAutorizado.instalacoes_detalhes.length === 0 && (
            <p className="text-white/50 text-center py-6">Nenhuma instalação no período</p>
          )}

          {selectedAutorizado && selectedAutorizado.instalacoes_detalhes.length > 0 && (
            <div className="space-y-2 mt-2">
              {selectedAutorizado.instalacoes_detalhes.map((inst) => {
                const tamanho = classificarPorta(inst.metragem);
                return (
                  <div key={inst.id} className="p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white truncate">{inst.nome_cliente}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-white/50">
                          {inst.data_conclusao && (
                            <span>{format(new Date(inst.data_conclusao), "dd/MM/yyyy", { locale: ptBR })}</span>
                          )}
                          {inst.metragem && inst.metragem > 0 && (
                            <span>{inst.metragem.toFixed(1)} m²</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {tamanho && (
                          <Badge variant="outline" className="text-xs border-white/20 text-white/70">
                            {tamanho}
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            inst.origem === 'pedido'
                              ? 'border-blue-500/40 text-blue-400'
                              : 'border-emerald-500/40 text-emerald-400'
                          }`}
                        >
                          {inst.origem === 'pedido' ? 'Pedido' : 'Avulso'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MinimalistLayout>
  );
}
