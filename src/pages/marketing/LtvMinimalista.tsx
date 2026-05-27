import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MinimalistLayout } from '@/components/MinimalistLayout';
import { Search, ArrowUpDown, TrendingUp, Users, DollarSign, ShoppingCart } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ClienteLtv {
  id: string;
  nome: string;
  totalVendas: number;
  numeroCompras: number;
  ticketMedio: number;
  primeiraCompra: string | null;
  ultimaCompra: string | null;
  canalAquisicaoNome: string | null;
  mesAquisicao: string | null;
  cac: number | null;
}

type SortKey = 'nome' | 'totalVendas' | 'numeroCompras' | 'ticketMedio' | 'cac';

// Maps canal name to the investment column key
function getInvestmentKey(canalNome: string): string | null {
  const lower = canalNome.toLowerCase();
  if (lower.includes('google')) return 'investimento_google_ads';
  if (lower.includes('meta') || lower.includes('facebook') || lower.includes('instagram')) return 'investimento_meta_ads';
  if (lower.includes('linkedin')) return 'investimento_linkedin_ads';
  if (lower.includes('tiktok') || lower.includes('outro')) return 'outros_investimentos';
  return null; // Indicação, Cliente fidelizado, Autorizado — no paid investment
}

export default function LtvMinimalista() {
  const [busca, setBusca] = useState('');
  const [canalFiltro, setCanalFiltro] = useState('todos');
  const [sortKey, setSortKey] = useState<SortKey>('totalVendas');
  const [sortAsc, setSortAsc] = useState(false);

  const { data: clientesLtv = [], isLoading } = useQuery({
    queryKey: ['ltv-clientes'],
    queryFn: async () => {
      const [{ data: clientes }, { data: vendas }, { data: canais }, { data: investimentos }] = await Promise.all([
        supabase.from('clientes' as any).select('id, nome, canal_aquisicao_id, created_at').eq('ativo', true),
        supabase.from('vendas').select('cliente_id, valor_venda, data_venda'),
        supabase.from('canais_aquisicao').select('id, nome'),
        supabase.from('marketing_investimentos').select('mes, investimento_google_ads, investimento_meta_ads, investimento_linkedin_ads, outros_investimentos'),
      ]);

      // Build canal map: id → nome
      const canalMap = new Map<string, string>();
      (canais || []).forEach((c: any) => canalMap.set(c.id, c.nome));

      // Build investment map: "YYYY-MM|investmentKey" → total across regions
      const investMap = new Map<string, number>();
      (investimentos || []).forEach((inv: any) => {
        const mes = (inv.mes as string)?.substring(0, 7); // YYYY-MM
        if (!mes) return;
        for (const key of ['investimento_google_ads', 'investimento_meta_ads', 'investimento_linkedin_ads', 'outros_investimentos']) {
          const mapKey = `${mes}|${key}`;
          investMap.set(mapKey, (investMap.get(mapKey) || 0) + (inv[key] || 0));
        }
      });

      // Build vendas map
      const vendasMap = new Map<string, { total: number; count: number; primeira: string; ultima: string }>();
      (vendas || []).forEach((v: any) => {
        if (!v.cliente_id) return;
        const entry = vendasMap.get(v.cliente_id) || { total: 0, count: 0, primeira: v.data_venda, ultima: v.data_venda };
        entry.total += v.valor_venda || 0;
        entry.count += 1;
        if (v.data_venda < entry.primeira) entry.primeira = v.data_venda;
        if (v.data_venda > entry.ultima) entry.ultima = v.data_venda;
        vendasMap.set(v.cliente_id, entry);
      });

      // Count clients per canal+month for CAC denominator
      const clientesPerCanalMes = new Map<string, number>();
      (clientes || []).forEach((c: any) => {
        if (!c.canal_aquisicao_id || !c.created_at) return;
        const mes = (c.created_at as string).substring(0, 7);
        const key = `${c.canal_aquisicao_id}|${mes}`;
        clientesPerCanalMes.set(key, (clientesPerCanalMes.get(key) || 0) + 1);
      });

      return (clientes || []).map((c: any): ClienteLtv => {
        const info = vendasMap.get(c.id);
        const canalNome = c.canal_aquisicao_id ? canalMap.get(c.canal_aquisicao_id) || null : null;
        const mesAquisicao = c.created_at ? (c.created_at as string).substring(0, 7) : null;

        let cac: number | null = null;
        if (canalNome && mesAquisicao) {
          const invKey = getInvestmentKey(canalNome);
          if (invKey) {
            const totalInvest = investMap.get(`${mesAquisicao}|${invKey}`) || 0;
            const numClientes = clientesPerCanalMes.get(`${c.canal_aquisicao_id}|${mesAquisicao}`) || 1;
            cac = totalInvest > 0 ? totalInvest / numClientes : 0;
          }
        }

        return {
          id: c.id,
          nome: c.nome,
          totalVendas: info?.total || 0,
          numeroCompras: info?.count || 0,
          ticketMedio: info ? info.total / info.count : 0,
          primeiraCompra: info?.primeira || null,
          ultimaCompra: info?.ultima || null,
          canalAquisicaoNome: canalNome,
          mesAquisicao,
          cac,
        };
      });
    },
  });

  const canaisUnicos = useMemo(() => {
    const set = new Set<string>();
    clientesLtv.forEach(c => { if (c.canalAquisicaoNome) set.add(c.canalAquisicaoNome); });
    return Array.from(set).sort();
  }, [clientesLtv]);

  const filtered = useMemo(() => {
    let list = clientesLtv;
    if (canalFiltro !== 'todos') {
      list = list.filter(c => c.canalAquisicaoNome === canalFiltro);
    }
    if (busca) {
      const term = busca.toLowerCase();
      list = list.filter(c => c.nome.toLowerCase().includes(term));
    }
    list.sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA === null && valB === null) return 0;
      if (valA === null) return 1;
      if (valB === null) return -1;
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });
    return list;
  }, [clientesLtv, busca, canalFiltro, sortKey, sortAsc]);

  const resumo = useMemo(() => {
    const comCompras = filtered.filter(c => c.numeroCompras > 0);
    const ltvTotal = comCompras.reduce((s, c) => s + c.totalVendas, 0);
    const ltvMedio = comCompras.length ? ltvTotal / comCompras.length : 0;
    const ticketGeral = comCompras.length
      ? comCompras.reduce((s, c) => s + c.ticketMedio, 0) / comCompras.length
      : 0;
    return { ltvTotal, ltvMedio, totalClientes: filtered.length, ticketGeral };
  }, [filtered]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const fmtDate = (d: string | null) => {
    if (!d) return '—';
    try {
      const dateStr = d.length === 10 ? d + 'T12:00:00' : d;
      const parsed = new Date(dateStr);
      if (isNaN(parsed.getTime())) return '—';
      return format(parsed, 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return '—';
    }
  };

  const cards = [
    { label: 'LTV Médio', value: fmt(resumo.ltvMedio), icon: TrendingUp },
    { label: 'LTV Total', value: fmt(resumo.ltvTotal), icon: DollarSign },
    { label: 'Total Clientes', value: resumo.totalClientes.toLocaleString('pt-BR'), icon: Users },
    { label: 'Ticket Médio Geral', value: fmt(resumo.ticketGeral), icon: ShoppingCart },
  ];

  const SortBtn = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <button onClick={() => handleSort(k)} className="flex items-center gap-1 hover:text-white transition-colors">
      {children}
      <ArrowUpDown className={`w-3 h-3 ${sortKey === k ? 'text-blue-400' : 'text-white/30'}`} />
    </button>
  );

  return (
    <MinimalistLayout
      title="LTV"
      subtitle="Lifetime Value dos clientes"
      backPath="/marketing/conversoes-hub"
      breadcrumbItems={[
        { label: 'Home', path: '/home' },
        { label: 'Marketing', path: '/marketing' },
        { label: 'Conversões', path: '/marketing/conversoes-hub' },
        { label: 'LTV' },
      ]}
    >
      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {cards.map(c => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10">
              <div className="px-4 py-3 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4 text-blue-400" strokeWidth={1.5} />
                  <span className="text-xs text-white/50">{c.label}</span>
                </div>
                <p className="text-lg font-semibold text-white tabular-nums">{isLoading ? '...' : c.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Busca + Filtro Canal */}
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/40"
            />
          </div>
        </div>
        <div className="p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10">
          <select
            value={canalFiltro}
            onChange={e => setCanalFiltro(e.target.value)}
            className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-blue-500/40 appearance-none cursor-pointer pr-8"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.4)' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
          >
            <option value="todos" className="bg-zinc-900 text-white">Todos os canais</option>
            {canaisUnicos.map(c => (
              <option key={c} value={c} className="bg-zinc-900 text-white">{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabela */}
      <div className="p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10">
        <div className="overflow-x-auto rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-white/50">
                <th className="text-left px-4 py-3 font-medium">
                  <SortBtn k="nome">Cliente</SortBtn>
                </th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Canal</th>
                <th className="text-center px-4 py-3 font-medium">
                  <SortBtn k="numeroCompras">Nº Compras</SortBtn>
                </th>
                <th className="text-center px-4 py-3 font-medium hidden md:table-cell">Primeira Compra</th>
                <th className="text-center px-4 py-3 font-medium hidden md:table-cell">Última Compra</th>
                <th className="text-right px-4 py-3 font-medium hidden md:table-cell">
                  <SortBtn k="cac">CAC</SortBtn>
                </th>
                <th className="text-right px-4 py-3 font-medium">
                  <SortBtn k="ticketMedio">Ticket Médio</SortBtn>
                </th>
                <th className="text-right px-4 py-3 font-medium">
                  <SortBtn k="totalVendas">LTV</SortBtn>
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="text-center py-10 text-white/40">Carregando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-white/40">Nenhum cliente encontrado</td></tr>
              ) : (
                filtered.map(c => (
                  <tr key={c.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 text-white font-medium">{c.nome}</td>
                    <td className="px-4 py-3 text-left text-white/50 hidden md:table-cell text-xs">{c.canalAquisicaoNome || '—'}</td>
                    <td className="px-4 py-3 text-center text-white/70 tabular-nums">{c.numeroCompras}</td>
                    <td className="px-4 py-3 text-center text-white/50 hidden md:table-cell tabular-nums">{fmtDate(c.primeiraCompra)}</td>
                    <td className="px-4 py-3 text-center text-white/50 hidden md:table-cell tabular-nums">{fmtDate(c.ultimaCompra)}</td>
                    <td className="px-4 py-3 text-right text-white/70 hidden md:table-cell tabular-nums">{c.cac !== null ? fmt(c.cac) : '—'}</td>
                    <td className="px-4 py-3 text-right text-white/70 tabular-nums">{fmt(c.ticketMedio)}</td>
                    <td className="px-4 py-3 text-right text-white font-semibold tabular-nums">{fmt(c.totalVendas)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </MinimalistLayout>
  );
}
