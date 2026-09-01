import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MinimalistLayout } from '@/components/MinimalistLayout';
import { useAcordosAutorizados, type AcordoAutorizado, type NovoAcordo } from '@/hooks/useAcordosAutorizados';
import { NovoAcordoDialog } from '@/components/autorizados/NovoAcordoDialog';
import { formatCurrency } from '@/lib/utils';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export default function InstalacaoAutorizados() {
  const navigate = useNavigate();
  const { acordos, loading, createAcordo } = useAcordosAutorizados();
  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear());
  const [acordoDialogOpen, setAcordoDialogOpen] = useState(false);

  const acordosPorMes = useMemo(() => {
    const map: Record<number, AcordoAutorizado[]> = {};
    for (let i = 0; i < 12; i++) map[i] = [];
    acordos.forEach((acordo) => {
      const data = new Date(acordo.data_acordo);
      if (data.getFullYear() === anoSelecionado) {
        map[data.getMonth()].push(acordo);
      }
    });
    return map;
  }, [acordos, anoSelecionado]);

  const handleSalvarAcordo = async (novoAcordo: NovoAcordo) => {
    await createAcordo(novoAcordo);
  };

  const headerActions = (
    <Button
      size="sm"
      onClick={() => setAcordoDialogOpen(true)}
      className="h-10 px-5 rounded-lg bg-gradient-to-r from-blue-500 to-blue-700 border border-blue-400/30 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.02] transition-all duration-300 text-xs gap-1.5"
    >
      <Plus className="h-4 w-4" />
      <span className="hidden sm:inline">Novo Acordo</span>
    </Button>
  );

  return (
    <MinimalistLayout
      title="Instalação Autorizados"
      subtitle="Acordos com autorizados"
      backPath="/autorizados"
      breadcrumbItems={[
        { label: 'Home', path: '/home' },
        { label: 'Autorizados', path: '/autorizados' },
        { label: 'Instalação' },
      ]}
      headerActions={headerActions}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-medium text-white/70">Acordos com Autorizados</h2>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-xs font-bold text-emerald-400">{acordos.length}</span>
              <span className="text-xs text-white/40">acordo{acordos.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAnoSelecionado(prev => prev - 1)}
              className="h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/10"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold text-white/90 min-w-[4rem] text-center">{anoSelecionado}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAnoSelecionado(prev => prev + 1)}
              className="h-8 w-8 p-0 text-white/60 hover:text-white hover:bg-white/10"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {MESES.map((mes, index) => {
              const acordosDoMes = acordosPorMes[index] || [];
              const total = acordosDoMes.length;
              const valorTotal = acordosDoMes.reduce((sum, a) => sum + a.valor_acordado, 0);
              const pendentes = acordosDoMes.filter(a => !a.aprovado_direcao && !a.reprovado_direcao).length;
              const mesAtual = new Date().getMonth() === index && new Date().getFullYear() === anoSelecionado;

              return (
                <Card
                  key={index}
                  onClick={() => navigate(`/autorizados/acordos/${anoSelecionado}/${index}`)}
                  className={`cursor-pointer transition-all duration-200 hover:scale-[1.02] backdrop-blur-xl border ${
                    mesAtual
                      ? 'bg-blue-500/10 border-blue-400/30 shadow-lg shadow-blue-500/10'
                      : total > 0
                        ? 'bg-white/5 border-white/10 hover:bg-white/10'
                        : 'bg-white/[0.02] border-white/5 hover:bg-white/5'
                  }`}
                >
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${mesAtual ? 'text-blue-300' : 'text-white/80'}`}>
                        {mes}
                      </span>
                      {pendentes > 0 && (
                        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[10px] px-1.5 py-0">
                          {pendentes} pendente{pendentes > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-end justify-between">
                      <span className="text-lg font-bold text-white/90">{total}</span>
                      {valorTotal > 0 && (
                        <span className="text-xs text-green-400/80">{formatCurrency(valorTotal)}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <NovoAcordoDialog
        open={acordoDialogOpen}
        onOpenChange={setAcordoDialogOpen}
        onSave={handleSalvarAcordo}
      />
    </MinimalistLayout>
  );
}
