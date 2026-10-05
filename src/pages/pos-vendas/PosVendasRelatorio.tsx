import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Search, Star, ThumbsUp, Globe, ShoppingBag, ClipboardCheck, MessageSquare, FileDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { AnimatedBreadcrumb } from '@/components/AnimatedBreadcrumb';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { gerarRelatorioPosVendasPDF } from '@/utils/posVendasRelatorioPDF';

type Pesquisa = {
  id: string; pedido_id: string; created_at: string; comentario: string | null;
  nota_atendimento: number | null; nota_produto: number | null; nota_instalacao: number | null;
  recomendaria: boolean | null; avaliou_no_google: boolean; quis_comprar_avulsos: boolean;
  pedido?: { numero_pedido: string | null; cliente_nome: string | null } | null;
};

const avg = (arr: (number | null)[]) => {
  const v = arr.filter((n): n is number => typeof n === 'number');
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};
const pct = (n: number, t: number) => (t ? `${Math.round((n / t) * 100)}%` : '—');
const notaColor = (n: number | null) =>
  n == null ? 'text-white/30' : n >= 4 ? 'text-emerald-400' : n >= 3 ? 'text-yellow-400' : 'text-red-400';

export default function PosVendasRelatorio() {
  const navigate = useNavigate();
  const [busca, setBusca] = useState('');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');

  const { data = [], isLoading } = useQuery({
    queryKey: ['pos-vendas-relatorio'],
    queryFn: async () => {
      const { data: pesquisas, error } = await supabase
        .from('pesquisas_satisfacao')
        .select('id, pedido_id, created_at, comentario, nota_atendimento, nota_produto, nota_instalacao, recomendaria, avaliou_no_google, quis_comprar_avulsos')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const ids = [...new Set((pesquisas || []).map((p) => p.pedido_id))];
      const map = new Map<string, any>();
      for (let i = 0; i < ids.length; i += 200) {
        const { data: peds } = await supabase.from('pedidos_producao')
          .select('id, numero_pedido, cliente_nome').in('id', ids.slice(i, i + 200));
        (peds || []).forEach((p) => map.set(p.id, p));
      }
      return (pesquisas || []).map((p) => ({ ...p, pedido: map.get(p.pedido_id) })) as Pesquisa[];
    },
  });

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return data.filter((p) => {
      const d = p.created_at.slice(0, 10);
      if (inicio && d < inicio) return false;
      if (fim && d > fim) return false;
      if (q && !`${p.pedido?.numero_pedido ?? ''} ${p.pedido?.cliente_nome ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [data, busca, inicio, fim]);

  const total = filtradas.length;
  const mAt = avg(filtradas.map((p) => p.nota_atendimento));
  const mPr = avg(filtradas.map((p) => p.nota_produto));
  const mIn = avg(filtradas.map((p) => p.nota_instalacao));

  const distrib = [1, 2, 3, 4, 5].map((n) => ({
    nota: String(n),
    Atendimento: filtradas.filter((p) => p.nota_atendimento === n).length,
    Produto: filtradas.filter((p) => p.nota_produto === n).length,
    Instalação: filtradas.filter((p) => p.nota_instalacao === n).length,
  }));

  const mensal = useMemo(() => {
    const g = new Map<string, number[]>();
    filtradas.forEach((p) => {
      const m = p.created_at.slice(0, 7);
      const notas = [p.nota_atendimento, p.nota_produto, p.nota_instalacao].filter((n): n is number => n != null);
      g.set(m, [...(g.get(m) || []), ...notas]);
    });
    return [...g.entries()].sort().map(([m, v]) => ({
      mes: `${m.slice(5)}/${m.slice(2, 4)}`,
      media: v.length ? Number((v.reduce((a, b) => a + b, 0) / v.length).toFixed(2)) : 0,
    }));
  }, [filtradas]);

  const comentarios = filtradas.filter((p) => p.comentario?.trim()).slice(0, 8);

  const cards = [
    { label: 'Pesquisas', value: String(total), icon: ClipboardCheck },
    { label: 'Atendimento', value: mAt?.toFixed(1) ?? '—', icon: Star },
    { label: 'Produto', value: mPr?.toFixed(1) ?? '—', icon: Star },
    { label: 'Instalação', value: mIn?.toFixed(1) ?? '—', icon: Star },
    { label: 'Recomendaria', value: pct(filtradas.filter((p) => p.recomendaria).length, total), icon: ThumbsUp },
    { label: 'Avaliou no Google', value: pct(filtradas.filter((p) => p.avaliou_no_google).length, total), icon: Globe },
    { label: 'Quis avulsos', value: pct(filtradas.filter((p) => p.quis_comprar_avulsos).length, total), icon: ShoppingBag },
  ];

  const glass = 'rounded-xl bg-white/5 backdrop-blur-xl border border-white/10';
  const tooltipStyle = { background: '#0b1220', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' };

  return (
    <div className="min-h-screen bg-black text-white px-4 md:px-8 pt-20 pb-10">
      <AnimatedBreadcrumb
        items={[{ label: 'Home', path: '/home' }, { label: 'Pós-Vendas', path: '/pos-vendas' }, { label: 'Relatório' }]}
        mounted
      />
      <button onClick={() => navigate('/pos-vendas')} className={`fixed top-4 left-4 z-50 p-1.5 ${glass} hover:bg-white/10`}>
        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/20">
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </div>
      </button>

      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold">Relatório de Pesquisas de Pós-Vendas</h1>

        <div className={`${glass} p-4 flex flex-wrap gap-3 items-end`}>
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar cliente ou nº do pedido"
              className="pl-9 bg-white/5 border-white/10 text-white" />
          </div>
          <label className="text-xs text-white/60">De
            <Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} className="bg-white/5 border-white/10 text-white" />
          </label>
          <label className="text-xs text-white/60">Até
            <Input type="date" value={fim} onChange={(e) => setFim(e.target.value)} className="bg-white/5 border-white/10 text-white" />
          </label>
          <Button onClick={() => gerarRelatorioPosVendasPDF(filtradas, inicio, fim)} disabled={!filtradas.length}
            className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 text-white">
            <FileDown className="w-4 h-4 mr-2" />Gerar PDF
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {cards.map((c) => (
            <div key={c.label} className={`${glass} p-4`}>
              <div className="flex items-center gap-2 text-xs text-white/60"><c.icon className="w-4 h-4 text-blue-400" />{c.label}</div>
              <div className="text-2xl font-semibold mt-1">{c.value}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <div className={`${glass} p-4`}>
            <h2 className="text-sm text-white/70 mb-3">Distribuição das notas</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={distrib}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="nota" stroke="#94a3b8" /><YAxis allowDecimals={false} stroke="#94a3b8" />
                <Tooltip contentStyle={tooltipStyle} /><Legend />
                <Bar dataKey="Atendimento" fill="#3b82f6" /><Bar dataKey="Produto" fill="#60a5fa" /><Bar dataKey="Instalação" fill="#1d4ed8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className={`${glass} p-4`}>
            <h2 className="text-sm text-white/70 mb-3">Média geral por mês</h2>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={mensal}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="mes" stroke="#94a3b8" /><YAxis domain={[0, 5]} stroke="#94a3b8" />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="media" name="Média" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`${glass} overflow-x-auto`}>
          <table className="w-full text-sm">
            <thead className="text-white/50 text-xs">
              <tr className="border-b border-white/10">
                {['Data', 'Pedido', 'Cliente', 'Atend.', 'Produto', 'Instal.', 'Recomenda', 'Google', 'Comentário'].map((h) => (
                  <th key={h} className="text-left p-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={9} className="p-6 text-center text-white/50">Carregando...</td></tr>}
              {!isLoading && !filtradas.length && <tr><td colSpan={9} className="p-6 text-center text-white/50">Nenhuma pesquisa encontrada</td></tr>}
              {filtradas.map((p) => (
                <tr key={p.id} onClick={() => navigate(`/pos-vendas/pedidos/${p.pedido_id}/resposta`)}
                  className="border-b border-white/5 hover:bg-white/5 cursor-pointer">
                  <td className="p-3">{new Date(p.created_at).toLocaleDateString('pt-BR')}</td>
                  <td className="p-3">#{p.pedido?.numero_pedido ?? '—'}</td>
                  <td className="p-3">{p.pedido?.cliente_nome ?? '—'}</td>
                  {[p.nota_atendimento, p.nota_produto, p.nota_instalacao].map((n, i) => (
                    <td key={i} className={`p-3 font-semibold ${notaColor(n)}`}>{n ?? '—'}</td>
                  ))}
                  <td className="p-3">{p.recomendaria == null ? '—' : p.recomendaria ? 'Sim' : 'Não'}</td>
                  <td className="p-3">{p.avaliou_no_google ? 'Sim' : 'Não'}</td>
                  <td className="p-3 max-w-[260px] truncate text-white/70">{p.comentario || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={`${glass} p-4`}>
          <h2 className="text-sm text-white/70 mb-3 flex items-center gap-2"><MessageSquare className="w-4 h-4 text-blue-400" />Comentários recentes</h2>
          {!comentarios.length && <p className="text-white/50 text-sm">Sem comentários.</p>}
          <div className="grid md:grid-cols-2 gap-3">
            {comentarios.map((p) => (
              <div key={p.id} className="rounded-lg bg-white/5 border border-white/10 p-3">
                <div className="text-xs text-white/50 mb-1">{p.pedido?.cliente_nome ?? '—'} · {new Date(p.created_at).toLocaleDateString('pt-BR')}</div>
                <p className="text-sm">{p.comentario}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
