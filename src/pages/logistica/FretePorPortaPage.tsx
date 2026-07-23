import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Save, Loader2 } from 'lucide-react';

import { AnimatedBreadcrumb } from '@/components/AnimatedBreadcrumb';
import { DelayedParticles } from '@/components/DelayedParticles';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { REGIOES_ORDEM, type RegiaoBrasil } from '@/utils/regioesBrasil';
import { useFretePorPortaRegiao } from '@/hooks/useFretePorPortaRegiao';

export default function FretePorPortaPage() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const { tabela, isLoading, refetch } = useFretePorPortaRegiao();
  const [values, setValues] = useState<Record<RegiaoBrasil, string>>({} as any);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (isLoading) return;
    const next = {} as Record<RegiaoBrasil, string>;
    for (const r of REGIOES_ORDEM) next[r] = String(tabela[r] ?? 0);
    setValues(next);
  }, [isLoading, tabela]);

  const preview = useMemo(() => {
    const rows: { regiao: RegiaoBrasil; valor: number }[] = [];
    for (const r of REGIOES_ORDEM) rows.push({ regiao: r, valor: parseFloat(values[r] || '0') || 0 });
    return rows;
  }, [values]);

  const salvar = async () => {
    setSaving(true);
    try {
      const payload = REGIOES_ORDEM.map((regiao) => ({
        regiao,
        valor_unitario: parseFloat(values[regiao] || '0') || 0,
      }));
      const { error } = await supabase
        .from('frete_por_porta_regiao' as any)
        .upsert(payload, { onConflict: 'regiao' });
      if (error) throw error;
      toast.success('Valores atualizados com sucesso');
      await refetch();
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao salvar valores');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-black overflow-hidden relative">
      <DelayedParticles />
      <AnimatedBreadcrumb
        items={[
          { label: 'Home', path: '/home' },
          { label: 'Logística', path: '/logistica' },
          { label: 'Frete', path: '/logistica/frete' },
          { label: 'Frete por Porta' },
        ]}
        mounted={mounted}
      />
      <button
        onClick={() => navigate('/logistica/frete')}
        className="fixed top-4 left-4 z-50 p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-all duration-300"
      >
        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/20">
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </div>
      </button>

      <div className="relative z-10 max-w-3xl mx-auto pt-24 pb-16 px-6">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-400/30 text-blue-300 text-xs mb-3">
            <MapPin className="w-3.5 h-3.5" /> Tabela de frete por porta
          </div>
          <h1 className="text-2xl md:text-3xl font-light text-white">Valor por porta por região</h1>
          <p className="text-sm text-white/60 mt-2">
            Estes valores são aplicados no cadastro de vendas quando o tipo de frete "Frete por Porta (Região)" é selecionado.
          </p>
        </div>

        <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-6 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-white/60">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando…
            </div>
          ) : (
            <>
              <div className="grid grid-cols-[1fr_180px] gap-3 text-xs text-white/50 uppercase tracking-wide px-2">
                <span>Região</span>
                <span className="text-right">Valor por porta (R$)</span>
              </div>
              {REGIOES_ORDEM.map((regiao) => (
                <div key={regiao} className="grid grid-cols-[1fr_180px] gap-3 items-center bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-blue-400" />
                    <span className="text-white font-medium">{regiao}</span>
                  </div>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={values[regiao] ?? ''}
                    onChange={(e) => setValues((prev) => ({ ...prev, [regiao]: e.target.value }))}
                    className="bg-white/5 border-white/10 text-white text-right"
                  />
                </div>
              ))}

              <div className="pt-2 flex justify-end">
                <Button
                  onClick={salvar}
                  disabled={saving}
                  className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 text-white"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Salvar valores
                </Button>
              </div>
            </>
          )}
        </div>

        <div className="mt-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-6">
          <h2 className="text-sm font-medium text-white mb-3">Simulação (3 portas)</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {preview.map((p) => (
              <div key={p.regiao} className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
                <p className="text-[11px] text-white/50 uppercase">{p.regiao}</p>
                <p className="text-blue-300 font-medium mt-1">
                  R$ {(p.valor * 3).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}