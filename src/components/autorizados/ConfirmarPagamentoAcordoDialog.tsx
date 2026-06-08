import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
  valorJaPago?: number;
  onConfirm: (bancoId: string, valorPagamento: number) => Promise<void> | void;
}

export function ConfirmarPagamentoAcordoDialog({
  open, onOpenChange, clienteNome, valor, valorJaPago = 0, onConfirm,
}: Props) {
  const [bancos, setBancos] = useState<Banco[]>([]);
  const [bancoId, setBancoId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const valorTotal = valor ?? 0;
  const saldo = useMemo(() => Math.max(0, +(valorTotal - valorJaPago).toFixed(2)), [valorTotal, valorJaPago]);
  const [valorPagar, setValorPagar] = useState<string>('');

  useEffect(() => {
    if (!open) return;
    setValorPagar(saldo > 0 ? saldo.toFixed(2) : '');
    (async () => {
      const { data } = await supabase
        .from('bancos' as any)
        .select('id, nome')
        .order('nome', { ascending: true });
      const list = (data || []) as unknown as Banco[];
      setBancos(list);
      if (list.length > 0) setBancoId(list[0].id);
    })();
  }, [open, saldo]);

  const valorNum = Number(valorPagar.replace(',', '.'));
  const valorValido = !isNaN(valorNum) && valorNum > 0 && valorNum <= saldo + 0.001;
  const quitaSaldo = valorValido && valorNum >= saldo - 0.001;

  const handleConfirm = async () => {
    if (!bancoId || !valorValido) return;
    setSaving(true);
    try {
      await onConfirm(bancoId, +valorNum.toFixed(2));
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
            {clienteNome ? `Acordo de ${clienteNome}.` : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="rounded-md border border-white/10 bg-white/5 p-3 text-xs space-y-1">
            <div className="flex justify-between"><span className="text-white/60">Valor total</span><span className="text-white font-medium">{formatCurrency(valorTotal)}</span></div>
            <div className="flex justify-between"><span className="text-white/60">Já pago</span><span className="text-white">{formatCurrency(valorJaPago)}</span></div>
            <div className="flex justify-between border-t border-white/10 pt-1 mt-1"><span className="text-white/70">Saldo devedor</span><span className="text-amber-300 font-semibold">{formatCurrency(saldo)}</span></div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-white/70">Valor a pagar agora</Label>
              <button
                type="button"
                onClick={() => setValorPagar(saldo.toFixed(2))}
                className="text-[11px] text-blue-300 hover:text-blue-200 underline-offset-2 hover:underline"
              >
                Quitar saldo
              </button>
            </div>
            <Input
              type="number"
              step="0.01"
              min="0"
              max={saldo}
              value={valorPagar}
              onChange={(e) => setValorPagar(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
            />
            {!valorValido && valorPagar !== '' && (
              <p className="text-[11px] text-red-400">Informe um valor entre R$ 0,01 e {formatCurrency(saldo)}.</p>
            )}
            {valorValido && !quitaSaldo && (
              <p className="text-[11px] text-amber-300">Pagamento parcial — o acordo ficará com status "Parcial".</p>
            )}
          </div>
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
            disabled={!bancoId || !valorValido || saving}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {saving ? 'Confirmando...' : quitaSaldo ? 'Quitar acordo' : 'Pagar parcial'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}