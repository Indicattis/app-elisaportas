import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, CalendarRange, ArrowLeft, Landmark } from 'lucide-react';

import { AnimatedBreadcrumb } from '@/components/AnimatedBreadcrumb';
import { DelayedParticles } from '@/components/DelayedParticles';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const menuItems = [
  { label: '2 Milhões Capital de Giro', icon: Wallet, path: '/direcao/caixa-elisa/capital-giro' },
  { label: 'Planejamento 2 Milhões de Giro', icon: CalendarRange, path: '/direcao/caixa-elisa/planejamento' },
  { label: 'Saldo em conta', icon: Landmark, action: 'saldo-conta' as const },
];

export default function CaixaElisaDirecao() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [saldoDialog, setSaldoDialog] = useState(false);
  const [saldoConta, setSaldoConta] = useState(0);
  const [saldoInput, setSaldoInput] = useState('');
  const [savingSaldo, setSavingSaldo] = useState(false);

  const loadSaldo = async () => {
    const { data } = await supabase
      .from('caixa_elisa_config')
      .select('saldo_conta')
      .eq('id', 'singleton')
      .maybeSingle();
    if (data) setSaldoConta(Number((data as any).saldo_conta) || 0);
  };

  useEffect(() => { loadSaldo(); }, []);

  const openSaldoDialog = () => {
    setSaldoInput(String(saldoConta));
    setSaldoDialog(true);
  };

  const saveSaldo = async () => {
    setSavingSaldo(true);
    const num = Number(String(saldoInput).replace(',', '.')) || 0;
    const { error } = await supabase
      .from('caixa_elisa_config')
      .upsert({ id: 'singleton', saldo_conta: num }, { onConflict: 'id' });
    setSavingSaldo(false);
    if (error) {
      toast.error('Erro ao salvar saldo');
      return;
    }
    setSaldoConta(num);
    setSaldoDialog(false);
    toast.success('Saldo em conta atualizado.');
  };

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const renderButton = (item: typeof menuItems[0], index: number) => {
    const Icon = item.icon;
    const delay = 100 + index * 80;
    return (
      <div
        key={item.label}
        className="p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 transition-all duration-300"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateX(0)' : 'translateX(-30px)',
          transition: `all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms`,
        }}
      >
        <button
          onClick={() => {
            if ('action' in item && item.action === 'saldo-conta') openSaldoDialog();
            else if ('path' in item && item.path) navigate(item.path);
          }}
          className="w-full h-12 rounded-lg flex items-center gap-4 px-5 font-medium transition-all duration-300
                     bg-gradient-to-r from-emerald-500 to-emerald-700 shadow-lg shadow-emerald-500/20
                     border border-emerald-400/30 hover:from-emerald-400 hover:to-emerald-600 text-white active:scale-[0.98]"
        >
          <Icon className="w-5 h-5" strokeWidth={1.5} />
          <span className="text-sm font-medium">{item.label}</span>
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden relative">
      <DelayedParticles />

      <AnimatedBreadcrumb
        items={[
          { label: 'Home', path: '/home' },
          { label: 'Direção', path: '/direcao' },
          { label: 'Caixa Elisa' },
        ]}
        mounted={mounted}
      />
      <button
        onClick={() => navigate('/direcao')}
        className="fixed top-4 left-4 z-50 p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-all duration-300"
      >
        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/20">
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </div>
      </button>

      <div className="relative z-10 flex flex-col items-center justify-center px-6 py-10 w-full max-w-md">
        <div className="w-full flex flex-col gap-3">
          {menuItems.map((item, index) => renderButton(item, index))}
        </div>
      </div>

      <Dialog open={saldoDialog} onOpenChange={setSaldoDialog}>
        <DialogContent className="bg-zinc-950 border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Editar Saldo em conta</DialogTitle>
          </DialogHeader>
          <div>
            <Label className="text-white/70">Valor (R$)</Label>
            <Input
              inputMode="decimal"
              value={saldoInput}
              onChange={(e) => setSaldoInput(e.target.value.replace(/[^0-9.,]/g, ''))}
              className="bg-white/5 border-white/10 text-white mt-2"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSaldoDialog(false)} className="text-white/70 hover:text-white">
              Cancelar
            </Button>
            <Button
              onClick={saveSaldo}
              disabled={savingSaldo}
              className="bg-gradient-to-r from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 text-white"
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}