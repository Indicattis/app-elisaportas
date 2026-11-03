import { useEffect, useState } from 'react';
import { Check, Loader2, NotebookPen } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useComissoesAcordos } from '@/hooks/useComissoesAcordos';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ComissoesAcordosDialog({ open, onOpenChange }: Props) {
  const { nota, loading, saving, save } = useComissoesAcordos();
  const [texto, setTexto] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (open && !loading) {
      setTexto(nota?.conteudo ?? '');
      setDirty(false);
    }
  }, [open, loading, nota?.conteudo]);

  const handleSave = async () => {
    const ok = await save(texto);
    if (ok) {
      setDirty(false);
      toast.success('Acordos de comissões salvos');
    } else {
      toast.error('Não foi possível salvar as anotações');
    }
  };

  const ultimaEdicao = nota?.updated_at
    ? new Date(nota.updated_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <NotebookPen className="w-4 h-4" />
            Acordos de Comissões
          </DialogTitle>
          <DialogDescription>
            Bloco de notas para registrar os acordos de comissões combinados com a equipe.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 animate-spin text-white/50" />
          </div>
        ) : (
          <div className="space-y-3">
            <textarea
              value={texto}
              onChange={(e) => { setTexto(e.target.value); setDirty(true); }}
              placeholder={'Ex.: Vendedor X — 3% sobre vendas acima de R$ 100 mil/mês\nGerente Y — 1% sobre o faturamento total...'}
              className="w-full min-h-[320px] bg-white/5 border border-white/10 rounded-lg p-4 text-sm text-white placeholder:text-white/30 outline-none focus:border-blue-400/50 resize-y leading-relaxed"
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-white/40">
                {ultimaEdicao ? `Última alteração em ${ultimaEdicao}` : 'Ainda não há anotações salvas'}
              </span>
              <Button
                onClick={handleSave}
                disabled={saving || !dirty}
                className="inline-flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Salvar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
