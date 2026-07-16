import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronLeft, ChevronRight, FileClock, History } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type Desfecho = 'assinado' | 'dispensado' | 'liberado';

type EventoContrato = {
  key: string;
  venda_id: string;
  data_evento: string;
  cliente_nome: string;
  cpf_cliente: string | null;
  cidade: string | null;
  atendente_nome: string | null;
  desfecho: Desfecho;
  responsavel_nome: string | null;
  valor_venda: number;
};

const formatBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatDataHora = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const nomesMeses = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export default function HistoricoContratos() {
  const navigate = useNavigate();
  const hoje = new Date();
  const [mesRef, setMesRef] = useState<{ year: number; month: number }>({
    year: hoje.getFullYear(),
    month: hoje.getMonth(),
  });

  const { inicioISO, fimISO } = useMemo(() => {
    const inicio = new Date(mesRef.year, mesRef.month, 1);
    const fim = new Date(mesRef.year, mesRef.month + 1, 0);
    return {
      inicioISO: new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate(), 0, 0, 0).toISOString(),
      fimISO: new Date(fim.getFullYear(), fim.getMonth(), fim.getDate(), 23, 59, 59, 999).toISOString(),
    };
  }, [mesRef]);

  const { data, isLoading } = useQuery({
    queryKey: ['historico-contratos', inicioISO, fimISO],
    queryFn: async (): Promise<EventoContrato[]> => {
      const orExpr = [
        `and(contrato_assinado_em.gte.${inicioISO},contrato_assinado_em.lte.${fimISO})`,
        `and(contrato_dispensado_em.gte.${inicioISO},contrato_dispensado_em.lte.${fimISO})`,
        `and(contrato_liberado_em.gte.${inicioISO},contrato_liberado_em.lte.${fimISO})`,
      ].join(',');

      const { data: vendas, error } = await supabase
        .from('vendas')
        .select(`
          id, cliente_nome, cpf_cliente, cidade, valor_venda, atendente_id,
          contrato_url,
          contrato_assinado_em, contrato_anexado_por,
          contrato_dispensado, contrato_dispensado_em, contrato_dispensado_por,
          contrato_liberado_faturamento, contrato_liberado_em, contrato_liberado_por
        `)
        .eq('is_rascunho', false)
        .eq('dispensada_sistema', false)
        .or(orExpr);

      if (error) throw error;
      if (!vendas) return [];

      const userIds = new Set<string>();
      vendas.forEach((v: any) => {
        [v.atendente_id, v.contrato_anexado_por, v.contrato_dispensado_por, v.contrato_liberado_por]
          .filter(Boolean)
          .forEach((id: string) => userIds.add(id));
      });

      let nomeMap = new Map<string, string>();
      if (userIds.size > 0) {
        const { data: users } = await supabase
          .from('admin_users')
          .select('user_id, nome')
          .in('user_id', Array.from(userIds));
        (users || []).forEach((u: any) => {
          if (u.user_id) nomeMap.set(u.user_id, u.nome || 'Sem nome');
        });
      }

      const eventos: EventoContrato[] = [];
      const inMonth = (iso?: string | null) =>
        !!iso && iso >= inicioISO && iso <= fimISO;

      vendas.forEach((v: any) => {
        const base = {
          venda_id: v.id,
          cliente_nome: v.cliente_nome || 'Cliente não informado',
          cpf_cliente: v.cpf_cliente || null,
          cidade: v.cidade || null,
          atendente_nome: v.atendente_id ? nomeMap.get(v.atendente_id) || null : null,
          valor_venda: Number(v.valor_venda) || 0,
        };

        if (inMonth(v.contrato_assinado_em) && v.contrato_url) {
          eventos.push({
            ...base,
            key: `${v.id}-assinado`,
            desfecho: 'assinado',
            data_evento: v.contrato_assinado_em,
            responsavel_nome: v.contrato_anexado_por ? nomeMap.get(v.contrato_anexado_por) || null : null,
          });
        }
        if (v.contrato_dispensado && inMonth(v.contrato_dispensado_em)) {
          eventos.push({
            ...base,
            key: `${v.id}-dispensado`,
            desfecho: 'dispensado',
            data_evento: v.contrato_dispensado_em,
            responsavel_nome: v.contrato_dispensado_por ? nomeMap.get(v.contrato_dispensado_por) || null : null,
          });
        }
        if (
          v.contrato_liberado_faturamento &&
          !v.contrato_url &&
          !v.contrato_dispensado &&
          inMonth(v.contrato_liberado_em)
        ) {
          eventos.push({
            ...base,
            key: `${v.id}-liberado`,
            desfecho: 'liberado',
            data_evento: v.contrato_liberado_em,
            responsavel_nome: v.contrato_liberado_por ? nomeMap.get(v.contrato_liberado_por) || null : null,
          });
        }
      });

      return eventos.sort((a, b) => b.data_evento.localeCompare(a.data_evento));
    },
    staleTime: 30_000,
  });

  const linhas = data || [];
  const mudarMes = (delta: number) => {
    setMesRef((prev) => {
      const d = new Date(prev.year, prev.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const badgeClass = (d: Desfecho) =>
    cn(
      'h-5 px-2 text-[10px] font-medium rounded-md',
      d === 'assinado' && 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
      d === 'dispensado' && 'border-amber-500/40 bg-amber-500/10 text-amber-300',
      d === 'liberado' && 'border-white/25 bg-white/10 text-white/70',
    );

  const desfechoLabel = (d: Desfecho) =>
    d === 'assinado' ? 'Assinado' : d === 'dispensado' ? 'Dispensado' : 'Liberado sem contrato';

  return (
    <div className="min-h-screen bg-black text-white">
      <button
        onClick={() => navigate('/direcao/vendas/contratos')}
        className="fixed top-4 left-4 z-50 p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-all"
      >
        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/20">
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </div>
      </button>

      <div className="relative z-10 mx-auto px-[100px] pt-24 pb-12">
        <div className="mb-6 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/20">
            <History className="w-6 h-6" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Histórico de contratos</h1>
            <p className="text-sm text-white/60">Vendas assinadas, dispensadas ou liberadas sem contrato</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => mudarMes(-1)}
              className="bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-3 py-1.5 rounded-md bg-white/5 border border-white/10 text-sm text-white min-w-[160px] text-center">
              {nomesMeses[mesRef.month]} / {mesRef.year}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => mudarMes(1)}
              className="bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-white/70">Data</TableHead>
                <TableHead className="text-white/70">Cliente</TableHead>
                <TableHead className="text-white/70">Vendedor</TableHead>
                <TableHead className="text-white/70">Desfecho</TableHead>
                <TableHead className="text-white/70">Responsável</TableHead>
                <TableHead className="text-white/70 text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i} className="border-white/10">
                    <TableCell colSpan={6}>
                      <div className="h-6 bg-white/5 rounded animate-pulse" />
                    </TableCell>
                  </TableRow>
                ))
              ) : linhas.length === 0 ? (
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableCell colSpan={6} className="text-center py-10 text-white/50">
                    <FileClock className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    Nenhum contrato movimentado no período
                  </TableCell>
                </TableRow>
              ) : (
                linhas.map((e) => (
                  <TableRow key={e.key} className="border-white/10 hover:bg-white/5">
                    <TableCell className="text-white/80 text-sm">{formatDataHora(e.data_evento)}</TableCell>
                    <TableCell className="text-white text-sm">
                      {e.cliente_nome}
                      {e.cidade && <div className="text-[10px] text-white/40">{e.cidade}</div>}
                    </TableCell>
                    <TableCell className="text-white/80 text-sm">{e.atendente_nome || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={badgeClass(e.desfecho)}>
                        {desfechoLabel(e.desfecho)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-white/80 text-sm">{e.responsavel_nome || '—'}</TableCell>
                    <TableCell className="text-white text-right text-sm">{formatBRL(e.valor_venda)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}