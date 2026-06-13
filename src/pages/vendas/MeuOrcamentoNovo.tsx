import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, DoorOpen, Package, Truck, ChevronRight, FileDown, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AnimatedBreadcrumb } from '@/components/AnimatedBreadcrumb';
import { DelayedParticles } from '@/components/DelayedParticles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { AdicionarPortaDialog } from '@/components/vendas/orcamento-novo/AdicionarPortaDialog';
import { AdicionarItemAvulsoDialog } from '@/components/vendas/orcamento-novo/AdicionarItemAvulsoDialog';
import { AdicionarFreteDialog } from '@/components/vendas/orcamento-novo/AdicionarFreteDialog';
import { CarrinhoOrcamento } from '@/components/vendas/orcamento-novo/CarrinhoOrcamento';
import {
  downloadMeuOrcamentoPDF,
  type CartPorta, type CartAvulso, type CartFrete,
} from '@/utils/meuOrcamentoPDFGenerator';

const fmt = (n: number) => `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

export default function MeuOrcamentoNovo() {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [cliente, setCliente] = useState('');
  const [portas, setPortas] = useState<CartPorta[]>([]);
  const [avulsos, setAvulsos] = useState<CartAvulso[]>([]);
  const [frete, setFrete] = useState<CartFrete | null>(null);
  const [dlgPorta, setDlgPorta] = useState(false);
  const [dlgAvulso, setDlgAvulso] = useState(false);
  const [dlgFrete, setDlgFrete] = useState(false);

  useEffect(() => { const t = setTimeout(() => setMounted(true), 50); return () => clearTimeout(t); }, []);

  const totalPortas = portas.reduce((s, p) => s + p.preco_unitario * p.quantidade, 0);
  const totalAvulsos = avulsos.reduce((s, a) => s + a.preco_unitario * a.quantidade, 0);
  const totalFrete = frete?.valor || 0;
  const total = totalPortas + totalAvulsos + totalFrete;

  const valorPintura = portas.reduce((s, p) => s + (p.pintura ? 0 : 0), 0); // já incluso no preco_unitario
  const valorInstalacao = portas.reduce((s, p) => s + (p.instalacao ? 0 : 0), 0);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!cliente.trim()) throw new Error('Informe o nome do cliente');
      if (!portas.length && !avulsos.length) throw new Error('Adicione ao menos um item');
      if (!user?.id) throw new Error('Usuário não autenticado');

      // próximo número
      const { data: maxRow } = await supabase
        .from('orcamentos')
        .select('numero_orcamento')
        .order('numero_orcamento', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      const proximo = (Number(maxRow?.numero_orcamento) || 0) + 1;

      const { data, error } = await supabase
        .from('orcamentos')
        .insert([{
          atendente_id: user.id,
          cliente_nome: cliente.trim(),
          valor_produto: totalPortas + totalAvulsos,
          valor_pintura: valorPintura,
          valor_instalacao: valorInstalacao,
          valor_frete: totalFrete,
          valor_total: total,
          status: 'pendente',
          numero_orcamento: proximo,
          campos_personalizados: { portas, avulsos, frete } as any,
        }] as any)
        .select('id, numero_orcamento')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (rec) => {
      toast.success(`Orçamento Nº ${String(rec.numero_orcamento).padStart(4, '0')} salvo`);
      downloadMeuOrcamentoPDF({
        numero: rec.numero_orcamento,
        data: new Date(),
        cliente: cliente.trim(),
        vendedor: userRole?.nome || 'Elisa Portas',
        portas, avulsos, frete,
      });
      navigate(`/vendas/meus-orcamentos/${rec.id}`);
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao salvar'),
  });

  return (
    <div className="min-h-screen bg-black flex flex-col items-center overflow-hidden relative">
      <DelayedParticles />
      <AnimatedBreadcrumb
        items={[
          { label: 'Home', path: '/home' },
          { label: 'Vendas', path: '/vendas' },
          { label: 'Meus Orçamentos', path: '/vendas/meus-orcamentos' },
          { label: 'Novo' },
        ]}
        mounted={mounted}
      />
      <button
        onClick={() => navigate('/vendas/meus-orcamentos')}
        className="fixed top-4 left-4 z-50 p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition"
      >
        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/20">
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </div>
      </button>

      <div className="relative z-10 w-full max-w-5xl px-6 pt-20 pb-10"
        style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(20px)', transition: 'all 0.6s cubic-bezier(0.34,1.56,0.64,1) 300ms' }}>

        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-white">Novo Orçamento</h1>
          <p className="text-white/40 text-sm">Monte sua proposta adicionando portas, itens e frete</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <div className="space-y-5">
            {/* Cliente */}
            <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-4">
              <label className="text-[11px] uppercase tracking-wider text-white/50 font-medium">Nome do cliente *</label>
              <Input className="mt-1 bg-white/5 border-white/10 text-white" value={cliente} onChange={e => setCliente(e.target.value)} placeholder="Ex.: João da Silva" />
            </div>

            {/* Cards de ação */}
            <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-4">
              <h2 className="text-sm font-semibold text-white mb-1">O que deseja adicionar?</h2>
              <p className="text-xs text-white/40 mb-4">Escolha uma opção abaixo para incluir no orçamento.</p>
              <div className="space-y-2">
                <ActionCard icon={<DoorOpen className="w-5 h-5 text-blue-300" />} title="Adicionar porta" subtitle="Medidas, pintura e instalação" onClick={() => setDlgPorta(true)} />
                <ActionCard icon={<Package className="w-5 h-5 text-blue-300" />} title="Adicionar itens extras" subtitle="Acessórios, adicionais e outros produtos" onClick={() => setDlgAvulso(true)} />
                <ActionCard icon={<Truck className="w-5 h-5 text-blue-300" />} title="Adicionar frete" subtitle="Estado e cidade de entrega" onClick={() => setDlgFrete(true)} />
              </div>
            </div>

            {/* Carrinho */}
            <CarrinhoOrcamento
              portas={portas} avulsos={avulsos} frete={frete}
              onRemovePorta={(uid) => setPortas(prev => prev.filter(p => p.uid !== uid))}
              onRemoveAvulso={(uid) => setAvulsos(prev => prev.filter(a => a.uid !== uid))}
              onRemoveFrete={() => setFrete(null)}
            />
          </div>

          {/* Resumo */}
          <aside className="lg:sticky lg:top-20 lg:self-start rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-white">Resumo</h3>
            <ResumoLine label="Portas" value={totalPortas} />
            <ResumoLine label="Itens avulsos" value={totalAvulsos} />
            <ResumoLine label="Frete" value={totalFrete} />
            <div className="border-t border-white/10 pt-3 flex items-center justify-between">
              <span className="text-white/70">Total</span>
              <span className="text-xl font-bold text-blue-300">{fmt(total)}</span>
            </div>

            <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="w-full bg-gradient-to-br from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 text-white shadow-lg shadow-blue-500/30">
              {saveMut.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar e gerar PDF
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                if (!cliente.trim()) { toast.error('Informe o nome do cliente'); return; }
                if (!portas.length && !avulsos.length) { toast.error('Adicione ao menos um item'); return; }
                downloadMeuOrcamentoPDF({
                  numero: 0, data: new Date(), cliente: cliente.trim(),
                  vendedor: userRole?.nome || 'Elisa Portas', portas, avulsos, frete,
                });
              }}
              className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10"
            >
              <FileDown className="w-4 h-4 mr-2" /> Pré-visualizar PDF
            </Button>
          </aside>
        </div>
      </div>

      <AdicionarPortaDialog open={dlgPorta} onOpenChange={setDlgPorta} onAdd={(p) => setPortas(prev => [...prev, p])} />
      <AdicionarItemAvulsoDialog open={dlgAvulso} onOpenChange={setDlgAvulso} onAdd={(a) => setAvulsos(prev => [...prev, a])} />
      <AdicionarFreteDialog open={dlgFrete} onOpenChange={setDlgFrete} onAdd={(f) => setFrete(f)} />
    </div>
  );
}

function ActionCard({ icon, title, subtitle, onClick }: { icon: React.ReactNode; title: string; subtitle: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-white/10 transition text-left">
      <div className="w-10 h-10 rounded-lg bg-blue-500/15 border border-blue-400/20 flex items-center justify-center">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-white">{title}</div>
        <div className="text-[11px] text-white/40">{subtitle}</div>
      </div>
      <ChevronRight className="w-4 h-4 text-white/30" />
    </button>
  );
}

function ResumoLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-white/60">{label}</span>
      <span className="text-white">{fmt(value)}</span>
    </div>
  );
}
