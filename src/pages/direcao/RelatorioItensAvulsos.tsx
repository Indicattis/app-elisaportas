import { Fragment, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, ChevronDown, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MinimalistLayout } from '@/components/MinimalistLayout';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type ItemAgg = {
  nome: string;
  tipo_produto: string;
  quantidade: number;
  valor_total: number;
};

type LinhaRelatorio = {
  vendedor_id: string;
  vendedor_nome: string;
  quantidade_itens: number;
  valor_total: number;
  itens: ItemAgg[];
};

const formatBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const nomesMeses = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export default function RelatorioItensAvulsos() {
  const navigate = useNavigate();
  const hoje = new Date();
  const [mesRef, setMesRef] = useState<{ year: number; month: number }>({
    year: hoje.getFullYear(),
    month: hoje.getMonth(), // 0-11
  });
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const { inicioISO, fimISO } = useMemo(() => {
    const inicio = new Date(mesRef.year, mesRef.month, 1);
    const fim = new Date(mesRef.year, mesRef.month + 1, 0);
    const pad = (n: number) => String(n).padStart(2, '0');
    return {
      inicioISO: `${inicio.getFullYear()}-${pad(inicio.getMonth() + 1)}-${pad(inicio.getDate())}T00:00:00.000Z`,
      fimISO: `${fim.getFullYear()}-${pad(fim.getMonth() + 1)}-${pad(fim.getDate())}T23:59:59.999Z`,
    };
  }, [mesRef]);

  const { data, isLoading } = useQuery({
    queryKey: ['relatorio-itens-avulsos', inicioISO, fimISO],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from('produtos_vendas')
        .select(`
          id,
          tipo_produto,
          descricao,
          quantidade,
          valor_total,
          venda:vendas!inner(
            id,
            atendente_id,
            data_venda,
            is_rascunho,
            dispensada_sistema
          )
        `)
        .in('tipo_produto', ['adicional', 'acessorio'])
        .gte('venda.data_venda', inicioISO)
        .lte('venda.data_venda', fimISO)
        .eq('venda.is_rascunho', false)
        .eq('venda.dispensada_sistema', false);

      if (error) throw error;

      const vendedorIds = Array.from(
        new Set(
          (rows || [])
            .map((r: any) => r.venda?.atendente_id)
            .filter((id: string | null | undefined): id is string => !!id),
        ),
      );

      let nomeMap = new Map<string, string>();
      if (vendedorIds.length > 0) {
        const { data: users } = await supabase
          .from('admin_users')
          .select('user_id, nome')
          .in('user_id', vendedorIds);
        (users || []).forEach((u: any) => {
          if (u.user_id) nomeMap.set(u.user_id, u.nome || 'Sem nome');
        });
      }

      const agrup = new Map<string, LinhaRelatorio & { _itens: Map<string, ItemAgg> }>();
      (rows || []).forEach((r: any) => {
        const vid = r.venda?.atendente_id;
        if (!vid) return;
        const atual = agrup.get(vid) || {
          vendedor_id: vid,
          vendedor_nome: nomeMap.get(vid) || 'Sem vendedor',
          quantidade_itens: 0,
          valor_total: 0,
          itens: [],
          _itens: new Map<string, ItemAgg>(),
        };
        const qtd = Number(r.quantidade) || 0;
        const valor = Number(r.valor_total) || 0;
        atual.quantidade_itens += qtd;
        atual.valor_total += valor;
        const nome = (r.descricao && String(r.descricao).trim()) || 'Sem descrição';
        const key = `${r.tipo_produto}::${nome}`;
        const item = atual._itens.get(key) || {
          nome,
          tipo_produto: r.tipo_produto,
          quantidade: 0,
          valor_total: 0,
        };
        item.quantidade += qtd;
        item.valor_total += valor;
        atual._itens.set(key, item);
        agrup.set(vid, atual);
      });

      return Array.from(agrup.values())
        .map((v) => ({
          vendedor_id: v.vendedor_id,
          vendedor_nome: v.vendedor_nome,
          quantidade_itens: v.quantidade_itens,
          valor_total: v.valor_total,
          itens: Array.from(v._itens.values()).sort(
            (a, b) => b.valor_total - a.valor_total,
          ),
        }))
        .sort((a, b) => b.valor_total - a.valor_total);
    },
    staleTime: 30_000,
  });

  const linhas = data || [];
  const totalQtd = linhas.reduce((s, l) => s + l.quantidade_itens, 0);
  const totalValor = linhas.reduce((s, l) => s + l.valor_total, 0);
  const todosExpandidos = linhas.length > 0 && linhas.every((l) => expandedIds.has(l.vendedor_id));

  const toggleAll = () => {
    if (todosExpandidos) setExpandedIds(new Set());
    else setExpandedIds(new Set(linhas.map((l) => l.vendedor_id)));
  };

  const mudarMes = (delta: number) => {
    setMesRef((prev) => {
      const d = new Date(prev.year, prev.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const headerActions = (
    <div className="flex items-center gap-2">
      {linhas.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={toggleAll}
          className="bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
        >
          {todosExpandidos ? 'Recolher todos' : 'Expandir todos'}
        </Button>
      )}
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
  );

  return (
    <MinimalistLayout
      title="Relatório de Itens Avulsos"
      subtitle="Adicionais e acessórios vendidos por vendedor"
      backPath="/direcao/vendas/todas"
      fullWidth
      breadcrumbItems={[
        { label: 'Home', path: '/home' },
        { label: 'Direção', path: '/direcao' },
        { label: 'Vendas', path: '/direcao/vendas' },
        { label: 'Todas as Vendas', path: '/direcao/vendas/todas' },
        { label: 'Itens Avulsos' },
      ]}
      headerActions={headerActions}
    >
      <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="text-white/70 w-[50px]"></TableHead>
              <TableHead className="text-white/70">Vendedor</TableHead>
              <TableHead className="text-white/70 text-right">Qtde. itens</TableHead>
              <TableHead className="text-white/70 text-right">Valor total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-white/10">
                  <TableCell colSpan={4}>
                    <div className="h-6 bg-white/5 rounded animate-pulse" />
                  </TableCell>
                </TableRow>
              ))
            ) : linhas.length === 0 ? (
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableCell colSpan={4} className="text-center py-10 text-white/50">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  Nenhum item avulso vendido no período
                </TableCell>
              </TableRow>
            ) : (
              <>
                {linhas.map((l) => {
                  const aberto = expandedIds.has(l.vendedor_id);
                  return (
                    <Fragment key={l.vendedor_id}>
                      <TableRow
                        onClick={() => toggleExpanded(l.vendedor_id)}
                        className="border-white/10 hover:bg-white/5 cursor-pointer"
                      >
                        <TableCell className="text-white/70">
                          {aberto ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </TableCell>
                        <TableCell className="text-white">{l.vendedor_nome}</TableCell>
                        <TableCell className="text-white/80 text-right">{l.quantidade_itens}</TableCell>
                        <TableCell className="text-white text-right">{formatBRL(l.valor_total)}</TableCell>
                      </TableRow>
                      {aberto && (
                        <TableRow
                          className="border-white/10 bg-white/[0.02] hover:bg-white/[0.02]"
                        >
                          <TableCell colSpan={4} className="p-0">
                            <div className="pl-12 pr-4 py-2">
                              {l.itens.length === 0 ? (
                                <p className="text-xs text-white/40 py-2">Sem itens</p>
                              ) : (
                                <Table>
                                  <TableHeader>
                                    <TableRow className="border-white/5 hover:bg-transparent">
                                      <TableHead className="text-white/50 text-xs h-8">Item</TableHead>
                                      <TableHead className="text-white/50 text-xs h-8 w-[120px]">Tipo</TableHead>
                                      <TableHead className="text-white/50 text-xs h-8 text-right w-[100px]">Qtde</TableHead>
                                      <TableHead className="text-white/50 text-xs h-8 text-right w-[160px]">Valor total</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {l.itens.map((it, idx) => (
                                      <TableRow
                                        key={`${it.tipo_produto}-${it.nome}-${idx}`}
                                        className="border-white/5 hover:bg-white/5"
                                      >
                                        <TableCell className="text-white/80 text-xs py-1.5">{it.nome}</TableCell>
                                        <TableCell className="text-white/50 text-xs py-1.5 capitalize">
                                          {it.tipo_produto}
                                        </TableCell>
                                        <TableCell className="text-white/80 text-xs text-right py-1.5">
                                          {it.quantidade}
                                        </TableCell>
                                        <TableCell className="text-white text-xs text-right py-1.5">
                                          {formatBRL(it.valor_total)}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
                <TableRow className="border-white/10 bg-white/5 hover:bg-white/5">
                  <TableCell />
                  <TableCell className="text-white font-semibold">Total geral</TableCell>
                  <TableCell className="text-white font-semibold text-right">{totalQtd}</TableCell>
                  <TableCell className="text-white font-semibold text-right">{formatBRL(totalValor)}</TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </MinimalistLayout>
  );
}