import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';

interface Banco { id: string; nome: string }

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteNome?: string;
  valor?: number;
  onConfirm: (bancoId: string) => Promise<void> | void;
}

export function ConfirmarPagamentoAcordoDialog({
  open, onOpenChange, clienteNome, valor, onConfirm,
}: Props) {
  const [bancos, setBancos] = useState<Banco[]>([]);
  const [bancoId, setBancoId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from('bancos' as any)
        .select('id, nome')
        .order('nome', { ascending: true });
      const list = (data || []) as unknown as Banco[];
      setBancos(list);
      if (list.length > 0) setBancoId(list[0].id);
    })();
  }, [open]);

  const handleConfirm = async () => {
    if (!bancoId) return;
    setSaving(true);
    try {
      await onConfirm(bancoId);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Confirmar pagamento</DialogTitle>
          <DialogDescription>
            {clienteNome ? `Acordo de ${clienteNome}. ` : ''}
            {typeof valor === 'number' ? `Valor: ${formatCurrency(valor)}. ` : ''}
            Escolha o banco usado para este pagamento.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label className="text-xs text-white/70">Banco</Label>
          <Select value={bancoId} onValueChange={setBancoId}>
            <SelectTrigger className="bg-white/5 border-white/10 text-white">
              <SelectValue placeholder="Selecione o banco" />
            </SelectTrigger>
            <SelectContent>
              {bancos.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!bancoId || saving}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {saving ? 'Confirmando...' : 'Confirmar pagamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}