import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, FileDown, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AnimatedBreadcrumb } from '@/components/AnimatedBreadcrumb';
import { DelayedParticles } from '@/components/DelayedParticles';
import { Button } from '@/components/ui/button';
import { CarrinhoOrcamento } from '@/components/vendas/orcamento-novo/CarrinhoOrcamento';
import {
  downloadMeuOrcamentoPDF,
  type CartPorta, type CartAvulso, type CartFrete,
} from '@/utils/meuOrcamentoPDFGenerator';

const fmt = (n: number) => `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

export default function MeuOrcamentoDetalhe() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { userRole } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { const t = setTimeout(() => setMounted(true), 50); return () => clearTimeout(t); }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['meu-orcamento', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orcamentos')
        .select('id, numero_orcamento, cliente_nome, valor_total, valor_frete, created_at, campos_personalizados, status')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const cp: any = data?.campos_personalizados || {};
  const portas: CartPorta[] = Array.isArray(cp.portas) ? cp.portas : [];
  const avulsos: CartAvulso[] = Array.isArray(cp.avulsos) ? cp.avulsos : [];
  const frete: CartFrete | null = cp.frete || null;

  const totalPortas = portas.reduce((s, p) => s + p.preco_unitario * p.quantidade, 0);
  const totalAvulsos = avulsos.reduce((s, a) => s + a.preco_unitario * a.quantidade, 0);
  const total = Number(data?.valor_total || (totalPortas + totalAvulsos + (frete?.valor || 0)));

  const exportar = () => {
    if (!data) return;
    downloadMeuOrcamentoPDF({
      numero: data.numero_orcamento ?? 0,
      data: new Date(data.created_at),
      cliente: data.cliente_nome || '—',
      vendedor: userRole?.nome || 'Elisa Portas',
      portas, avulsos, frete,
    });
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center overflow-hidden relative">
      <DelayedParticles />
      <AnimatedBreadcrumb
        items={[
          { label: 'Home', path: '/home' },
          { label: 'Vendas', path: '/vendas' },
          { label: 'Meus Orçamentos', path: '/vendas/meus-orcamentos' },
          { label: `Nº ${String(data?.numero_orcamento ?? '').padStart(4, '0')}` },
        ]}
        mounted={mounted}
      />
      <button onClick={() => navigate('/vendas/meus-orcamentos')} className="fixed top-4 left-4 z-50 p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition">
        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/20">
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </div>
      </button>

      <div className="relative z-10 w-full max-w-5xl px-6 pt-20 pb-10">
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-blue-400 animate-spin" /></div>
        ) : !data ? (
          <div className="text-center py-20 text-white/40">Orçamento não encontrado</div>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h1 className="text-2xl font-semibold text-white">Proposta Nº {String(data.numero_orcamento ?? '').padStart(4, '0')}</h1>
                <p className="text-white/40 text-sm">{data.cliente_nome}</p>
              </div>
              <Button onClick={exportar} className="bg-blue-600 hover:bg-blue-500">
                <FileDown className="w-4 h-4 mr-2" /> Exportar PDF
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
              <CarrinhoOrcamento
                portas={portas} avulsos={avulsos} frete={frete}
                onRemovePorta={() => {}} onRemoveAvulso={() => {}} onRemoveFrete={() => {}}
              />
              <aside className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-4 space-y-2 self-start">
                <h3 className="text-sm font-semibold text-white mb-2">Resumo</h3>
                <Line label="Portas" v={totalPortas} />
                <Line label="Itens avulsos" v={totalAvulsos} />
                <Line label="Frete" v={Number(data.valor_frete || 0)} />
                <div className="border-t border-white/10 pt-3 flex items-center justify-between">
                  <span className="text-white/70">Total</span>
                  <span className="text-xl font-bold text-blue-300">{fmt(total)}</span>
                </div>
              </aside>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Line({ label, v }: { label: string; v: number }) {
  return <div className="flex items-center justify-between text-sm"><span className="text-white/60">{label}</span><span className="text-white">{fmt(v)}</span></div>;
}
