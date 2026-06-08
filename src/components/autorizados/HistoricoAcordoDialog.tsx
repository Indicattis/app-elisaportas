import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAcordoHistorico } from '@/hooks/useAcordoHistorico';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Plus, Pencil, ArrowRightLeft, CheckCircle2, XCircle, DollarSign, RotateCcw, History, User,
} from 'lucide-react';

interface Props {
  acordoId: string | null;
  clienteNome?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EVENT_STYLE: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  criado: { icon: Plus, color: 'text-blue-400', bg: 'bg-blue-500/15 border-blue-500/30', label: 'Criado' },
  editado: { icon: Pencil, color: 'text-yellow-400', bg: 'bg-yellow-500/15 border-yellow-500/30', label: 'Editado' },
  status_alterado: { icon: ArrowRightLeft, color: 'text-purple-400', bg: 'bg-purple-500/15 border-purple-500/30', label: 'Status' },
  aprovado: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/15 border-green-500/30', label: 'Aprovado' },
  reprovado: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30', label: 'Reprovado' },
  pago: { icon: DollarSign, color: 'text-green-400', bg: 'bg-green-500/15 border-green-500/30', label: 'Pago' },
  desmarcado_pago: { icon: RotateCcw, color: 'text-orange-400', bg: 'bg-orange-500/15 border-orange-500/30', label: 'Pagamento desfeito' },
};

export function HistoricoAcordoDialog({ acordoId, clienteNome, open, onOpenChange }: Props) {
  const { historico, loading } = useAcordoHistorico(open ? acordoId : null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-black/90 border-white/10 backdrop-blur-xl text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <History className="h-5 w-5 text-blue-400" />
            Histórico do Acordo
            {clienteNome && <span className="text-white/50 font-normal text-sm">· {clienteNome}</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto pr-2 -mr-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-6 w-6 border-2 border-blue-400 border-t-transparent rounded-full" />
            </div>
          ) : historico.length === 0 ? (
            <div className="text-center py-12 bg-white/5 rounded-lg border border-white/10">
              <p className="text-white/60 text-sm">Nenhum evento registrado.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {historico.map((ev) => {
                const style = EVENT_STYLE[ev.evento] ?? EVENT_STYLE.editado;
                const Icon = style.icon;
                return (
                  <div
                    key={ev.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${style.bg} backdrop-blur-xl`}
                  >
                    <div className={`mt-0.5 p-1.5 rounded-md bg-white/5 border border-white/10 ${style.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/90">{ev.descricao}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-white/50">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {ev.usuario_nome || 'Sistema'}
                        </span>
                        <span>
                          {format(new Date(ev.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}