import { useState } from "react";
import { MinimalistLayout } from "@/components/MinimalistLayout";
import { useRankingEquipesInstalacao, PeriodoFiltro, RankingEquipe } from "@/hooks/useRankingEquipesInstalacao";
import { useEquipesMembros } from "@/hooks/useEquipesMembros";
import { EquipeMembrosList } from "@/components/cronograma/EquipeMembrosList";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trophy, Medal, Crown, Calendar, CalendarDays, CalendarRange, Loader2, TrendingUp, Users, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AjustePontuacaoSection } from "@/components/ranking/AjustePontuacaoSection";
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
      border: 'border-yellow-500/40',
      bg: 'bg-gradient-to-b from-yellow-500/15 to-amber-600/5',
      glow: 'shadow-yellow-500/20',
      accent: 'text-yellow-400',
      bar: 'from-yellow-400 to-amber-500',
      medal: 'bg-gradient-to-br from-yellow-300 to-amber-500',
    };
    case 2: return {
      border: 'border-slate-300/40',
      bg: 'bg-gradient-to-b from-slate-300/15 to-slate-500/5',
      glow: 'shadow-slate-400/20',
      accent: 'text-slate-300',
      bar: 'from-slate-300 to-slate-400',
      medal: 'bg-gradient-to-br from-slate-200 to-slate-400',
    };
    case 3: return {
      border: 'border-orange-500/40',
      bg: 'bg-gradient-to-b from-orange-500/15 to-amber-700/5',
      glow: 'shadow-orange-500/20',
      accent: 'text-orange-400',
      bar: 'from-orange-400 to-amber-600',
      medal: 'bg-gradient-to-br from-orange-300 to-amber-600',
    };
    default: return {
      border: 'border-white/10',
      bg: 'bg-white/5',
      glow: 'shadow-none',
      accent: 'text-white/70',
      bar: 'from-blue-400 to-blue-600',
      medal: 'bg-white/10',
    };
  }
}

function PodiumCard({ equipe, posicao, maxInstalacoes, onClick }: {
  equipe: RankingEquipe;
  posicao: number;
  maxInstalacoes: number;
  onClick: () => void;
}) {
  const styles = getPodiumColor(posicao);
  const percent = maxInstalacoes > 0 ? (equipe.quantidade_instalacoes / maxInstalacoes) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: posicao * 0.1, duration: 0.5 }}
      className={`relative rounded-2xl border ${styles.border} ${styles.bg} backdrop-blur-xl p-5 cursor-pointer transition-all duration-300 hover:scale-[1.02] shadow-lg ${styles.glow}`}
      onClick={onClick}
    >
      {/* Posição */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
        <div className={`w-8 h-8 rounded-full ${styles.medal} flex items-center justify-center shadow-lg`}>
          {posicao === 1 ? (
            <Crown className="w-4 h-4 text-amber-900" />
          ) : (
            <span className="text-white font-bold text-xs">{posicao}</span>
          )}
        </div>
      </div>

      <div className="pt-3 text-center">
        {/* Cor da equipe */}
        <div
          className="w-4 h-4 rounded-full mx-auto mb-2 border-2 border-white/20"
          style={{ backgroundColor: equipe.equipe_cor || '#64748b' }}
        />

        {/* Nome */}
        <h3 className="text-white font-bold text-lg truncate mb-1">
          {equipe.equipe_nome}
        </h3>

        {/* Contador */}
        <div className={`text-3xl font-black ${styles.accent} mb-1`}>
          {equipe.quantidade_instalacoes}
        </div>
        <p className="text-white/40 text-xs mb-3">instalações</p>

        {/* Barra de progresso */}
        <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-3">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ delay: 0.3 + posicao * 0.1, duration: 0.8, ease: "easeOut" }}
            className={`h-full rounded-full bg-gradient-to-r ${styles.bar}`}
          />
        </div>

        {/* Última instalação */}
        {equipe.ultima_instalacao && (
          <p className="text-white/30 text-xs">
            Última: {format(new Date(equipe.ultima_instalacao), "dd/MM/yyyy", { locale: ptBR })}
          </p>
        )}
      </div>
    </motion.div>
  );
}

function RankingListItem({ equipe, posicao, maxInstalacoes, onClick }: {
  equipe: RankingEquipe;
  posicao: number;
  maxInstalacoes: number;
  onClick: () => void;
}) {
  const styles = getPodiumColor(posicao <= 3 ? posicao : 0);
  const percent = maxInstalacoes > 0 ? (equipe.quantidade_instalacoes / maxInstalacoes) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: posicao * 0.05, duration: 0.4 }}
      className={`group flex items-center gap-4 p-4 rounded-xl border ${styles.border} ${styles.bg} backdrop-blur-xl cursor-pointer transition-all duration-300 hover:scale-[1.01] hover:shadow-lg ${styles.glow}`}
      onClick={onClick}
    >
      {/* Posição */}
      <div className={`w-10 h-10 rounded-full ${posicao <= 3 ? styles.medal : 'bg-white/10'} flex items-center justify-center flex-shrink-0`}>
        {posicao <= 3 ? (
          posicao === 1 ? (
            <Crown className="w-4 h-4 text-amber-900" />
          ) : (
            <span className="text-white font-bold text-sm">{posicao}</span>
          )
        ) : (
          <span className="text-white/50 font-bold text-sm">{posicao}</span>
        )}
      </div>

      {/* Cor + Nome */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div
          className="w-3 h-3 rounded-full flex-shrink-0 border border-white/20"
          style={{ backgroundColor: equipe.equipe_cor || '#64748b' }}
        />
        <div className="min-w-0">
          <h4 className="text-white font-semibold truncate">{equipe.equipe_nome}</h4>
          {equipe.ultima_instalacao && (
            <p className="text-white/30 text-xs">
              Última: {format(new Date(equipe.ultima_instalacao), "dd/MM/yyyy", { locale: ptBR })}
            </p>
          )}
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="hidden sm:block w-32 lg:w-48">
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ delay: 0.2 + posicao * 0.05, duration: 0.6 }}
            className={`h-full rounded-full bg-gradient-to-r ${styles.bar}`}
          />
        </div>
      </div>

      {/* Contador */}
      <div className="text-right flex-shrink-0">
        <div className={`text-xl font-bold ${styles.accent}`}>{equipe.quantidade_instalacoes}</div>
        <div className="text-white/30 text-xs">inst.</div>
      </div>

      {/* Arrow */}
      <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors flex-shrink-0" />
    </motion.div>
  );
}

export default function RankingEquipesInstalacao() {
  const { ranking, loading, periodo, setPeriodo, maxInstalacoes, refetch: refetchRanking } = useRankingEquipesInstalacao();
  const [selectedEquipe, setSelectedEquipe] = useState<RankingEquipe | null>(null);

  const breadcrumbItems = [
    { label: 'Home', path: '/home' },
    { label: 'Logística', path: '/logistica' },
    { label: 'Ranking Equipes' }
  ];

  const top3 = ranking.slice(0, 3);
  const restantes = ranking.slice(3);

  return (
    <MinimalistLayout
      title="Ranking de Equipes"
      subtitle="Desempenho das equipes de instalação"
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
            <p className="text-white/60">Nenhuma instalação concluída neste período</p>
          </div>
        </div>
      )}

      {!loading && ranking.length > 0 && (
        <>
          {/* Pódio Top 3 */}
          {top3.length > 0 && (
            <div className="mb-8">
              <div className="flex items-end justify-center gap-3 sm:gap-4 lg:gap-6">
                {/* 2º Lugar */}
                {top3[1] && (
                  <div className="w-full max-w-[200px]">
                    <PodiumCard
                      equipe={top3[1]}
                      posicao={2}
                      maxInstalacoes={maxInstalacoes}
                      onClick={() => setSelectedEquipe(top3[1])}
                    />
                  </div>
                )}
                {/* 1º Lugar - maior */}
                {top3[0] && (
                  <div className="w-full max-w-[240px] -mb-2 z-10">
                    <div className="scale-110">
                      <PodiumCard
                        equipe={top3[0]}
                        posicao={1}
                        maxInstalacoes={maxInstalacoes}
                        onClick={() => setSelectedEquipe(top3[0])}
                      />
                    </div>
                  </div>
                )}
                {/* 3º Lugar */}
                {top3[2] && (
                  <div className="w-full max-w-[200px]">
                    <PodiumCard
                      equipe={top3[2]}
                      posicao={3}
                      maxInstalacoes={maxInstalacoes}
                      onClick={() => setSelectedEquipe(top3[2])}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Lista restante */}
          {restantes.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-3 px-1">
                <TrendingUp className="w-4 h-4 text-white/40" />
                <span className="text-white/40 text-sm font-medium uppercase tracking-wider">Classificação</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>
              {restantes.map((equipe, index) => (
                <RankingListItem
                  key={equipe.equipe_id}
                  equipe={equipe}
                  posicao={index + 4}
                  maxInstalacoes={maxInstalacoes}
                  onClick={() => setSelectedEquipe(equipe)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Ajuste de Pontuação */}
      <AjustePontuacaoSection onAtribuir={refetchRanking} periodo={periodo} />

      {/* Dialog de Instalações */}
      <Dialog open={!!selectedEquipe} onOpenChange={(open) => !open && setSelectedEquipe(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto bg-slate-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedEquipe && (
                <>
                  <div
                    className="w-4 h-4 rounded-full border border-white/20"
                    style={{ backgroundColor: selectedEquipe.equipe_cor || '#64748b' }}
                  />
                  {selectedEquipe.equipe_nome}
                  <Badge className="bg-white/10 text-white/70">
                    {selectedEquipe.quantidade_instalacoes} instalações
                  </Badge>
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedEquipe && selectedEquipe.instalacoes_detalhes.length === 0 && (
            <p className="text-white/50 text-center py-6">Nenhuma instalação no período</p>
          )}

          {selectedEquipe && selectedEquipe.instalacoes_detalhes.length > 0 && (
            <div className="space-y-2 mt-2">
              {selectedEquipe.instalacoes_detalhes.map((inst) => {
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
