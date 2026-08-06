import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, Printer, ExternalLink, CheckCircle2, CircleDashed } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MinimalistLayout } from '@/components/MinimalistLayout';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import logoElisa from '@/assets/logo-elisa-dre.png';
import { useCategoriaDreConfig, type CategoriaDespesa } from '@/hooks/useCategoriaDreConfig';
import { fetchConfigLucro } from '@/hooks/useConfigLucro';
import { formatarMetodoPagamento, resumoPagamentoCompacto } from '@/utils/pagamentoResumo';

interface FaturamentoProduto {
  portas: number;
  pintura: number;
  instalacoes: number;
  acessorios: number;
  avulsos: number;
  fretes: number;
  total: number;
}

interface DespesaAgrupada {
  id: string;
  nome: string;
  valor_real: number;
  gastos?: { id: string; descricao: string | null; data: string; valor: number }[];
}

interface VendaComPortasRow {
  vendaId: string;
  dataVenda: string;
  clienteNome: string;
  valorVenda: number;
  metodoPagamento: string;
  temperaturaLabel: string;
  isFria: boolean;
  isCartao: boolean;
  itens: {
    id: string;
    descricao: string;
    quantidade: number;
    valorTabela: number;
    freteRateado: number;
    descontoLinha: number;
    valorFinal: number;
    excedido: number;
    lucro: number;
    descAuto: number;
    descFria: number;
    descGerente: number;
    descDiretor: number;
  }[];
}

interface VendaComItensSimplesRow {
  vendaId: string;
  dataVenda: string;
  clienteNome: string;
  valorVenda: number;
  itens: {
    id: string;
    descricao: string;
    quantidade: number;
    valorUnitario: number;
    valorBruto: number;
    descontoLinha: number;
    valorLiquido: number;
    lucro: number;
  }[];
}

interface TipoCustoVariavel {
  id: string;
  nome: string;
  valor_maximo_mensal: number;
}

interface FolhaColaboradorDetalhe {
  id: string;
  nome: string;
  setor: string;
  em_folha: boolean;
  salario: number;
  aux_combustivel: number;
  bonificacao: number;
  hora_extra: number;
  insalubridade_val: number;
  fgts_val: number;
  prev_13: number;
  fgts_13: number;
  ferias: number;
  multa_fgts: number;
  total: number;
}

// "Salário" ou "Folha" vai para folha salarial
const isFolha = (nome: string) => /sal[áa]rio|folha/i.test(nome);

function DespesaSectionReadOnly({
  title,
  despesas,
  total,
  formatCurrency,
  tiposDisponiveis,
  onClickTipo,
  debita,
}: {
  title: string;
  despesas: DespesaAgrupada[];
  total: number;
  formatCurrency: (v: number) => string;
  tiposDisponiveis?: TipoCustoVariavel[];
  onClickTipo?: (tipoCustoId: string, nome: string) => void;
  debita?: boolean;
}) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white/70 uppercase">{title}</h3>
        {debita !== undefined && (
          <span
            className={
              debita
                ? 'text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                : 'text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30'
            }
            title={debita ? 'Esta categoria debita do lucro no DRE' : 'Esta categoria não debita do lucro no DRE'}
          >
            {debita ? '● Debita DRE' : '○ Não debita'}
          </span>
        )}
      </div>

      {despesas.length === 0 ? (
        <p className="text-white/30 text-sm">Nenhuma despesa registrada</p>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="h-[24px]">
              <th className="text-left text-[10px] uppercase tracking-wider text-white/40 font-medium">Nome</th>
              <th className="text-right text-[10px] uppercase tracking-wider text-white/40 font-medium w-28">Valor real</th>
              {tiposDisponiveis && tiposDisponiveis.length > 0 && (
                <th className="text-right text-[10px] uppercase tracking-wider text-white/40 font-medium w-28">Projetado</th>
              )}
            </tr>
          </thead>
          <tbody>
            {despesas.map(d => {
              const tipoRef = tiposDisponiveis?.find(t => t.nome === d.nome);
              const clickable = !!onClickTipo;
              return (
                <tr key={d.id} className="h-[30px] border-b border-white/5 last:border-0">
                  <td
                    className={`align-middle text-xs ${clickable ? 'text-white/60 hover:text-white cursor-pointer underline-offset-2 hover:underline' : 'text-white/60'}`}
                    onClick={clickable ? () => onClickTipo!(d.id, d.nome) : undefined}
                  >
                    {d.nome}
                  </td>
                  <td className={`align-middle text-right text-xs font-medium ${tipoRef ? (d.valor_real > tipoRef.valor_maximo_mensal ? 'text-red-400' : d.valor_real < tipoRef.valor_maximo_mensal ? 'text-emerald-400' : 'text-white') : 'text-white'}`}>
                    {formatCurrency(d.valor_real)}
                  </td>
                  {tiposDisponiveis && tiposDisponiveis.length > 0 && (
                    <td className="align-middle text-right text-xs text-white/40">
                      {tipoRef ? formatCurrency(tipoRef.valor_maximo_mensal) : '—'}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          {despesas.length > 0 && (
            <tfoot>
              <tr className="h-[30px] border-t border-white/10">
                <td className="text-xs font-semibold text-white/80">Total</td>
                <td className="text-right text-xs font-bold text-white">{formatCurrency(total)}</td>
                {tiposDisponiveis && tiposDisponiveis.length > 0 && (
                  <td className="text-right text-xs font-bold text-white/40">
                    {formatCurrency(
                      Array.from(new Set(despesas.map(d => d.nome))).reduce((s, nome) => {
                        const t = tiposDisponiveis.find(t => t.nome === nome);
                        return s + (t?.valor_maximo_mensal || 0);
                      }, 0)
                    )}
                  </td>
                )}
              </tr>
            </tfoot>
          )}
        </table>
      )}
    </div>
  );
}

// =============== Modal com lançamentos manuais do tipo selecionado ===============
interface GastoRow {
  id: string;
  data: string;
  descricao: string | null;
  valor: number;
}

function GastosDoTipoDialog({
  open,
  onOpenChange,
  mes,
  tipoCustoId,
  tipoNome,
  formatCurrency,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  mes: string;
  tipoCustoId: string | null;
  tipoNome: string;
  formatCurrency: (v: number) => string;
}) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<GastoRow[]>([]);

  useEffect(() => {
    if (!open || !tipoCustoId || !mes) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const start = `${mes}-01`;
      const [y, m] = mes.split('-').map(Number);
      const end = new Date(y, m, 0).toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('gastos' as any)
        .select('id, data, descricao, valor')
        .eq('tipo_custo_id', tipoCustoId)
        .gte('data', start)
        .lte('data', end)
        .order('data', { ascending: false });

      if (error || !data) {
        if (!cancelled) { setRows([]); setLoading(false); }
        return;
      }
      const mapped: GastoRow[] = (data as any[]).map((g: any) => ({
        id: g.id,
        data: g.data,
        descricao: g.descricao,
        valor: Number(g.valor) || 0,
      }));
      if (!cancelled) { setRows(mapped); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [open, tipoCustoId, mes]);

  const total = rows.reduce((s, r) => s + r.valor, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-[#0a0a0a] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">{tipoNome}</DialogTitle>
          <DialogDescription className="text-white/50">
            Lançamentos em {mes} • {rows.length} {rows.length === 1 ? 'lançamento' : 'lançamentos'}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg bg-white/5 border border-white/10 overflow-hidden max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="p-8 flex items-center justify-center text-white/50">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-white/40 text-sm">
              Nenhum lançamento neste tipo para o mês.
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[#0a0a0a]">
                <tr className="border-b border-white/10 text-white/40 uppercase text-[10px]">
                  <th className="text-left p-2 font-medium">Data</th>
                  <th className="text-left p-2 font-medium">Descrição</th>
                  <th className="text-right p-2 font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                    <td className="p-2 text-white/70 whitespace-nowrap">
                      {format(new Date(r.data + 'T12:00:00'), 'dd/MM/yyyy')}
                    </td>
                    <td className="p-2 text-white/80">{r.descricao || '—'}</td>
                    <td className="p-2 text-right font-medium text-white tabular-nums">
                      {formatCurrency(r.valor)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-white/10 bg-white/5">
                  <td colSpan={2} className="p-2 text-white/70 font-semibold">Total</td>
                  <td className="p-2 text-right font-bold text-white tabular-nums">{formatCurrency(total)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button
            variant="outline"
            className="bg-white/5 border-white/20 text-white hover:bg-white/10"
            onClick={() => navigate(`/direcao/estrategia/despesas/${mes}`)}
          >
            <ExternalLink className="h-4 w-4 mr-2" />Abrir em Despesas
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =============== Layout dedicado para impressão (PDF) ===============
function PrintReport({
  mesNome,
  faturamento,
  lucro,
  descontoExcedido,
  despesasFixas,
  despesasFolha,
  folhaDetalhada,
  despesasVariaveis,
  despesasImpostos,
  despesasInvestimentos,
  despesasFornecedores,
  despesasFinanciamentos,
  despesasFretes,
  despesasAutorizados,
  despesasSalarios,
  tiposCustosFixos,
  tiposCustosVariaveis,
  tiposCustosImpostos,
  tiposCustosInvestimentos,
  tiposCustosFornecedores,
  tiposCustosFinanciamentos,
  tiposCustosFretes,
  tiposCustosAutorizados,
  tiposCustosSalarios,
  totalDespFixas,
  totalDespFolha,
  totalDespVariaveis,
  totalDespImpostos,
  totalDespInvestimentos,
  totalDespFornecedores,
  totalDespFinanciamentos,
  totalDespFretes,
  totalDespAutorizados,
  totalDespSalarios,
  totalProjetadoAnual,
  topAvulsos,
  estoqueResumo,
  lucroLiquidoFinal,
  percBrutoFinal,
  percLiquidFinal,
  formatCurrency,
  vendasListagem,
  debitaCat,
}: {
  mesNome: string;
  faturamento: FaturamentoProduto;
  lucro: FaturamentoProduto;
  descontoExcedido: FaturamentoProduto;
  despesasFixas: DespesaAgrupada[];
  despesasFolha: DespesaAgrupada[];
  folhaDetalhada: FolhaColaboradorDetalhe[];
  despesasVariaveis: DespesaAgrupada[];
  despesasImpostos: DespesaAgrupada[];
  despesasInvestimentos: DespesaAgrupada[];
  despesasFornecedores: DespesaAgrupada[];
  despesasFinanciamentos: DespesaAgrupada[];
  despesasFretes: DespesaAgrupada[];
  despesasAutorizados: DespesaAgrupada[];
  despesasSalarios: DespesaAgrupada[];
  tiposCustosFixos: TipoCustoVariavel[];
  tiposCustosVariaveis: TipoCustoVariavel[];
  tiposCustosImpostos: TipoCustoVariavel[];
  tiposCustosInvestimentos: TipoCustoVariavel[];
  tiposCustosFornecedores: TipoCustoVariavel[];
  tiposCustosFinanciamentos: TipoCustoVariavel[];
  tiposCustosFretes: TipoCustoVariavel[];
  tiposCustosAutorizados: TipoCustoVariavel[];
  tiposCustosSalarios: TipoCustoVariavel[];
  totalDespFixas: number;
  totalDespFolha: number;
  totalDespVariaveis: number;
  totalDespImpostos: number;
  totalDespInvestimentos: number;
  totalDespFornecedores: number;
  totalDespFinanciamentos: number;
  totalDespFretes: number;
  totalDespAutorizados: number;
  totalDespSalarios: number;
  totalProjetadoAnual: number;
  topAvulsos: { nome: string; qtd: number }[];
  estoqueResumo: { valorTotal: number; totalItens: number };
  lucroLiquidoFinal: number;
  percBrutoFinal: number;
  percLiquidFinal: number;
  formatCurrency: (v: number) => string;
  vendasListagem: { id: string; data: string; cliente: string; valorTabela: number; valorVenda: number; desconto: number; lucro: number; temperatura: string; pagamento: string }[];
  debitaCat: (categoria: CategoriaDespesa) => boolean;
}) {
  const SECTION: React.CSSProperties = { marginTop: 18, pageBreakInside: 'avoid' };
  const H2: React.CSSProperties = {
    fontSize: '11pt',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: '#ffffff',
    background: '#1d76cf',
    padding: '6px 10px',
    borderRadius: 3,
    marginBottom: 8,
    textAlign: 'center',
  };
  const TH: React.CSSProperties = {
    background: '#f1f5f9',
    color: '#475569',
    fontSize: '8pt',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    padding: '6px 8px',
    textAlign: 'left',
    borderBottom: '1px solid #cbd5e1',
  };
  const TD: React.CSSProperties = {
    fontSize: '9.5pt',
    padding: '5px 8px',
    borderBottom: '1px solid #e2e8f0',
  };
  const tdRight = { ...TD, textAlign: 'right' as const, fontVariantNumeric: 'tabular-nums' };
  const trZebra = (i: number): React.CSSProperties => ({
    background: i % 2 === 0 ? '#ffffff' : '#fafbfc',
  });
  const positive = (v: number) => (v >= 0 ? '#047857' : '#b91c1c');

  const badgeDebita = (deb: boolean): React.ReactNode => (
    <span
      style={{
        display: 'inline-block',
        marginLeft: 6,
        padding: '1px 6px',
        borderRadius: 3,
        fontSize: '7pt',
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        color: deb ? '#065f46' : '#78350f',
        background: deb ? '#d1fae5' : '#fef3c7',
        border: `1px solid ${deb ? '#10b981' : '#f59e0b'}`,
        verticalAlign: 'middle',
      }}
    >
      {deb ? '● Debita DRE' : '○ Não debita'}
    </span>
  );

  const kpiBox = (label: string, value: string, color = '#0f172a', accent = '#1d76cf'): React.CSSProperties => ({});

  return (
    <div style={{ padding: 0, color: '#0f172a' }}>
      {/* CABEÇALHO */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img
            src={logoElisa}
            alt="Elisa Portas de Enrolar"
            style={{ height: 48, objectFit: 'contain' }}
          />
          <div>
          <div style={{ fontSize: '8pt', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600 }}>
            Relatório Gerencial
          </div>
          <h1 style={{ fontSize: '20pt', fontWeight: 800, margin: '2px 0 0 0', color: '#0f172a', letterSpacing: '-0.02em' }}>
            Demonstrativo de Resultados
          </h1>
          <div style={{ fontSize: '11pt', color: '#1d76cf', fontWeight: 600, marginTop: 2, textTransform: 'capitalize' }}>
            {mesNome}
          </div>
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '8pt', color: '#64748b', lineHeight: 1.5 }}>
          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '9pt' }}>D.R.E</div>
          <div>Emitido em</div>
          <div>{format(new Date(), "dd/MM/yyyy 'às' HH:mm")}</div>
        </div>
      </div>

      {/* KPIs PRINCIPAIS */}
      <div style={{ display: 'flex', gap: 8, marginTop: 14, ...{ pageBreakInside: 'avoid' } as any }}>
        {[
          { label: 'Faturamento Bruto', value: formatCurrency(faturamento.total), color: '#0f172a', accent: '#1d76cf' },
          { label: 'Lucro Bruto', value: formatCurrency(lucro.total - descontoExcedido.total), color: positive(lucro.total - descontoExcedido.total), accent: '#1d76cf' },
          { label: 'Margem Bruta', value: `${percBrutoFinal.toFixed(1)}%`, color: positive(percBrutoFinal), accent: '#1d76cf' },
          { label: 'Lucro Líquido', value: formatCurrency(lucroLiquidoFinal), color: positive(lucroLiquidoFinal), accent: '#047857' },
          { label: 'Margem Líquida', value: `${percLiquidFinal.toFixed(1)}%`, color: positive(percLiquidFinal), accent: '#047857' },
        ].map((k, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              border: `1.5px solid ${k.accent}`,
              borderRadius: 4,
              padding: '8px 10px',
              background: '#fafbfc',
            }}
          >
            <div style={{ fontSize: '7pt', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
              {k.label}
            </div>
            <div style={{ fontSize: '11pt', fontWeight: 800, color: k.color, marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* FATURAMENTO POR CATEGORIA */}
      <div style={SECTION}>
        <div style={H2}>1. Faturamento por Categoria</div>
        <table>
          <thead>
            <tr>
              <th style={TH}>Categoria</th>
              <th style={{ ...TH, textAlign: 'right' }}>Faturamento</th>
              <th style={{ ...TH, textAlign: 'right' }}>Desc. Excedido</th>
              <th style={{ ...TH, textAlign: 'right' }}>Lucro</th>
              <th style={{ ...TH, textAlign: 'right' }}>Margem %</th>
            </tr>
          </thead>
          <tbody>
            {[
              { key: 'portas', label: 'Portas' },
              { key: 'pintura', label: 'Pintura' },
              { key: 'instalacoes', label: 'Instalações' },
              { key: 'fretes', label: 'Fretes' },
              { key: 'acessorios', label: 'Acessórios' },
              { key: 'avulsos', label: 'Itens Avulsos' },
            ].map((c, i) => {
              const f = faturamento[c.key as keyof FaturamentoProduto];
              const excCol = c.key === 'fretes'
                ? totalDespFretes
                : (descontoExcedido[c.key as keyof FaturamentoProduto] || 0);
              const l = c.key === 'fretes'
                ? (faturamento.fretes - totalDespFretes)
                : (lucro[c.key as keyof FaturamentoProduto] - excCol);
              const m = f > 0 ? (l / f) * 100 : 0;
              return (
                <tr key={c.key} style={trZebra(i)}>
                  <td style={{ ...TD, fontWeight: 600 }}>{c.label}</td>
                  <td style={tdRight}>{formatCurrency(f)}</td>
                  <td style={{ ...tdRight, color: excCol > 0 ? '#b91c1c' : '#94a3b8' }}>
                    {excCol > 0 ? `- ${formatCurrency(excCol)}` : '—'}
                  </td>
                  <td style={{ ...tdRight, color: positive(l), fontWeight: 600 }}>{formatCurrency(l)}</td>
                  <td style={{ ...tdRight, color: positive(m), fontWeight: 600 }}>{m.toFixed(1)}%</td>
                </tr>
              );
            })}
            <tr style={{ background: '#1d76cf', color: '#fff' }}>
              <td style={{ ...TD, fontWeight: 800, color: '#fff', borderBottom: 'none' }}>TOTAL</td>
              <td style={{ ...tdRight, fontWeight: 800, color: '#fff', borderBottom: 'none' }}>
                {formatCurrency(faturamento.total)}
              </td>
              <td style={{ ...tdRight, fontWeight: 800, color: '#fff', borderBottom: 'none' }}>
                {descontoExcedido.total > 0 ? `- ${formatCurrency(descontoExcedido.total)}` : '—'}
              </td>
              <td style={{ ...tdRight, fontWeight: 800, color: '#fff', borderBottom: 'none' }}>
                {formatCurrency(lucro.total - descontoExcedido.total)}
              </td>
              <td style={{ ...tdRight, fontWeight: 800, color: '#fff', borderBottom: 'none' }}>
                {percBrutoFinal.toFixed(1)}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* RESUMO FINAL (movido para após Faturamento por Categoria) */}
      <div style={SECTION}>
        <div style={H2}>2. Resumo Final</div>
        <div style={{ fontSize: '8pt', color: '#475569', marginBottom: 6 }}>
          Legenda:
          <span style={{ display: 'inline-block', marginLeft: 8, padding: '1px 6px', borderRadius: 3, fontSize: '7pt', fontWeight: 700, color: '#065f46', background: '#d1fae5', border: '1px solid #10b981' }}>● Debita DRE</span>
          <span style={{ marginLeft: 4, color: '#64748b' }}>= reduz o lucro líquido</span>
          <span style={{ display: 'inline-block', marginLeft: 10, padding: '1px 6px', borderRadius: 3, fontSize: '7pt', fontWeight: 700, color: '#78350f', background: '#fef3c7', border: '1px solid #f59e0b' }}>○ Não debita</span>
          <span style={{ marginLeft: 4, color: '#64748b' }}>= informativo, não reduz o lucro</span>
        </div>
        <table>
          <tbody>
            {[
              { l: 'Faturamento Bruto', v: formatCurrency(faturamento.total), c: '#0f172a', b: false, cat: null as CategoriaDespesa | null },
              { l: '(–) Desconto Excedido', v: formatCurrency(descontoExcedido.total), c: '#b91c1c', b: false, cat: null as CategoriaDespesa | null },
              { l: 'Margem Bruta', v: `${percBrutoFinal.toFixed(1)}%`, c: positive(percBrutoFinal), b: false, cat: null },
              { l: 'Lucro Bruto', v: formatCurrency(lucro.total - descontoExcedido.total), c: positive(lucro.total - descontoExcedido.total), b: true, cat: null },
              { l: '(–) Folha Salarial', v: formatCurrency(totalDespFolha), c: '#b91c1c', b: false, cat: 'folha' as CategoriaDespesa },
              { l: '(–) Despesas Fixas', v: formatCurrency(totalDespFixas), c: '#b91c1c', b: false, cat: 'fixa' as CategoriaDespesa },
              { l: '(–) Despesas Variáveis', v: formatCurrency(totalDespVariaveis), c: '#b91c1c', b: false, cat: 'variavel' as CategoriaDespesa },
              { l: '(–) Despesas de Imposto', v: formatCurrency(totalDespImpostos), c: '#b91c1c', b: false, cat: 'imposto' as CategoriaDespesa },
              { l: '(–) Investimentos', v: formatCurrency(totalDespInvestimentos), c: '#b91c1c', b: false, cat: 'investimento' as CategoriaDespesa },
              { l: '(–) Fornecedores', v: formatCurrency(totalDespFornecedores), c: '#b91c1c', b: false, cat: 'fornecedor' as CategoriaDespesa },
              { l: '(–) Financiamentos', v: formatCurrency(totalDespFinanciamentos), c: '#b91c1c', b: false, cat: 'financiamento' as CategoriaDespesa },
              { l: '(–) Fretes e Logística', v: formatCurrency(totalDespFretes), c: '#b91c1c', b: false, cat: 'frete' as CategoriaDespesa },
              { l: '(–) Autorizados', v: formatCurrency(totalDespAutorizados), c: '#b91c1c', b: false, cat: 'autorizado' as CategoriaDespesa },
              { l: '(–) Salários', v: formatCurrency(totalDespSalarios), c: '#b91c1c', b: false, cat: 'salario' as CategoriaDespesa },
            ]
              .map((r, idx) => ({ r, idx }))
              .sort((a, b) => {
                if (!a.r.cat || !b.r.cat) return a.idx - b.idx;
                const dbt = (c: CategoriaDespesa) => (c === 'frete' ? true : debitaCat(c));
                const da = dbt(a.r.cat) ? 0 : 1;
                const db = dbt(b.r.cat) ? 0 : 1;
                return da !== db ? da - db : a.idx - b.idx;
              })
              .map(({ r }) => r)
              .map((r, i) => (
              <tr key={i} style={trZebra(i)}>
                <td style={{ ...TD, fontWeight: r.b ? 700 : 500 }}>
                  {r.l}
                  {r.cat ? badgeDebita(r.cat === 'frete' ? true : debitaCat(r.cat)) : null}
                </td>
                <td style={{ ...tdRight, color: r.c, fontWeight: r.b ? 800 : 600 }}>{r.v}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: 'flex', gap: 8, marginTop: 10, pageBreakInside: 'avoid' }}>
          <div
            style={{
              flex: 1,
              border: `1.5px solid ${positive(percLiquidFinal)}`,
              borderRadius: 4,
              padding: '10px 12px',
              background: '#fafbfc',
            }}
          >
            <div style={{ fontSize: '7pt', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
              Margem Líquida
            </div>
            <div style={{ fontSize: '14pt', fontWeight: 800, color: positive(percLiquidFinal), marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>
              {percLiquidFinal.toFixed(1)}%
            </div>
          </div>
          <div
            style={{
              flex: 1,
              border: `1.5px solid ${positive(lucroLiquidoFinal)}`,
              borderRadius: 4,
              padding: '10px 12px',
              background: '#fafbfc',
            }}
          >
            <div style={{ fontSize: '7pt', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
              Lucro Líquido Final
            </div>
            <div style={{ fontSize: '14pt', fontWeight: 800, color: positive(lucroLiquidoFinal), marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>
              {formatCurrency(lucroLiquidoFinal)}
            </div>
          </div>
        </div>
      </div>

      {/* ========= PÁGINAS EM PAISAGEM (conteúdo rotacionado 90°) ========= */}

      {/* Página 2: Vendas do Mês */}
      {vendasListagem.length > 0 && (
        <div className="pdf-landscape-page">
          <div className="pdf-landscape-content">
            <div style={H2}>3. Vendas do Mês</div>
            <table>
              <thead style={{ display: 'table-header-group' }}>
                <tr>
                  <th style={{ ...TH, width: 55 }}>Data</th>
                  <th style={TH}>Cliente</th>
                  <th style={{ ...TH, width: 60 }}>Temp.</th>
                  <th style={{ ...TH, width: 120 }}>Pagamento</th>
                  <th style={{ ...TH, textAlign: 'right', width: 110 }}>Valor Tabela</th>
                  <th style={{ ...TH, textAlign: 'right', width: 110 }}>Valor Venda</th>
                  <th style={{ ...TH, textAlign: 'right', width: 110 }}>Desc./Acrésc.</th>
                  <th style={{ ...TH, textAlign: 'right', width: 110 }}>Lucro</th>
                </tr>
              </thead>
              <tbody>
                {vendasListagem.map((v, i) => {
                  const dataFmt = (() => {
                    try {
                      return format(new Date(v.data), 'dd/MM');
                    } catch {
                      return '—';
                    }
                  })();
                  return (
                    <tr key={v.id} style={trZebra(i)}>
                      <td style={{ ...TD, fontVariantNumeric: 'tabular-nums' }}>{dataFmt}</td>
                      <td style={TD}>{v.cliente || '—'}</td>
                      <td style={{ ...TD, color: v.temperatura === 'Fria' ? '#1d4ed8' : v.temperatura === 'Quente' ? '#b91c1c' : '#64748b', fontWeight: 600 }}>
                        {v.temperatura}
                      </td>
                      <td style={TD}>{v.pagamento}</td>
                      <td style={tdRight}>{formatCurrency(v.valorTabela)}</td>
                      <td style={tdRight}>{formatCurrency(v.valorVenda)}</td>
                      <td style={{ ...tdRight, color: v.desconto > 0 ? '#b91c1c' : v.desconto < 0 ? '#047857' : undefined, fontWeight: 600 }}>
                        {formatCurrency(v.desconto)}
                      </td>
                      <td style={{ ...tdRight, color: positive(v.lucro), fontWeight: 600 }}>
                        {formatCurrency(v.lucro)}
                      </td>
                    </tr>
                  );
                })}
                {(() => {
                  const tT = vendasListagem.reduce((s, v) => s + v.valorTabela, 0);
                  const tV = vendasListagem.reduce((s, v) => s + v.valorVenda, 0);
                  const tD = vendasListagem.reduce((s, v) => s + v.desconto, 0);
                  const tL = vendasListagem.reduce((s, v) => s + v.lucro, 0);
                  return (
                    <tr style={{ background: '#1d76cf', color: '#fff' }}>
                      <td style={{ ...TD, fontWeight: 800, color: '#fff', borderBottom: 'none' }} colSpan={4}>TOTAL</td>
                      <td style={{ ...tdRight, fontWeight: 800, color: '#fff', borderBottom: 'none' }}>{formatCurrency(tT)}</td>
                      <td style={{ ...tdRight, fontWeight: 800, color: '#fff', borderBottom: 'none' }}>{formatCurrency(tV)}</td>
                      <td style={{ ...tdRight, fontWeight: 800, color: '#fff', borderBottom: 'none' }}>{formatCurrency(tD)}</td>
                      <td style={{ ...tdRight, fontWeight: 800, color: '#fff', borderBottom: 'none' }}>{formatCurrency(tL)}</td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="pdf-landscape-page">
        <div className="pdf-landscape-content">
          <div style={H2}>4. Folha Salarial {badgeDebita(debitaCat('folha'))}</div>
          <PrintFolhaSalarialDetalhada
            items={folhaDetalhada}
            formatCurrency={formatCurrency}
          />
        </div>
      </div>

      <div className="pdf-landscape-page">
        <div className="pdf-landscape-content">
          <div style={H2}>5. Despesas Fixas {badgeDebita(debitaCat('fixa'))}</div>
          <PrintDespesaTable
            items={despesasFixas}
            total={totalDespFixas}
            formatCurrency={formatCurrency}
            tiposDisponiveis={tiposCustosFixos.filter(t => !isFolha(t.nome))}
          />
        </div>
      </div>

      <div className="pdf-landscape-page">
        <div className="pdf-landscape-content">
          <div style={H2}>6. Despesas Variáveis {badgeDebita(debitaCat('variavel'))}</div>
          <PrintDespesaTable
            items={despesasVariaveis}
            total={totalDespVariaveis}
            formatCurrency={formatCurrency}
            tiposDisponiveis={tiposCustosVariaveis}
          />
        </div>
      </div>

      <div className="pdf-landscape-page">
        <div className="pdf-landscape-content">
          <div style={H2}>7. Despesas de Imposto {badgeDebita(debitaCat('imposto'))}</div>
          <PrintDespesaTable
            items={despesasImpostos}
            total={totalDespImpostos}
            formatCurrency={formatCurrency}
            tiposDisponiveis={tiposCustosImpostos}
          />
        </div>
      </div>

      <div className="pdf-landscape-page">
        <div className="pdf-landscape-content">
          <div style={H2}>8. Investimentos {badgeDebita(debitaCat('investimento'))}</div>
          <PrintDespesaTable
            items={despesasInvestimentos}
            total={totalDespInvestimentos}
            formatCurrency={formatCurrency}
            tiposDisponiveis={tiposCustosInvestimentos}
          />
        </div>
      </div>

      <div className="pdf-landscape-page">
        <div className="pdf-landscape-content">
          <div style={H2}>9. Fornecedores {badgeDebita(debitaCat('fornecedor'))}</div>
          <PrintDespesaTable
            items={despesasFornecedores}
            total={totalDespFornecedores}
            formatCurrency={formatCurrency}
            tiposDisponiveis={tiposCustosFornecedores}
          />
        </div>
      </div>

      <div className="pdf-landscape-page">
        <div className="pdf-landscape-content">
          <div style={H2}>10. Financiamentos {badgeDebita(debitaCat('financiamento'))}</div>
          <PrintDespesaTable
            items={despesasFinanciamentos}
            total={totalDespFinanciamentos}
            formatCurrency={formatCurrency}
            tiposDisponiveis={tiposCustosFinanciamentos}
          />
        </div>
      </div>

      <div className="pdf-landscape-page">
        <div className="pdf-landscape-content">
          {/* Fretes já são debitados do faturamento de fretes (Seção 1); por isso a tag indica que debita,
              mas o valor não é subtraído novamente do lucro líquido. */}
          <div style={H2}>11. Fretes e Logística {badgeDebita(true)}</div>
          <PrintDespesaTable
            items={despesasFretes}
            total={totalDespFretes}
            formatCurrency={formatCurrency}
            tiposDisponiveis={tiposCustosFretes}
          />
        </div>
      </div>

      <div className="pdf-landscape-page">
        <div className="pdf-landscape-content">
          <div style={H2}>12. Autorizados {badgeDebita(debitaCat('autorizado'))}</div>
          <PrintDespesaTable
            items={despesasAutorizados}
            total={totalDespAutorizados}
            formatCurrency={formatCurrency}
            tiposDisponiveis={tiposCustosAutorizados}
          />
        </div>
      </div>

      <div className="pdf-landscape-page">
        <div className="pdf-landscape-content">
          <div style={H2}>13. Salários {badgeDebita(debitaCat('salario'))}</div>
          <PrintDespesaTable
            items={despesasSalarios}
            total={totalDespSalarios}
            formatCurrency={formatCurrency}
            tiposDisponiveis={tiposCustosSalarios}
          />
        </div>
      </div>

      <div className="pdf-landscape-page">
        <div className="pdf-landscape-content">
          <div style={H2}>14. Estoque</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, border: '1px solid #e2e8f0', padding: '10px 12px', background: '#fafbfc' }}>
              <div style={{ fontSize: '7pt', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                Total de Itens
              </div>
              <div style={{ fontSize: '13pt', fontWeight: 800, marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>
                {estoqueResumo.totalItens.toLocaleString('pt-BR')}
              </div>
            </div>
            <div style={{ flex: 1, border: '1px solid #e2e8f0', padding: '10px 12px', background: '#fafbfc' }}>
              <div style={{ fontSize: '7pt', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                Valor Total
              </div>
              <div style={{ fontSize: '13pt', fontWeight: 800, marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>
                {formatCurrency(estoqueResumo.valorTotal)}
              </div>
            </div>
          </div>
          <div
            style={{
              marginTop: 24,
              paddingTop: 8,
              borderTop: '1px solid #cbd5e1',
              fontSize: '7pt',
              color: '#94a3b8',
              textAlign: 'center',
            }}
          >
            Documento gerado automaticamente • {format(new Date(), "dd/MM/yyyy HH:mm")} • D.R.E {mesNome}
          </div>
        </div>
      </div>
    </div>
  );
}

function PrintDespesaTable({
  items,
  total,
  formatCurrency,
  tiposDisponiveis,
}: {
  items: DespesaAgrupada[];
  total: number;
  formatCurrency: (v: number) => string;
  tiposDisponiveis?: TipoCustoVariavel[];
}) {
  const TH: React.CSSProperties = {
    background: '#f1f5f9',
    color: '#475569',
    fontSize: '8pt',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    padding: '6px 8px',
    textAlign: 'left',
    borderBottom: '1px solid #cbd5e1',
  };
  const TD: React.CSSProperties = {
    fontSize: '9.5pt',
    padding: '5px 8px',
    borderBottom: '1px solid #e2e8f0',
  };
  if (items.length === 0) {
    return (
      <div style={{ fontSize: '9pt', color: '#94a3b8', fontStyle: 'italic', padding: '6px 0' }}>
        Nenhuma despesa registrada.
      </div>
    );
  }
  const showProj = !!(tiposDisponiveis && tiposDisponiveis.length > 0);
  const totalProj = showProj
    ? Array.from(new Set(items.map(d => d.nome))).reduce((s, nome) => {
        const t = tiposDisponiveis!.find(t => t.nome === nome);
        return s + (t?.valor_maximo_mensal || 0);
      }, 0)
    : 0;
  const totalProjAno = totalProj * 12;
  return (
    <table>
      <thead>
        <tr>
          <th style={TH}>Descrição</th>
          <th style={{ ...TH, textAlign: 'right', width: 140 }}>Valor</th>
          {showProj && (
            <th style={{ ...TH, textAlign: 'right', width: 140 }}>Projetado</th>
          )}
          {showProj && (
            <th style={{ ...TH, textAlign: 'right', width: 140 }}>Projetado (Ano)</th>
          )}
        </tr>
      </thead>
      {items.map((d, i) => (
        <tbody key={d.id}>
          <tr style={{ background: i % 2 === 0 ? '#ffffff' : '#fafbfc' }}>
            <td style={TD}>{d.nome}</td>
            {(() => {
              const tipoRef = showProj
                ? tiposDisponiveis!.find(t => t.nome === d.nome)
                : undefined;
              const cor = tipoRef
                ? d.valor_real > tipoRef.valor_maximo_mensal
                  ? '#b91c1c'
                  : d.valor_real < tipoRef.valor_maximo_mensal
                    ? '#047857'
                    : '#0f172a'
                : '#0f172a';
              return (
                <>
                  <td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: cor, fontWeight: tipoRef ? 600 : 400 }}>
                    {formatCurrency(d.valor_real)}
                  </td>
                  {showProj && (
                    <td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#64748b' }}>
                      {tipoRef ? formatCurrency(tipoRef.valor_maximo_mensal) : '—'}
                    </td>
                  )}
                  {showProj && (
                    <td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#64748b' }}>
                      {tipoRef ? formatCurrency(tipoRef.valor_maximo_mensal * 12) : '—'}
                    </td>
                  )}
                </>
              );
            })()}
          </tr>
          {(d.gastos || []).map((g) => {
            const dataFmt = (() => {
              try {
                return format(new Date(g.data + 'T12:00:00'), 'dd/MM');
              } catch {
                return '—';
              }
            })();
            return (
              <tr key={g.id} style={{ background: '#fcfdfe' }}>
                <td style={{ ...TD, paddingLeft: 22, fontSize: '8.5pt', color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>
                  └ {dataFmt}  {g.descricao || '—'}
                </td>
                <td style={{ ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: '8.5pt', color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>
                  {formatCurrency(g.valor)}
                </td>
                {showProj && (
                  <td style={{ ...TD, borderBottom: '1px solid #f1f5f9' }}></td>
                )}
                {showProj && (
                  <td style={{ ...TD, borderBottom: '1px solid #f1f5f9' }}></td>
                )}
              </tr>
            );
          })}
        </tbody>
      ))}
      <tbody>
        <tr style={{ background: '#1d76cf', color: '#fff' }}>
          <td style={{ ...TD, fontWeight: 800, color: '#fff', borderBottom: 'none' }}>TOTAL</td>
          <td style={{ ...TD, textAlign: 'right', fontWeight: 800, color: '#fff', borderBottom: 'none', fontVariantNumeric: 'tabular-nums' }}>
            {formatCurrency(total)}
          </td>
          {showProj && (
            <td style={{ ...TD, textAlign: 'right', fontWeight: 800, color: '#fff', borderBottom: 'none', fontVariantNumeric: 'tabular-nums' }}>
              {formatCurrency(totalProj)}
            </td>
          )}
          {showProj && (
            <td style={{ ...TD, textAlign: 'right', fontWeight: 800, color: '#fff', borderBottom: 'none', fontVariantNumeric: 'tabular-nums' }}>
              {formatCurrency(totalProjAno)}
            </td>
          )}
        </tr>
      </tbody>
    </table>
  );
}

const FOLHA_SETORES_ORDEM: { value: string; label: string }[] = [
  { value: 'vendas',         label: 'Vendas' },
  { value: 'marketing',      label: 'Marketing' },
  { value: 'instalacoes',    label: 'Instalações' },
  { value: 'fabrica',        label: 'Fábrica' },
  { value: 'administrativo', label: 'Administrativo' },
  { value: '',               label: 'Sem setor' },
];

function PrintFolhaSalarialDetalhada({
  items,
  formatCurrency,
}: {
  items: FolhaColaboradorDetalhe[];
  formatCurrency: (v: number) => string;
}) {
  if (items.length === 0) {
    return (
      <div style={{ fontSize: '9pt', color: '#94a3b8', fontStyle: 'italic', padding: '6px 0' }}>
        Nenhum colaborador registrado.
      </div>
    );
  }
  const TH: React.CSSProperties = {
    background: '#f1f5f9',
    color: '#475569',
    fontSize: '7.5pt',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    padding: '5px 6px',
    textAlign: 'left',
    borderBottom: '1px solid #cbd5e1',
    whiteSpace: 'nowrap',
  };
  const THr = { ...TH, textAlign: 'right' as const };
  const THc = { ...TH, textAlign: 'center' as const };
  const TD: React.CSSProperties = {
    fontSize: '8pt',
    padding: '4px 6px',
    borderBottom: '1px solid #e2e8f0',
  };
  const tdR = { ...TD, textAlign: 'right' as const, fontVariantNumeric: 'tabular-nums' };
  const tdC = { ...TD, textAlign: 'center' as const };

  // Map setor -> ordem
  const ordemMap = new Map<string, number>();
  FOLHA_SETORES_ORDEM.forEach((s, idx) => ordemMap.set(s.value, idx));
  const setorLabel = (v: string) => FOLHA_SETORES_ORDEM.find((s) => s.value === v)?.label ?? (v || 'Sem setor');
  const setoresPresentes = Array.from(new Set(items.map((i) => i.setor ?? '')))
    .sort((a, b) => (ordemMap.get(a) ?? 999) - (ordemMap.get(b) ?? 999));

  let totalSalariosGeral = 0;
  let totalFolhaGeral = 0;

  return (
    <div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ ...TH, minWidth: 130 }}>Colaborador</th>
            <th style={THc}>Em folha</th>
            <th style={THr}>Salário</th>
            <th style={THr}>Comb.</th>
            <th style={THr}>Bonif.</th>
            <th style={THr}>H. Extra</th>
            <th style={THr}>Insalub.</th>
            <th style={THr}>FGTS</th>
            <th style={THr}>Prev. 13°</th>
            <th style={THr}>FGTS 13°</th>
            <th style={THr}>Férias</th>
            <th style={THr}>Multa FGTS</th>
            <th style={{ ...THr, background: '#e0edfb', color: '#0f172a' }}>Total</th>
          </tr>
        </thead>
        {setoresPresentes.map((setorValue) => {
          const rows = items.filter((i) => (i.setor ?? '') === setorValue);
          if (rows.length === 0) return null;
          const subtotalSalarios = rows.reduce((s, r) => s + r.salario, 0);
          const subtotalTotal = rows.reduce((s, r) => s + r.total, 0);
          totalSalariosGeral += subtotalSalarios;
          totalFolhaGeral += subtotalTotal;
          return (
            <tbody key={setorValue || 'sem-setor'}>
              <tr>
                <td
                  colSpan={13}
                  style={{
                    background: '#1d76cf',
                    color: '#fff',
                    fontSize: '8.5pt',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    padding: '4px 8px',
                  }}
                >
                  {setorLabel(setorValue)} ({rows.length})
                </td>
              </tr>
              {rows.map((r, i) => (
                <tr key={r.id} style={{ background: i % 2 === 0 ? '#ffffff' : '#fafbfc' }}>
                  <td style={TD}>{r.nome}</td>
                  <td style={{ ...tdC, fontWeight: 700, color: r.em_folha ? '#16a34a' : '#dc2626' }}>
                    {r.em_folha ? 'Sim' : 'Não'}
                  </td>
                  <td style={tdR}>{formatCurrency(r.salario)}</td>
                  <td style={tdR}>{formatCurrency(r.aux_combustivel)}</td>
                  <td style={tdR}>{formatCurrency(r.bonificacao)}</td>
                  <td style={tdR}>{formatCurrency(r.hora_extra)}</td>
                  <td style={tdR}>{formatCurrency(r.insalubridade_val)}</td>
                  <td style={tdR}>{formatCurrency(r.fgts_val)}</td>
                  <td style={tdR}>{formatCurrency(r.prev_13)}</td>
                  <td style={tdR}>{formatCurrency(r.fgts_13)}</td>
                  <td style={tdR}>{formatCurrency(r.ferias)}</td>
                  <td style={tdR}>{formatCurrency(r.multa_fgts)}</td>
                  <td style={{ ...tdR, background: '#f1f7fd', fontWeight: 700 }}>
                    {formatCurrency(r.total)}
                  </td>
                </tr>
              ))}
              <tr>
                <td
                  colSpan={12}
                  style={{
                    ...tdR,
                    background: '#f1f5f9',
                    fontWeight: 700,
                    color: '#475569',
                  }}
                >
                  Subtotal {setorLabel(setorValue)}
                </td>
                <td style={{ ...tdR, background: '#f1f5f9', fontWeight: 800, color: '#0f172a' }}>
                  {formatCurrency(subtotalTotal)}
                </td>
              </tr>
            </tbody>
          );
        })}
        <tbody>
          <tr style={{ background: '#1d76cf', color: '#fff' }}>
            <td style={{ ...TD, fontWeight: 800, color: '#fff', borderBottom: 'none' }} colSpan={2}>
              TOTAL GERAL
            </td>
            <td style={{ ...tdR, fontWeight: 800, color: '#fff', borderBottom: 'none' }}>
              {formatCurrency(totalSalariosGeral)}
            </td>
            <td style={{ ...TD, borderBottom: 'none' }} colSpan={9}></td>
            <td style={{ ...tdR, fontWeight: 800, color: '#fff', borderBottom: 'none' }}>
              {formatCurrency(totalFolhaGeral)}
            </td>
          </tr>
          <tr>
            <td colSpan={13} style={{ fontSize: '7.5pt', color: '#64748b', padding: '4px 6px' }}>
              Total de salários (base): {formatCurrency(totalSalariosGeral)} · Total da folha (com encargos): {formatCurrency(totalFolhaGeral)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export type DREMesViewMode = 'full' | 'despesas' | 'resultados';

interface DREMesDirecaoProps {
  mesProp?: string;
  viewMode?: DREMesViewMode;
  embedded?: boolean;
}

export default function DREMesDirecao({ mesProp, viewMode = 'full', embedded = false }: DREMesDirecaoProps = {}) {
  const params = useParams<{ mes: string }>();
  const mes = mesProp ?? params.mes;
  const showFaturamento = viewMode === 'full';
  const showDespesas = viewMode === 'full' || viewMode === 'despesas';
  const showResumoFinal = viewMode === 'full' || viewMode === 'resultados';
  const [loading, setLoading] = useState(true);
  const [faturamento, setFaturamento] = useState<FaturamentoProduto>({ portas: 0, pintura: 0, instalacoes: 0, acessorios: 0, avulsos: 0, fretes: 0, total: 0 });
  const [lucro, setLucro] = useState<FaturamentoProduto>({ portas: 0, pintura: 0, instalacoes: 0, acessorios: 0, avulsos: 0, fretes: 0, total: 0 });
  const [descontoExcedido, setDescontoExcedido] = useState<FaturamentoProduto>({ portas: 0, pintura: 0, instalacoes: 0, acessorios: 0, avulsos: 0, fretes: 0, total: 0 });
  const [despesasFixas, setDespesasFixas] = useState<DespesaAgrupada[]>([]);
  const [despesasFolha, setDespesasFolha] = useState<DespesaAgrupada[]>([]);
  const [folhaDetalhada, setFolhaDetalhada] = useState<FolhaColaboradorDetalhe[]>([]);
  const [despesasVariaveis, setDespesasVariaveis] = useState<DespesaAgrupada[]>([]);
  const [despesasImpostos, setDespesasImpostos] = useState<DespesaAgrupada[]>([]);
  const [despesasInvestimentos, setDespesasInvestimentos] = useState<DespesaAgrupada[]>([]);
  const [despesasFornecedores, setDespesasFornecedores] = useState<DespesaAgrupada[]>([]);
  const [despesasFinanciamentos, setDespesasFinanciamentos] = useState<DespesaAgrupada[]>([]);
  const [despesasFretes, setDespesasFretes] = useState<DespesaAgrupada[]>([]);
  const [despesasAutorizados, setDespesasAutorizados] = useState<DespesaAgrupada[]>([]);
  const [despesasSalarios, setDespesasSalarios] = useState<DespesaAgrupada[]>([]);
  const [tipoModal, setTipoModal] = useState<{ id: string; nome: string } | null>(null);
  const [tiposCustosFixos, setTiposCustosFixos] = useState<TipoCustoVariavel[]>([]);
  const [tiposCustosVariaveis, setTiposCustosVariaveis] = useState<TipoCustoVariavel[]>([]);
  const [tiposCustosImpostos, setTiposCustosImpostos] = useState<TipoCustoVariavel[]>([]);
  const [tiposCustosInvestimentos, setTiposCustosInvestimentos] = useState<TipoCustoVariavel[]>([]);
  const [tiposCustosFornecedores, setTiposCustosFornecedores] = useState<TipoCustoVariavel[]>([]);
  const [tiposCustosFinanciamentos, setTiposCustosFinanciamentos] = useState<TipoCustoVariavel[]>([]);
  const [tiposCustosFretes, setTiposCustosFretes] = useState<TipoCustoVariavel[]>([]);
  const [tiposCustosAutorizados, setTiposCustosAutorizados] = useState<TipoCustoVariavel[]>([]);
  const [tiposCustosSalarios, setTiposCustosSalarios] = useState<TipoCustoVariavel[]>([]);
  const [topAvulsos, setTopAvulsos] = useState<{nome: string, qtd: number}[]>([]);
  const [estoqueResumo, setEstoqueResumo] = useState({ valorTotal: 0, totalItens: 0 });
  const [vendasListagem, setVendasListagem] = useState<{ id: string; data: string; cliente: string; valorTabela: number; valorVenda: number; desconto: number; lucro: number; temperatura: string; pagamento: string }[]>([]);
  const [portasModalOpen, setPortasModalOpen] = useState(false);
  const [portasDetalhe, setPortasDetalhe] = useState<VendaComPortasRow[]>([]);
  const [pinturaModalOpen, setPinturaModalOpen] = useState(false);
  const [pinturaDetalhe, setPinturaDetalhe] = useState<VendaComPortasRow[]>([]);
  const [instalacoesModalOpen, setInstalacoesModalOpen] = useState(false);
  const [instalacaoDetalhe, setInstalacaoDetalhe] = useState<VendaComPortasRow[]>([]);
  const [avulsosModalOpen, setAvulsosModalOpen] = useState(false);
  const [avulsosDetalhe, setAvulsosDetalhe] = useState<VendaComPortasRow[]>([]);
  const [acessoriosModalOpen, setAcessoriosModalOpen] = useState(false);
  const [acessoriosDetalhe, setAcessoriosDetalhe] = useState<VendaComPortasRow[]>([]);
  const [topAcessorios, setTopAcessorios] = useState<{nome: string, qtd: number}[]>([]);

  const [realizadoRow, setRealizadoRow] = useState<{ realizado_em: string; observacoes: string | null; status: 'pendente' | 'realizado' | 'aprovado' } | null>(null);
  const [realizadoDialogOpen, setRealizadoDialogOpen] = useState(false);
  const [realizadoObs, setRealizadoObs] = useState('');
  const [realizadoSaving, setRealizadoSaving] = useState(false);
  const [statusSelecionado, setStatusSelecionado] = useState<'pendente' | 'realizado' | 'aprovado'>('pendente');

  const isValidMes = !!mes && /^\d{4}-\d{2}$/.test(mes);
  const mesDate = isValidMes ? new Date(mes + '-15') : new Date();
  const mesNome = isValidMes ? format(mesDate, 'MMMM yyyy', { locale: ptBR }) : '';

  const fetchDespesasFromGastos = async () => {
    if (!mes) return;
    const start = `${mes}-01`;
    const [y, m] = mes.split('-').map(Number);
    const end = new Date(y, m, 0).toISOString().split('T')[0];

    // Despesas vêm de gastos cruzado com tipos_custos (aparece_no_dre).
    // Para a coluna "Projetado", aplica override mensal de despesas_mes_tipo_custo_override.
    // Lista TODOS os tipos ativos (mesmo sem gastos no mês) com valor_real=0
    // para bater com a tela /direcao/estrategia/despesas/:mes.
    const [
      { data: gastos, error: gErr },
      { data: tipos, error: tErr },
      { data: tcOverrides, error: oErr },
    ] = await Promise.all([
      supabase
        .from('gastos' as any)
        .select('id, valor, tipo_custo_id, descricao, data')
        .gte('data', start)
        .lte('data', end),
      supabase
        .from('tipos_custos' as any)
        .select('id, nome, tipo, aparece_no_dre, ativo, valor_maximo_mensal')
        .eq('aparece_no_dre', true)
        .eq('ativo', true),
      supabase
        .from('despesas_mes_tipo_custo_override' as any)
        .select('tipo_custo_id, valor_maximo_mensal')
        .eq('mes_referencia', start),
    ]);

    if (gErr || tErr || oErr) {
      console.error('Erro ao buscar despesas (gastos/tipos_custos):', gErr || tErr || oErr);
      setDespesasFixas([]);
      setDespesasVariaveis([]);
      setDespesasImpostos([]);
      setDespesasInvestimentos([]);
      setDespesasFornecedores([]);
      setDespesasFinanciamentos([]);
      setDespesasFretes([]);
      setDespesasAutorizados([]);
      setDespesasSalarios([]);
      setTiposCustosFixos([]);
      setTiposCustosVariaveis([]);
      setTiposCustosImpostos([]);
      setTiposCustosInvestimentos([]);
      setTiposCustosFornecedores([]);
      setTiposCustosFinanciamentos([]);
      setTiposCustosFretes([]);
      setTiposCustosAutorizados([]);
      setTiposCustosSalarios([]);
    } else {
      // soma de gastos por tipo_custo + lista detalhada
      const somaGastos: Record<string, number> = {};
      const listaGastos: Record<string, { id: string; descricao: string | null; data: string; valor: number }[]> = {};
      ((gastos || []) as any[]).forEach((g: any) => {
        if (!g.tipo_custo_id) return;
        const v = Number(g.valor) || 0;
        somaGastos[g.tipo_custo_id] = (somaGastos[g.tipo_custo_id] || 0) + v;
        (listaGastos[g.tipo_custo_id] ||= []).push({
          id: String(g.id),
          descricao: g.descricao ?? null,
          data: g.data,
          valor: v,
        });
      });
      Object.values(listaGastos).forEach(arr =>
        arr.sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0)),
      );

      // override mensal do projetado
      const ovMap: Record<string, number> = {};
      ((tcOverrides || []) as any[]).forEach((o: any) => {
        if (o.tipo_custo_id != null && o.valor_maximo_mensal != null) {
          ovMap[o.tipo_custo_id] = Number(o.valor_maximo_mensal);
        }
      });

      const tiposArr = (tipos || []) as any[];

      const itemsBy = (tipoStr: string) =>
        tiposArr
          .filter(t => t.tipo === tipoStr && !isFolha(t.nome))
          .map(t => ({
            id: t.id,
            nome: t.nome,
            valor_real: somaGastos[t.id] || 0,
            gastos: listaGastos[t.id] || [],
          } as DespesaAgrupada))
          .sort((a, b) => a.nome.localeCompare(b.nome));

      setDespesasFixas(itemsBy('fixa'));
      setDespesasVariaveis(itemsBy('variavel'));
      setDespesasImpostos(itemsBy('imposto'));
      setDespesasInvestimentos(itemsBy('investimento'));
      setDespesasFornecedores(itemsBy('fornecedor'));
      setDespesasFinanciamentos(itemsBy('financiamento'));
      setDespesasFretes(itemsBy('frete'));
      setDespesasAutorizados(itemsBy('autorizado'));
      setDespesasSalarios(itemsBy('salario'));

      const tiposBy = (tipoStr: string): TipoCustoVariavel[] =>
        tiposArr
          .filter(t => t.tipo === tipoStr)
          .map(t => ({
            id: t.id,
            nome: t.nome,
            valor_maximo_mensal:
              ovMap[t.id] != null ? ovMap[t.id] : Number(t.valor_maximo_mensal) || 0,
          }))
          .sort((a, b) => a.nome.localeCompare(b.nome));

      setTiposCustosFixos(tiposBy('fixa'));
      setTiposCustosVariaveis(tiposBy('variavel'));
      setTiposCustosImpostos(tiposBy('imposto'));
      setTiposCustosInvestimentos(tiposBy('investimento'));
      setTiposCustosFornecedores(tiposBy('fornecedor'));
      setTiposCustosFinanciamentos(tiposBy('financiamento'));
      setTiposCustosFretes(tiposBy('frete'));
      setTiposCustosAutorizados(tiposBy('autorizado'));
      setTiposCustosSalarios(tiposBy('salario'));
    }

    // Folha salarial — mesma fonte de /direcao/estrategia/despesas/:mes
    // despesas_padrao (tipo='folha') sobrescrita por despesas_mes_folha_override.
    const normNome = (s: string) => (s || '').trim().toLowerCase();
    // Fórmula idêntica à de EstrategiaDespesasConfiguracoes.tsx (calcTotalFolha).
    const calcTotalFolha = (f: {
      salario: number; salario_minimo?: number | null;
      aux_combustivel: number; bonificacao?: number | null; hora_extra?: number | null;
      insalubridade_pct: number; fgts_pct: number;
      ferias_valor?: number | null; em_folha?: boolean | null;
    }) => {
      const salario = Number(f.salario) || 0;
      const horaExtra = Number(f.hora_extra) || 0;
      const bonif = Number(f.bonificacao) || 0;
      if (f.em_folha === false) return salario + horaExtra + bonif;
      const aux = Number(f.aux_combustivel) || 0;
      const base = salario + horaExtra; // base de cálculo dos encargos
      const baseInsalub = f.salario_minimo == null ? salario : Number(f.salario_minimo) || 0;
      const insalub = baseInsalub * (Number(f.insalubridade_pct) || 0) / 100;
      const fgts = base * (Number(f.fgts_pct) || 0) / 100;
      const ferias = f.ferias_valor == null ? base / 3 / 12 : Number(f.ferias_valor) || 0;
      const prev13 = base / 12;
      const fgts13 = fgts / 12;
      const multaFgts = fgts * 0.4;
      return base + aux + bonif + insalub + fgts + prev13 + fgts13 + ferias + multaFgts;
    };

    const [{ data: padroes, error: padErr }, { data: overrides, error: ovErr }] = await Promise.all([
      supabase
        .from('despesas_padrao' as any)
        .select('id, nome, setor, salario, salario_minimo, aux_combustivel, bonificacao, hora_extra, insalubridade_pct, fgts_pct, ferias_valor, em_folha, tipo')
        .eq('tipo', 'folha'),
      supabase
        .from('despesas_mes_folha_override' as any)
        .select('despesa_padrao_id, salario, salario_minimo, aux_combustivel, bonificacao, hora_extra, insalubridade_pct, fgts_pct, ferias_valor, em_folha')
        .eq('mes_referencia', start),
    ]);

    if (padErr || ovErr) {
      console.error('Erro ao buscar folha:', padErr || ovErr);
      setDespesasFolha([]);
      setFolhaDetalhada([]);
    } else {
      const ovMap = new Map<string, any>();
      ((overrides || []) as any[]).forEach(o => ovMap.set(o.despesa_padrao_id, o));

      const pick = <T,>(ov: any, p: any, key: string): T =>
        (ov && ov[key] != null ? ov[key] : p[key]) as T;

      const detalhes: FolhaColaboradorDetalhe[] = ((padroes || []) as any[]).map((p) => {
        const ov = ovMap.get(p.id);
        const salario = Number(pick<number>(ov, p, 'salario')) || 0;
        const salarioMinRaw = pick<number | null>(ov, p, 'salario_minimo');
        const salarioMin = salarioMinRaw == null ? salario : Number(salarioMinRaw) || 0;
        const aux = Number(pick<number>(ov, p, 'aux_combustivel')) || 0;
        const bonif = Number(pick<number | null>(ov, p, 'bonificacao')) || 0;
        const horaExtra = Number(pick<number | null>(ov, p, 'hora_extra')) || 0;
        const insalubPct = Number(pick<number>(ov, p, 'insalubridade_pct')) || 0;
        const fgtsPct = Number(pick<number>(ov, p, 'fgts_pct')) || 0;
        const feriasRaw = pick<number | null>(ov, p, 'ferias_valor');
        const emFolha = pick<boolean | null>(ov, p, 'em_folha') !== false;
        const base = salario + horaExtra;
        const insalubVal = emFolha ? salarioMin * insalubPct / 100 : 0;
        const fgtsVal = emFolha ? base * fgtsPct / 100 : 0;
        const prev13 = emFolha ? base / 12 : 0;
        const fgts13 = emFolha ? fgtsVal / 12 : 0;
        const ferias = emFolha ? (feriasRaw == null ? base / 3 / 12 : Number(feriasRaw) || 0) : 0;
        const multaFgts = emFolha ? fgtsVal * 0.4 : 0;
        const auxUsed = emFolha ? aux : 0;
        const bonifUsed = bonif; // bonificação entra mesmo fora da folha (mesma lógica do calcTotalFolha)
        const total = emFolha
          ? base + auxUsed + bonifUsed + insalubVal + fgtsVal + prev13 + fgts13 + ferias + multaFgts
          : salario + horaExtra + bonifUsed;
        return {
          id: `p:${p.id}`,
          nome: p.nome,
          setor: (p.setor ?? '') as string,
          em_folha: emFolha,
          salario,
          aux_combustivel: auxUsed,
          bonificacao: bonifUsed,
          hora_extra: horaExtra,
          insalubridade_val: insalubVal,
          fgts_val: fgtsVal,
          prev_13: prev13,
          fgts_13: fgts13,
          ferias,
          multa_fgts: multaFgts,
          total,
        };
      });

      const items: DespesaAgrupada[] = detalhes.map((d) => ({
        id: d.id,
        nome: d.nome,
        valor_real: d.total,
      }));

      setDespesasFolha(items.sort((a, b) => a.nome.localeCompare(b.nome)));
      setFolhaDetalhada(detalhes.sort((a, b) => a.nome.localeCompare(b.nome)));
    }
  };

  const fetchTiposCustosAtivos = async () => {
    // Mantido como no-op: tiposCustosFixos/Variaveis/Impostos agora são
    // populados em fetchDespesasFromGastos (com override mensal aplicado).
  };

  useEffect(() => {
    if (!mes) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const start = format(startOfMonth(mesDate), 'yyyy-MM-dd');
        const end = format(endOfMonth(mesDate), 'yyyy-MM-dd');

        const { data: produtos, error: prodError } = await supabase
          .from('produtos_vendas')
          .select(`
            tipo_produto,
            valor_total_sem_frete,
            valor_produto,
            valor_pintura,
            valor_instalacao,
            quantidade,
            tipo_desconto,
            desconto_percentual,
            desconto_valor,
            lucro_produto,
            lucro_pintura,
            lucro_item,
            descricao,
            altura,
            largura,
            tamanho,
            venda_id,
            custos_itens_id,
            vendas!inner(id, data_venda, forma_pagamento, temperatura)
          `)
          .gte('vendas.data_venda', start + ' 00:00:00')
          .lte('vendas.data_venda', end + ' 23:59:59');

        if (prodError) throw prodError;

        // Map de tipo_item do catálogo (custos_itens) para classificar acessórios vs avulsos
        const { data: catalogoItens } = await supabase
          .from('custos_itens')
          .select('id, descricao, tipo_item');
        const tipoItemMap = new Map<string, 'avulso' | 'acessorio'>();
        const tipoItemPorDescricao = new Map<string, 'avulso' | 'acessorio'>();
        const normDesc = (s: any) => String(s || '').trim().toLowerCase();
        ((catalogoItens || []) as any[]).forEach((c) => {
          const tipo: 'avulso' | 'acessorio' = c.tipo_item === 'acessorio' ? 'acessorio' : 'avulso';
          tipoItemMap.set(String(c.id), tipo);
          const key = normDesc(c.descricao);
          if (key) tipoItemPorDescricao.set(key, tipo);
        });
        const classificarAvulso = (p: any): 'acessorios' | 'avulsos' => {
          const cid = p.custos_itens_id ? String(p.custos_itens_id) : null;
          if (cid && tipoItemMap.has(cid)) {
            return tipoItemMap.get(cid) === 'acessorio' ? 'acessorios' : 'avulsos';
          }
          // Fallback por descrição: usa a classificação do catálogo mesmo sem vínculo direto (dados legados)
          const descKey = normDesc(p.descricao);
          if (descKey && tipoItemPorDescricao.has(descKey)) {
            return tipoItemPorDescricao.get(descKey) === 'acessorio' ? 'acessorios' : 'avulsos';
          }
          // Fallback final: tipo_produto='acessorio' vira acessórios; 'adicional' vira avulsos
          return p.tipo_produto === 'acessorio' ? 'acessorios' : 'avulsos';
        };

        // Configs ao vivo de lucro (definidas em /direcao/estrategia/kits)
        const [cfgPintura, cfgInstal] = await Promise.all([
          fetchConfigLucro('pintura_epoxi'),
          fetchConfigLucro('instalacao'),
        ]);
        const pctInstal = Number(cfgInstal.percentual_custo) || 0;
        const pctPintura = Number(cfgPintura.percentual_custo) || 0;
        const valorM2Pintura = Number(cfgPintura.parametros?.valor_m2) || 0;
        const calcLucroInstal = (valor: number) => valor * (1 - pctInstal / 100);
        const calcLucroPintura = (valor: number, altura: number, largura: number) => {
          if (cfgPintura.modo === 'formula_dimensao' && altura > 0 && largura > 0 && valorM2Pintura > 0) {
            return Math.min(valor, altura * largura * valorM2Pintura);
          }
          return valor * (1 - pctPintura / 100);
        };
        const parseDims = (p: any) => {
          let altura = Number(p.altura) || 0;
          let largura = Number(p.largura) || 0;
          if ((!altura || !largura) && p.tamanho) {
            const partes = String(p.tamanho).split('x');
            if (partes.length === 2) {
              largura = largura || parseFloat(partes[0]) || 0;
              altura = altura || parseFloat(partes[1]) || 0;
            }
          }
          return { altura, largura };
        };

        const fat: FaturamentoProduto = { portas: 0, pintura: 0, instalacoes: 0, acessorios: 0, avulsos: 0, fretes: 0, total: 0 };
        const luc: FaturamentoProduto = { portas: 0, pintura: 0, instalacoes: 0, acessorios: 0, avulsos: 0, fretes: 0, total: 0 };

        produtos?.forEach((p: any) => {
          const tipo = p.tipo_produto;
          const valorTotal = p.valor_total_sem_frete || 0;

          if (['porta_enrolar', 'porta_social'].includes(tipo)) {
            const qty = p.quantidade || 1;
            const valorProdutoBase = (p.valor_produto || 0) * qty;
            const valorPinturaBase = (p.valor_pintura || 0) * qty;
            const valorInstalacaoBase = (p.valor_instalacao || 0) * qty;
            const valorBrutoTotal = valorProdutoBase + valorPinturaBase + valorInstalacaoBase;

            let descontoTotal = 0;
            if (p.tipo_desconto === 'percentual' && p.desconto_percentual > 0) {
              descontoTotal = valorBrutoTotal * (p.desconto_percentual / 100);
            } else if (p.tipo_desconto === 'valor' && p.desconto_valor > 0) {
              descontoTotal = p.desconto_valor;
            }

            const proporcaoProduto = valorBrutoTotal > 0 ? valorProdutoBase / valorBrutoTotal : 1;
            const proporcaoPintura = valorBrutoTotal > 0 ? valorPinturaBase / valorBrutoTotal : 0;
            const proporcaoInstalacao = valorBrutoTotal > 0 ? valorInstalacaoBase / valorBrutoTotal : 0;

            const valorPortaLiquido = valorProdutoBase - (descontoTotal * proporcaoProduto);
            const valorPinturaLiquido = valorPinturaBase - (descontoTotal * proporcaoPintura);
            const valorInstalacaoLiquido = valorInstalacaoBase - (descontoTotal * proporcaoInstalacao);

            fat.portas += valorPortaLiquido;
            fat.pintura += valorPinturaLiquido;
            fat.instalacoes += valorInstalacaoLiquido;
            // Lucro da porta segue o lucro_item já armazenado (tabela de kits),
            // proporcional ao componente porta.
            const lucroLinha = p.lucro_item || 0;
            luc.portas += lucroLinha * proporcaoProduto;
            // Pintura e instalação respeitam as configurações ao vivo de /direcao/estrategia/kits
            const { altura, largura } = parseDims(p);
            if (valorPinturaLiquido > 0) {
              luc.pintura += calcLucroPintura(valorPinturaLiquido, altura, largura);
            }
            if (valorInstalacaoLiquido > 0) {
              luc.instalacoes += calcLucroInstal(valorInstalacaoLiquido);
            }
          } else if (tipo === 'pintura_epoxi') {
            fat.pintura += valorTotal;
            const { altura, largura } = parseDims(p);
            luc.pintura += calcLucroPintura(valorTotal, altura, largura);
          } else if (['acessorio', 'adicional'].includes(tipo)) {
            const bucket = classificarAvulso(p);
            fat[bucket] += valorTotal;
            luc[bucket] += p.lucro_item || 0;
          } else if (['instalacao', 'manutencao'].includes(tipo)) {
            fat.instalacoes += valorTotal;
            luc.instalacoes += calcLucroInstal(valorTotal);
          }
        });

        const { data: vendas } = await supabase
          .from('vendas')
          .select('valor_credito, lucro_instalacao, valor_instalacao, valor_frete')
          .gte('data_venda', start + ' 00:00:00')
          .lte('data_venda', end + ' 23:59:59');

        const totalCredito = vendas?.reduce((sum, v) => sum + ((v as any).valor_credito || 0), 0) || 0;
        const totalFretesVendas = vendas?.reduce((sum, v) => sum + ((v as any).valor_frete || 0), 0) || 0;
        fat.fretes = totalFretesVendas;

        fat.total = fat.portas + fat.pintura + fat.instalacoes + fat.acessorios + fat.avulsos + totalCredito;
        luc.total = luc.portas + luc.pintura + luc.instalacoes + luc.acessorios + luc.avulsos;

        // ============ Desconto Excedido por coluna ============
        // Reusa a mesma fórmula do modal Portas: para cada venda calcula-se
        // o % de desconto acima do limite permitido e converte-se em valor,
        // rateando entre os itens pelo valor bruto e agregando por tipo_produto.
        const cfgVendasExc = await supabase
          .from('configuracoes_vendas')
          .select('limite_desconto_avista, limite_desconto_presencial, limite_adicional_responsavel')
          .maybeSingle();
        const limAvistaExc = cfgVendasExc.data?.limite_desconto_avista ?? 3;
        const limPresencialExc = cfgVendasExc.data?.limite_desconto_presencial ?? 5;
        const limResponsavelExc = cfgVendasExc.data?.limite_adicional_responsavel ?? 7;

        // Totais por venda (base e desconto)
        const totVenda = new Map<string, { base: number; desc: number; formaPg: string; temperatura: any }>();
        (produtos || []).forEach((p: any) => {
          const vid = p.venda_id || p.vendas?.id;
          if (!vid) return;
          const qty = p.quantidade || 1;
          const base = ((p.valor_produto || 0) + (p.valor_pintura || 0) + (p.valor_instalacao || 0)) * qty;
          let d = 0;
          if (p.tipo_desconto === 'percentual' && p.desconto_percentual > 0) d = base * (p.desconto_percentual / 100);
          else if (p.tipo_desconto === 'valor' && p.desconto_valor > 0) d = p.desconto_valor;
          const cur = totVenda.get(vid) || {
            base: 0,
            desc: 0,
            formaPg: (p.vendas?.forma_pagamento || '').trim(),
            temperatura: p.vendas?.temperatura,
          };
          cur.base += base;
          cur.desc += d;
          totVenda.set(vid, cur);
        });

        const excVenda = new Map<string, number>();
        totVenda.forEach((t, vid) => {
          if (t.base <= 0) { excVenda.set(vid, 0); return; }
          const pctDado = (t.desc / t.base) * 100;
          const aptoAvista = t.formaPg !== '' && t.formaPg !== 'cartao_credito';
          const aptoFrio = t.temperatura === false;
          const limBase = (aptoAvista ? limAvistaExc : 0) + (aptoFrio ? limPresencialExc : 0);
          const aptoGerente = pctDado > limBase;
          const limite = limBase + (aptoGerente ? limResponsavelExc : 0);
          const excPct = Math.max(0, pctDado - limite);
          excVenda.set(vid, (excPct / 100) * t.base);
        });

        const exc: FaturamentoProduto = { portas: 0, pintura: 0, instalacoes: 0, acessorios: 0, avulsos: 0, fretes: 0, total: 0 };
        (produtos || []).forEach((p: any) => {
          const vid = p.venda_id || p.vendas?.id;
          if (!vid) return;
          const excTotal = excVenda.get(vid) || 0;
          if (excTotal <= 0) return;
          const t = totVenda.get(vid);
          if (!t || t.base <= 0) return;
          const qty = p.quantidade || 1;
          const valorProdutoBase = (p.valor_produto || 0) * qty;
          const valorPinturaBase = (p.valor_pintura || 0) * qty;
          const valorInstalacaoBase = (p.valor_instalacao || 0) * qty;
          const bruto = valorProdutoBase + valorPinturaBase + valorInstalacaoBase;
          if (bruto <= 0) return;
          const share = excTotal * (bruto / t.base);
          const tipo = p.tipo_produto;
          if (['porta_enrolar', 'porta_social'].includes(tipo)) {
            // Rateia entre porta / pintura / instalação embutida
            exc.portas += share * (valorProdutoBase / bruto);
            exc.pintura += share * (valorPinturaBase / bruto);
            exc.instalacoes += share * (valorInstalacaoBase / bruto);
          } else if (tipo === 'pintura_epoxi') {
            exc.pintura += share;
          } else if (['instalacao', 'manutencao'].includes(tipo)) {
            exc.instalacoes += share;
          } else {
            exc[classificarAvulso(p)] += share;
          }
        });
        exc.total = exc.portas + exc.pintura + exc.instalacoes + exc.acessorios + exc.avulsos;

        setFaturamento(fat);
        setLucro(luc);
        setDescontoExcedido(exc);

        // Top 5 itens (separado: acessórios vs avulsos, conforme catálogo tipo_item)
        const avulsosMap: Record<string, number> = {};
        const acessoriosMap: Record<string, number> = {};
        produtos?.forEach((p: any) => {
          const nome = p.descricao || 'Sem descrição';
          const qtd = p.quantidade || 1;
          if (['acessorio', 'adicional'].includes(p.tipo_produto)) {
            const bucket = classificarAvulso(p);
            const alvo = bucket === 'acessorios' ? acessoriosMap : avulsosMap;
            alvo[nome] = (alvo[nome] || 0) + qtd;
          }
        });
        const topFrom = (m: Record<string, number>) =>
          Object.entries(m)
            .map(([nome, qtd]) => ({ nome, qtd }))
            .sort((a, b) => b.qtd - a.qtd)
            .slice(0, 5);
        setTopAvulsos(topFrom(avulsosMap));
        setTopAcessorios(topFrom(acessoriosMap));

        // Buscar resumo do estoque
        const fetchEstoque = async () => {
          const { data: estoqueData } = await supabase
            .from('estoque')
            .select('quantidade, custo_unitario')
            .eq('ativo', true);
          const resumo = (estoqueData || []).reduce((acc, item) => ({
            valorTotal: acc.valorTotal + ((item.quantidade || 0) * (item.custo_unitario || 0)),
            totalItens: acc.totalItens + (item.quantidade || 0),
          }), { valorTotal: 0, totalItens: 0 });
          setEstoqueResumo(resumo);
        };

        await Promise.all([fetchDespesasFromGastos(), fetchTiposCustosAtivos(), fetchEstoque()]);

        // Listagem de vendas do mês para o PDF
        const { data: vendasList } = await supabase
          .from('vendas')
          .select('id, data_venda, cliente_nome, valor_venda, valor_frete, lucro_total, lucro_instalacao, forma_pagamento, temperatura, produtos_vendas(valor_produto, valor_pintura, valor_instalacao, quantidade)')
          .gte('data_venda', start + ' 00:00:00')
          .lte('data_venda', end + ' 23:59:59')
          .order('data_venda', { ascending: true });

        const vendaIdsList = ((vendasList || []) as any[]).map((v) => v.id);
        const { data: parcelasList } = vendaIdsList.length
          ? await supabase
              .from('contas_receber')
              .select('venda_id, metodo_pagamento')
              .in('venda_id', vendaIdsList)
          : { data: [] as any[] };
        const parcelasPorVenda = new Map<string, { metodo_pagamento: string | null }[]>();
        ((parcelasList || []) as any[]).forEach((p) => {
          const arr = parcelasPorVenda.get(p.venda_id) || [];
          arr.push({ metodo_pagamento: p.metodo_pagamento });
          parcelasPorVenda.set(p.venda_id, arr);
        });

        setVendasListagem(
          ((vendasList || []) as any[]).map((v) => {
            const valorTabela = (v.produtos_vendas || []).reduce(
              (s: number, p: any) =>
                s + ((p.valor_produto || 0) + (p.valor_pintura || 0) + (p.valor_instalacao || 0)) * (p.quantidade || 1),
              0
            );
            const valorVenda = (v.valor_venda || 0) - (v.valor_frete || 0);
            const temperatura = v.temperatura === true ? 'Quente' : v.temperatura === false ? 'Fria' : '—';
            const pagamento = resumoPagamentoCompacto(v.forma_pagamento, parcelasPorVenda.get(v.id));
            return {
              id: v.id,
              data: v.data_venda,
              cliente: v.cliente_nome || '',
              valorTabela,
              valorVenda,
              desconto: valorTabela - valorVenda,
              lucro: (v.lucro_total || 0) + (v.lucro_instalacao || 0),
              temperatura,
              pagamento,
            };
          })
        );

        // Detalhe das vendas — busca unificada para os 3 modais (portas / pintura / instalação)
        const { data: detalhesRaw } = await supabase
          .from('produtos_vendas')
          .select(`
            id, descricao, quantidade, tipo_produto, valor_total,
            valor_produto, valor_pintura, valor_instalacao,
            valor_total_sem_frete,
            altura, largura, tabela_precos_porta_id, custos_itens_id,
            tipo_desconto, desconto_percentual, desconto_valor,
            lucro_item, lucro_pintura,
            tabela_precos_portas:tabela_precos_porta_id(descricao, altura, largura),
            vendas!inner(id, data_venda, cliente_nome, valor_venda, valor_frete, forma_pagamento, temperatura)
          `)
          .in('tipo_produto', ['pintura_epoxi', 'acessorio', 'adicional', 'manutencao', 'instalacao', 'porta_enrolar', 'porta_social'])
          .gte('vendas.data_venda', start + ' 00:00:00')
          .lte('vendas.data_venda', end + ' 23:59:59');

        const portasRaw = ((detalhesRaw || []) as any[]).filter((p) => p.tipo_produto === 'porta_enrolar');

        const vendaIdsAll = Array.from(
          new Set(((detalhesRaw || []) as any[]).map((p) => (Array.isArray(p.vendas) ? p.vendas[0]?.id : p.vendas?.id)).filter(Boolean))
        );
        const { data: todosProdutosVendas } = vendaIdsAll.length
          ? await supabase
              .from('produtos_vendas')
              .select(
                'venda_id, quantidade, valor_produto, valor_pintura, valor_instalacao, tipo_desconto, desconto_percentual, desconto_valor'
              )
              .in('venda_id', vendaIdsAll)
          : { data: [] as any[] };

        const { data: cfgVendasDre } = await supabase
          .from('configuracoes_vendas')
          .select('limite_desconto_avista, limite_desconto_presencial, limite_adicional_responsavel')
          .maybeSingle();
        const limAvista = cfgVendasDre?.limite_desconto_avista ?? 3;
        const limPresencial = cfgVendasDre?.limite_desconto_presencial ?? 5;
        const limResponsavel = cfgVendasDre?.limite_adicional_responsavel ?? 7;

        // Agrega todos os produtos por venda para totalBase / totalDesconto / rateio de frete
        const totaisPorVenda = new Map<string, { totalBase: number; totalDesconto: number }>();
        ((todosProdutosVendas || []) as any[]).forEach((p) => {
          const qty = p.quantidade || 1;
          const base =
            ((p.valor_produto || 0) + (p.valor_pintura || 0) + (p.valor_instalacao || 0)) * qty;
          let desc = 0;
          if (p.tipo_desconto === 'percentual' && p.desconto_percentual > 0) {
            desc = base * (p.desconto_percentual / 100);
          } else if (p.tipo_desconto === 'valor' && p.desconto_valor > 0) {
            desc = p.desconto_valor;
          }
          const cur = totaisPorVenda.get(p.venda_id) || { totalBase: 0, totalDesconto: 0 };
          cur.totalBase += base;
          cur.totalDesconto += desc;
          totaisPorVenda.set(p.venda_id, cur);
        });

        // Soma bruta dos itens de porta por venda (para ratear excedido só entre as portas)
        const brutoPortasPorVenda = new Map<string, number>();
        ((portasRaw || []) as any[]).forEach((p) => {
          const v = Array.isArray(p.vendas) ? p.vendas[0] : p.vendas;
          if (!v) return;
          const qty = p.quantidade || 1;
          const bruto =
            ((p.valor_produto || 0) + (p.valor_pintura || 0) + (p.valor_instalacao || 0)) * qty;
          brutoPortasPorVenda.set(v.id, (brutoPortasPorVenda.get(v.id) || 0) + bruto);
        });

        const excedidoPorVenda = new Map<string, number>();
        const bucketsPorVenda = new Map<
          string,
          { autoPct: number; friaPct: number; gerentePct: number; diretorPct: number }
        >();
        ((detalhesRaw || []) as any[]).forEach((p) => {
          const v = Array.isArray(p.vendas) ? p.vendas[0] : p.vendas;
          if (!v || excedidoPorVenda.has(v.id)) return;
          const tot = totaisPorVenda.get(v.id) || { totalBase: 0, totalDesconto: 0 };
          if (tot.totalBase <= 0) {
            excedidoPorVenda.set(v.id, 0);
            bucketsPorVenda.set(v.id, { autoPct: 0, friaPct: 0, gerentePct: 0, diretorPct: 0 });
            return;
          }
          const pctDado = (tot.totalDesconto / tot.totalBase) * 100;
          const formaPg = (v.forma_pagamento || '').trim();
          const aptoAvista = formaPg !== '' && formaPg !== 'cartao_credito';
          const aptoFrio = v.temperatura === false;
          const limiteBase = (aptoAvista ? limAvista : 0) + (aptoFrio ? limPresencial : 0);
          const aptoGerente = pctDado > limiteBase;
          const limite = limiteBase + (aptoGerente ? limResponsavel : 0);
          const excedidoPct = Math.max(0, pctDado - limite);
          excedidoPorVenda.set(v.id, (excedidoPct / 100) * tot.totalBase);

          // Distribuição em 4 faixas absolutas (cada faixa é a "camada" de autorização que cobriu o desconto)
          const autoCeil = aptoAvista ? limAvista : 0;                                  // até 3%
          const friaCeil = autoCeil + (aptoFrio ? limPresencial : 0);                   // + 5% se fria
          const gerenteCeil = friaCeil + limResponsavel;                                // + 7% gerente
          const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi));
          const autoPct = clamp(pctDado, 0, autoCeil);
          const friaPct = clamp(pctDado - autoCeil, 0, friaCeil - autoCeil);
          const gerentePct = clamp(pctDado - friaCeil, 0, gerenteCeil - friaCeil);
          const diretorPct = Math.max(0, pctDado - gerenteCeil);
          bucketsPorVenda.set(v.id, { autoPct, friaPct, gerentePct, diretorPct });
        });

        const porVenda = new Map<string, VendaComPortasRow>();
        ((portasRaw || []) as any[]).forEach((p) => {
          const v = Array.isArray(p.vendas) ? p.vendas[0] : p.vendas;
          if (!v) return;
          const qty = p.quantidade || 1;
          const valorTabela =
            ((p.valor_produto || 0) + (p.valor_pintura || 0) + (p.valor_instalacao || 0)) * qty;
          let desc = 0;
          if (p.tipo_desconto === 'percentual' && p.desconto_percentual > 0) {
            desc = valorTabela * (p.desconto_percentual / 100);
          } else if (p.tipo_desconto === 'valor' && p.desconto_valor > 0) {
            desc = p.desconto_valor;
          }
          const tot = totaisPorVenda.get(v.id) || { totalBase: 0, totalDesconto: 0 };
          const freteVenda = v.valor_frete || 0;
          const freteRateado =
            tot.totalBase > 0 ? freteVenda * (valorTabela / tot.totalBase) : 0;
          const somaPortas = brutoPortasPorVenda.get(v.id) || 0;
          const excedidoTot = excedidoPorVenda.get(v.id) || 0;
          const excedidoItem =
            somaPortas > 0 ? excedidoTot * (valorTabela / somaPortas) : 0;
          const valorFinal = p.valor_total ?? valorTabela - desc;
          const bk = bucketsPorVenda.get(v.id) || { autoPct: 0, friaPct: 0, gerentePct: 0, diretorPct: 0 };
          const descAuto = (bk.autoPct / 100) * valorTabela;
          const descFria = (bk.friaPct / 100) * valorTabela;
          const descGerente = (bk.gerentePct / 100) * valorTabela;
          const descDiretor = (bk.diretorPct / 100) * valorTabela;
          const existing = porVenda.get(v.id) || {
            vendaId: v.id,
            dataVenda: v.data_venda,
            clienteNome: v.cliente_nome || '',
            valorVenda: (v.valor_venda || 0) - (v.valor_frete || 0),
            metodoPagamento: formatarMetodoPagamento(v.forma_pagamento),
            temperaturaLabel: v.temperatura === false ? 'Fria' : v.temperatura === true ? 'Quente' : '—',
            isFria: v.temperatura === false,
            isCartao: (v.forma_pagamento || '') === 'cartao_credito',
            itens: [],
          };
          existing.itens.push({
            id: p.id,
            descricao: p.descricao || 'Sem descrição',
            quantidade: qty,
            valorTabela,
            freteRateado,
            descontoLinha: desc,
            valorFinal,
            excedido: excedidoItem,
            lucro: p.lucro_item || 0,
            descAuto,
            descFria,
            descGerente,
            descDiretor,
          });
          porVenda.set(v.id, existing);
        });
        setPortasDetalhe(
          Array.from(porVenda.values()).sort((a, b) => a.dataVenda.localeCompare(b.dataVenda))
        );

        // ============ Detalhes Pintura / Instalação / Itens Avulso ============
        const buildMap = (
          rows: any[],
          mapper: (p: any, v: any) => VendaComItensSimplesRow['itens'][number] | null,
        ) => {
          const map = new Map<string, VendaComItensSimplesRow>();
          rows.forEach((p) => {
            const v = Array.isArray(p.vendas) ? p.vendas[0] : p.vendas;
            if (!v) return;
            const item = mapper(p, v);
            if (!item) return;
            const existing = map.get(v.id) || {
              vendaId: v.id,
              dataVenda: v.data_venda,
              clienteNome: v.cliente_nome || '',
              valorVenda: (v.valor_venda || 0) - (v.valor_frete || 0),
              itens: [],
            };
            existing.itens.push(item);
            map.set(v.id, existing);
          });
          return Array.from(map.values()).sort((a, b) => a.dataVenda.localeCompare(b.dataVenda));
        };

        const todosRows = (detalhesRaw || []) as any[];

        // Helper genérico: gera VendaComPortasRow[] com as 4 faixas de desconto reaproveitando buckets do venda-wide.
        const buildCategoriaDetalhe = (
          rows: any[],
          computeItem: (p: any) => { valorTabela: number; lucro: number; descricao: string; idSuffix?: string } | null,
        ): VendaComPortasRow[] => {
          const map = new Map<string, VendaComPortasRow>();
          rows.forEach((p) => {
            const v = Array.isArray(p.vendas) ? p.vendas[0] : p.vendas;
            if (!v) return;
            const info = computeItem(p);
            if (!info || info.valorTabela <= 0) return;
            const qty = p.quantidade || 1;
            const tot = totaisPorVenda.get(v.id) || { totalBase: 0, totalDesconto: 0 };
            const freteVenda = v.valor_frete || 0;
            const freteRateado = tot.totalBase > 0 ? freteVenda * (info.valorTabela / tot.totalBase) : 0;
            const bk = bucketsPorVenda.get(v.id) || { autoPct: 0, friaPct: 0, gerentePct: 0, diretorPct: 0 };
            const descAuto = (bk.autoPct / 100) * info.valorTabela;
            const descFria = (bk.friaPct / 100) * info.valorTabela;
            const descGerente = (bk.gerentePct / 100) * info.valorTabela;
            const descDiretor = (bk.diretorPct / 100) * info.valorTabela;
            const descontoLinha = descAuto + descFria + descGerente + descDiretor;
            const valorFinal = info.valorTabela - descontoLinha;
            const existing = map.get(v.id) || {
              vendaId: v.id,
              dataVenda: v.data_venda,
              clienteNome: v.cliente_nome || '',
              valorVenda: (v.valor_venda || 0) - (v.valor_frete || 0),
              metodoPagamento: formatarMetodoPagamento(v.forma_pagamento),
              temperaturaLabel: v.temperatura === false ? 'Fria' : v.temperatura === true ? 'Quente' : '—',
              isFria: v.temperatura === false,
              isCartao: (v.forma_pagamento || '') === 'cartao_credito',
              itens: [],
            };
            existing.itens.push({
              id: p.id + (info.idSuffix || ''),
              descricao: info.descricao,
              quantidade: qty,
              valorTabela: info.valorTabela,
              freteRateado,
              descontoLinha,
              valorFinal,
              excedido: 0,
              lucro: info.lucro,
              descAuto,
              descFria,
              descGerente,
              descDiretor,
            });
            map.set(v.id, existing);
          });
          return Array.from(map.values()).sort((a, b) => a.dataVenda.localeCompare(b.dataVenda));
        };

        // ---- Pintura: pintura_epoxi + componente pintura de portas ----
        setPinturaDetalhe(
          buildCategoriaDetalhe(todosRows, (p) => {
            const qty = p.quantidade || 1;
            if (p.tipo_produto === 'pintura_epoxi') {
              const valorUnit = (p.valor_pintura ?? 0) > 0
                ? Number(p.valor_pintura)
                : Number(p.valor_produto || 0);
              const bruto = valorUnit * qty;
              if (bruto <= 0) return null;
              const fmtNum = (n: number) =>
                Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
              const kitDesc = p.tabela_precos_portas?.descricao;
              const cor = (p.descricao || '').trim();
              const dim = p.altura && p.largura
                ? `${fmtNum(p.altura)} × ${fmtNum(p.largura)} m`
                : null;
              const descricao =
                [kitDesc && `Kit ${kitDesc}`, cor || null, dim].filter(Boolean).join(' — ') || 'Pintura Epóxi';
              return { valorTabela: bruto, lucro: p.lucro_item || 0, descricao };
            }
            if (['porta_enrolar', 'porta_social'].includes(p.tipo_produto) && (p.valor_pintura || 0) > 0) {
              const valorPinturaBase = (p.valor_pintura || 0) * qty;
              const brutoAll = ((p.valor_produto || 0) + (p.valor_pintura || 0) + (p.valor_instalacao || 0)) * qty;
              const propPintura = brutoAll > 0 ? valorPinturaBase / brutoAll : 0;
              return {
                valorTabela: valorPinturaBase,
                lucro: (p.lucro_item || 0) * propPintura,
                descricao: `${p.descricao || 'Porta'} — pintura`,
                idSuffix: '-pintura',
              };
            }
            return null;
          }),
        );

        // ---- Instalação: tipo_produto=instalacao/manutencao + componente instalação de portas ----
        setInstalacaoDetalhe(
          buildCategoriaDetalhe(todosRows, (p) => {
            const qty = p.quantidade || 1;
            if (['instalacao', 'manutencao'].includes(p.tipo_produto)) {
              const base = ((Number(p.valor_produto) || 0) > 0
                ? Number(p.valor_produto)
                : Number(p.valor_instalacao || 0)) * qty;
              if (base <= 0) return null;
              return {
                valorTabela: base,
                lucro: p.lucro_item || 0,
                descricao: p.descricao || (p.tipo_produto === 'manutencao' ? 'Manutenção' : 'Instalação'),
              };
            }
            if (['porta_enrolar', 'porta_social'].includes(p.tipo_produto) && (p.valor_instalacao || 0) > 0) {
              const valorInstBase = (p.valor_instalacao || 0) * qty;
              const brutoAll = ((p.valor_produto || 0) + (p.valor_pintura || 0) + (p.valor_instalacao || 0)) * qty;
              const propInst = brutoAll > 0 ? valorInstBase / brutoAll : 0;
              return {
                valorTabela: valorInstBase,
                lucro: (p.lucro_item || 0) * propInst,
                descricao: `${p.descricao || 'Porta'} — instalação`,
                idSuffix: '-inst',
              };
            }
            return null;
          }),
        );

        // ---- Itens Avulsos (acessorio + adicional) ----
        const detalheAvulsoBuilder = (targetBucket: 'acessorios' | 'avulsos') =>
          buildCategoriaDetalhe(todosRows, (p) => {
            if (!['acessorio', 'adicional'].includes(p.tipo_produto)) return null;
            if (classificarAvulso(p) !== targetBucket) return null;
            const qty = p.quantidade || 1;
            const bruto = (p.valor_produto || 0) * qty;
            if (bruto <= 0) return null;
            return {
              valorTabela: bruto,
              lucro: p.lucro_item || 0,
              descricao: p.descricao || (targetBucket === 'acessorios' ? 'Acessório' : 'Item avulso'),
            };
          });
        setAvulsosDetalhe(detalheAvulsoBuilder('avulsos'));
        setAcessoriosDetalhe(detalheAvulsoBuilder('acessorios'));
      } catch (err) {
        console.error('Erro ao buscar dados DRE:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [mes]);

  // Buscar status realizado deste mês
  useEffect(() => {
    if (!mes) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('dre_realizados' as any)
        .select('realizado_em, observacoes, status')
        .eq('mes', `${mes}-01`)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        const st = ((data as any).status as 'pendente' | 'realizado' | 'aprovado') || 'pendente';
        setRealizadoRow({ realizado_em: (data as any).realizado_em, observacoes: (data as any).observacoes, status: st });
        setRealizadoObs((data as any).observacoes || '');
        setStatusSelecionado(st);
      } else {
        setRealizadoRow(null);
        setRealizadoObs('');
        setStatusSelecionado('pendente');
      }
    })();
    return () => { cancelled = true; };
  }, [mes]);

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const columns = [
    { key: 'portas', label: 'Portas' },
    { key: 'pintura', label: 'Pintura' },
    { key: 'instalacoes', label: 'Instalações' },
    { key: 'fretes', label: 'Fretes' },
    { key: 'acessorios', label: 'Acessórios' },
    { key: 'avulsos', label: 'Itens Avulsos' },
    { key: 'total', label: 'Total' },
  ] as const;

  const totalDespFixas = despesasFixas.reduce((acc, d) => acc + (d.valor_real || 0), 0);
  const totalDespFolha = despesasFolha.reduce((acc, d) => acc + (d.valor_real || 0), 0);
  const totalDespVariaveis = despesasVariaveis.reduce((acc, d) => acc + (d.valor_real || 0), 0);
  const totalDespImpostos = despesasImpostos.reduce((acc, d) => acc + (d.valor_real || 0), 0);
  const totalDespInvestimentos = despesasInvestimentos.reduce((acc, d) => acc + (d.valor_real || 0), 0);
  const totalDespFornecedores = despesasFornecedores.reduce((acc, d) => acc + (d.valor_real || 0), 0);
  const totalDespFinanciamentos = despesasFinanciamentos.reduce((acc, d) => acc + (d.valor_real || 0), 0);
  const totalDespFretes = despesasFretes.reduce((acc, d) => acc + (d.valor_real || 0), 0);
  const totalDespAutorizados = despesasAutorizados.reduce((acc, d) => acc + (d.valor_real || 0), 0);
  const totalDespSalarios = despesasSalarios.reduce((acc, d) => acc + (d.valor_real || 0), 0);
  const totalProjetadoAnual = tiposCustosVariaveis.reduce((acc, t) => acc + (t.valor_maximo_mensal * 12), 0);

  const { debita: debitaCat } = useCategoriaDreConfig();
  const lucroLiquidoFinal =
    lucro.total
    - descontoExcedido.total
    - (debitaCat('fixa') ? totalDespFixas : 0)
    - (debitaCat('folha') ? totalDespFolha : 0)
    - (debitaCat('variavel') ? totalDespVariaveis : 0)
    - (debitaCat('imposto') ? totalDespImpostos : 0)
    - (debitaCat('investimento') ? totalDespInvestimentos : 0)
    - (debitaCat('fornecedor') ? totalDespFornecedores : 0)
    - (debitaCat('financiamento') ? totalDespFinanciamentos : 0)
    - 0 /* Fretes: já debitados no faturamento de fretes (Seção 1) */
    - (debitaCat('autorizado') ? totalDespAutorizados : 0)
    - (debitaCat('salario') ? totalDespSalarios : 0);
  const lucroBrutoAjustado = lucro.total - descontoExcedido.total;
  const percBrutoFinal = faturamento.total > 0 ? (lucroBrutoAjustado / faturamento.total) * 100 : 0;
  const percLiquidFinal = faturamento.total > 0 ? (lucroLiquidoFinal / faturamento.total) * 100 : 0;

  const screenContent = loading ? (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-white/40" />
    </div>
  ) : (
    <div id={embedded ? undefined : 'dre-screen-area'} className="space-y-6">
      {showFaturamento && (
        <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-3 text-white/40 font-medium text-xs uppercase"></th>
                  {columns.map(col => {
                    const topList = col.key === 'avulsos' ? topAvulsos : col.key === 'acessorios' ? topAcessorios : null;
                    const isPortas = col.key === 'portas';
                    const isPintura = col.key === 'pintura';
                    const isInstalacoes = col.key === 'instalacoes';
                    const isAvulsos = col.key === 'avulsos';
                    const isAcessorios = col.key === 'acessorios';
                    const onClickHeader = isPortas
                      ? () => setPortasModalOpen(true)
                      : isPintura
                        ? () => setPinturaModalOpen(true)
                        : isInstalacoes
                          ? () => setInstalacoesModalOpen(true)
                          : isAvulsos
                            ? () => setAvulsosModalOpen(true)
                            : isAcessorios
                              ? () => setAcessoriosModalOpen(true)
                              : null;
                    return (
                      <th
                        key={col.key}
                        className={`text-right p-3 text-white/40 font-medium text-xs uppercase ${col.key === 'total' ? 'bg-white/5' : ''}`}
                      >
                        {onClickHeader && topList && topList.length > 0 ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={onClickHeader}
                                  className="uppercase cursor-pointer underline decoration-dotted underline-offset-4 hover:text-white transition-colors"
                                >
                                  {col.label}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="max-w-[220px]">
                                <p className="font-semibold mb-1 text-xs">Top 5 mais vendidos</p>
                                {topList.map((item, i) => (
                                  <p key={i} className="text-xs text-muted-foreground">
                                    {i + 1}. {item.nome} ({item.qtd})
                                  </p>
                                ))}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : onClickHeader ? (
                          <button
                            type="button"
                            onClick={onClickHeader}
                            className="uppercase cursor-pointer underline decoration-dotted underline-offset-4 hover:text-white transition-colors"
                          >
                            {col.label}
                          </button>
                        ) : (
                          col.label
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-white/5">
                  <td className="p-3 text-white/60 font-medium text-xs uppercase">Faturamento</td>
                  {columns.map(col => (
                    <td
                      key={col.key}
                      className={`text-right p-3 font-semibold text-white ${col.key === 'total' ? 'bg-white/5' : ''}`}
                    >
                      {formatCurrency(faturamento[col.key])}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-white/5">
                  <td className="p-3 text-white/60 font-medium text-xs uppercase">Desconto Excedido</td>
                  {columns.map(col => {
                    const val = descontoExcedido[col.key] || 0;
                    return (
                      <td
                        key={col.key}
                        className={`text-right p-3 font-semibold ${val > 0 ? 'text-red-400' : 'text-white/30'} ${col.key === 'total' ? 'bg-white/5' : ''}`}
                      >
                        {val > 0 ? `- ${formatCurrency(val)}` : '—'}
                      </td>
                    );
                  })}
                </tr>
                <tr>
                  <td className="p-3 text-white/60 font-medium text-xs uppercase">Lucro</td>
                  {columns.map(col => {
                    const val = col.key === 'fretes'
                      ? (faturamento.fretes - totalDespFretes)
                      : (lucro[col.key] - (descontoExcedido[col.key] || 0));
                    const isInstalacoes = col.key === 'instalacoes';
                    const isFretes = col.key === 'fretes';
                    return (
                      <td
                        key={col.key}
                        className={`text-right p-3 font-semibold ${isFretes ? (val >= 0 ? 'text-blue-400' : 'text-red-400') : isInstalacoes ? 'text-yellow-400' : val >= 0 ? 'text-emerald-400' : 'text-red-400'} ${col.key === 'total' ? 'bg-white/5' : ''}`}
                      >
                        {formatCurrency(val)}
                      </td>
                    );
                  })}
                </tr>
                <tr className="border-t border-white/5">
                  <td className="p-3 text-white/60 font-medium text-xs uppercase">Margem %</td>
                  {columns.map(col => {
                    const lucroCol = col.key === 'fretes'
                      ? (faturamento.fretes - totalDespFretes)
                      : (lucro[col.key] - (descontoExcedido[col.key] || 0));
                    const perc = faturamento[col.key] > 0
                      ? (lucroCol / faturamento[col.key]) * 100
                      : 0;
                    const isInstalacoes = col.key === 'instalacoes';
                    const isFretes = col.key === 'fretes';
                    return (
                      <td key={col.key} className={`text-right p-3 ${col.key === 'total' ? 'bg-white/5' : ''}`}>
                        <span className={`inline-block rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold ${isFretes ? (perc >= 0 ? 'text-blue-400' : 'text-red-400') : isInstalacoes ? 'text-yellow-400' : perc >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {perc.toFixed(1)}%
                        </span>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
      {showDespesas && (
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_1fr] gap-4">
          <div className="space-y-4">
            <DespesaSectionReadOnly
              title="Folha Salarial"
              despesas={despesasFolha}
              total={totalDespFolha}
              formatCurrency={formatCurrency}
              tiposDisponiveis={tiposCustosFixos.filter(t => isFolha(t.nome))}
              debita={debitaCat('folha')}
            />
            <DespesaSectionReadOnly
              title="Despesas Fixas"
              despesas={despesasFixas}
              total={totalDespFixas}
              formatCurrency={formatCurrency}
              tiposDisponiveis={tiposCustosFixos.filter(t => !isFolha(t.nome))}
              onClickTipo={(id, nome) => setTipoModal({ id, nome })}
              debita={debitaCat('fixa')}
            />
            <DespesaSectionReadOnly
              title="Despesas Variáveis"
              despesas={despesasVariaveis}
              total={totalDespVariaveis}
              formatCurrency={formatCurrency}
              tiposDisponiveis={tiposCustosVariaveis}
              onClickTipo={(id, nome) => setTipoModal({ id, nome })}
              debita={debitaCat('variavel')}
            />
            <DespesaSectionReadOnly
              title="Despesas de Imposto"
              despesas={despesasImpostos}
              total={totalDespImpostos}
              formatCurrency={formatCurrency}
              tiposDisponiveis={tiposCustosImpostos}
              onClickTipo={(id, nome) => setTipoModal({ id, nome })}
              debita={debitaCat('imposto')}
            />
            <DespesaSectionReadOnly
              title="Investimentos"
              despesas={despesasInvestimentos}
              total={totalDespInvestimentos}
              formatCurrency={formatCurrency}
              tiposDisponiveis={tiposCustosInvestimentos}
              onClickTipo={(id, nome) => setTipoModal({ id, nome })}
              debita={debitaCat('investimento')}
            />
            <DespesaSectionReadOnly
              title="Fornecedores"
              despesas={despesasFornecedores}
              total={totalDespFornecedores}
              formatCurrency={formatCurrency}
              tiposDisponiveis={tiposCustosFornecedores}
              onClickTipo={(id, nome) => setTipoModal({ id, nome })}
              debita={debitaCat('fornecedor')}
            />
            <DespesaSectionReadOnly
              title="Financiamentos"
              despesas={despesasFinanciamentos}
              total={totalDespFinanciamentos}
              formatCurrency={formatCurrency}
              tiposDisponiveis={tiposCustosFinanciamentos}
              onClickTipo={(id, nome) => setTipoModal({ id, nome })}
              debita={debitaCat('financiamento')}
            />
            <DespesaSectionReadOnly
              title="Fretes e Logística"
              despesas={despesasFretes}
              total={totalDespFretes}
              formatCurrency={formatCurrency}
              tiposDisponiveis={tiposCustosFretes}
              onClickTipo={(id, nome) => setTipoModal({ id, nome })}
              debita={true}
            />
            <DespesaSectionReadOnly
              title="Autorizados"
              despesas={despesasAutorizados}
              total={totalDespAutorizados}
              formatCurrency={formatCurrency}
              tiposDisponiveis={tiposCustosAutorizados}
              onClickTipo={(id, nome) => setTipoModal({ id, nome })}
              debita={debitaCat('autorizado')}
            />
            <DespesaSectionReadOnly
              title="Salários"
              despesas={despesasSalarios}
              total={totalDespSalarios}
              formatCurrency={formatCurrency}
              tiposDisponiveis={tiposCustosSalarios}
              onClickTipo={(id, nome) => setTipoModal({ id, nome })}
              debita={debitaCat('salario')}
            />
          </div>
          {viewMode === 'full' && (
            <>
              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">Estoque</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                    <span className="text-sm text-white/60">Total de Itens</span>
                    <span className="text-sm font-medium text-white">{estoqueResumo.totalItens.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-white/60">Valor Total</span>
                    <span className="text-sm font-bold text-white">{formatCurrency(estoqueResumo.valorTotal)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
      {showResumoFinal && (() => {
        const lucroLiquido = lucroLiquidoFinal;
        const lucroBrutoAdj = lucro.total - descontoExcedido.total;
        const percBruto = faturamento.total > 0 ? (lucroBrutoAdj / faturamento.total) * 100 : 0;
        const percLiquid = faturamento.total > 0 ? (lucroLiquido / faturamento.total) * 100 : 0;
        const colorClass = (v: number) => v >= 0 ? 'text-emerald-400' : 'text-red-400';
        const despesaCols: Array<{ label: string; categoria: CategoriaDespesa; total: number }> = [
          { label: 'Folha Salarial', categoria: 'folha', total: totalDespFolha },
          { label: 'Despesas Fixas', categoria: 'fixa', total: totalDespFixas },
          { label: 'Desp. Variáveis', categoria: 'variavel', total: totalDespVariaveis },
          { label: 'Despesas de Imposto', categoria: 'imposto', total: totalDespImpostos },
          { label: 'Investimentos', categoria: 'investimento', total: totalDespInvestimentos },
          { label: 'Fornecedores', categoria: 'fornecedor', total: totalDespFornecedores },
          { label: 'Financiamentos', categoria: 'financiamento', total: totalDespFinanciamentos },
          { label: 'Fretes e Logística', categoria: 'frete', total: totalDespFretes },
          { label: 'Autorizados', categoria: 'autorizado', total: totalDespAutorizados },
        ];
        const items = [
          { label: 'Faturamento Bruto', value: formatCurrency(faturamento.total), color: 'text-white' },
          ...(descontoExcedido.total > 0 ? [{ label: 'Desconto Excedido', value: `- ${formatCurrency(descontoExcedido.total)}`, color: 'text-red-400' }] : []),
          { label: '% Bruto', value: `${percBruto.toFixed(1)}%`, color: colorClass(percBruto) },
          { label: 'Fat. Líquido (Lucro Bruto)', value: formatCurrency(lucroBrutoAdj), color: colorClass(lucroBrutoAdj) },
          ...despesaCols
            .filter(c => debitaCat(c.categoria))
            .map(c => ({ label: c.label, value: formatCurrency(c.total), color: 'text-red-400' })),
          { label: 'Lucro Líquido', value: formatCurrency(lucroLiquido), color: colorClass(lucroLiquido) },
          { label: '% Lucro Líquido', value: `${percLiquid.toFixed(1)}%`, color: colorClass(percLiquid) },
        ];
        return (
          <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    {items.map((item, i) => (
                      <th key={i} className="text-center p-3 text-white/40 font-medium text-xs uppercase whitespace-nowrap">
                        {item.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {items.map((item, i) => (
                      <td key={i} className={`text-center p-3 font-semibold whitespace-nowrap ${item.color}`}>
                        {item.value}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}
    </div>
  );

  const modals = (
    <>
      <GastosDoTipoDialog
        open={!!tipoModal}
        onOpenChange={(o) => { if (!o) setTipoModal(null); }}
        mes={mes || ''}
        tipoCustoId={tipoModal?.id || null}
        tipoNome={tipoModal?.nome || ''}
        formatCurrency={formatCurrency}
      />
      <PortasDetalheDialog
        open={portasModalOpen}
        onOpenChange={setPortasModalOpen}
        mesNome={mesNome}
        vendas={portasDetalhe}
        formatCurrency={formatCurrency}
      />
      <PortasDetalheDialog
        open={pinturaModalOpen}
        onOpenChange={setPinturaModalOpen}
        mesNome={mesNome}
        vendas={pinturaDetalhe}
        formatCurrency={formatCurrency}
        titulo="Vendas com Pintura"
        categoriaLabel="Pintura"
      />
      <PortasDetalheDialog
        open={instalacoesModalOpen}
        onOpenChange={setInstalacoesModalOpen}
        mesNome={mesNome}
        vendas={instalacaoDetalhe}
        formatCurrency={formatCurrency}
        titulo="Vendas com Instalação"
        categoriaLabel="Instalação"
      />
      <PortasDetalheDialog
        open={avulsosModalOpen}
        onOpenChange={setAvulsosModalOpen}
        mesNome={mesNome}
        vendas={avulsosDetalhe}
        formatCurrency={formatCurrency}
        titulo="Vendas com Itens Avulsos"
        categoriaLabel="Itens Avulsos"
      />
      <PortasDetalheDialog
        open={acessoriosModalOpen}
        onOpenChange={setAcessoriosModalOpen}
        mesNome={mesNome}
        vendas={acessoriosDetalhe}
        formatCurrency={formatCurrency}
        titulo="Vendas com Acessórios"
        categoriaLabel="Acessórios"
      />
      <Dialog open={realizadoDialogOpen} onOpenChange={setRealizadoDialogOpen}>
        <DialogContent className="max-w-lg bg-slate-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Alterar Status</DialogTitle>
            <DialogDescription className="text-white/60">
              Defina o status do D.R.E de {mesNome}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-2">
            {([
              { key: 'pendente', label: 'Pendente', cls: 'bg-red-500/15 border-red-500/40 text-red-200', active: 'bg-red-500/30 border-red-500 text-red-100' },
              { key: 'realizado', label: 'Realizado', cls: 'bg-yellow-500/15 border-yellow-500/40 text-yellow-200', active: 'bg-yellow-500/30 border-yellow-500 text-yellow-100' },
              { key: 'aprovado', label: 'Aprovado', cls: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200', active: 'bg-emerald-500/30 border-emerald-500 text-emerald-100' },
            ] as const).map(opt => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setStatusSelecionado(opt.key)}
                className={`px-3 py-2 rounded-lg border text-sm transition-colors ${statusSelecionado === opt.key ? opt.active : opt.cls + ' opacity-70 hover:opacity-100'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="space-y-2 text-sm">
            {[
              ['Faturamento total', faturamento.total],
              ['Lucro bruto', lucro.total],
              ['Despesas fixas', totalDespFixas],
              ['Despesas folha', totalDespFolha],
              ['Despesas variáveis', totalDespVariaveis],
              ['Lucro líquido final', lucroLiquidoFinal],
            ].map(([label, value]) => (
              <div key={label as string} className="flex items-center justify-between border-b border-white/5 py-1.5">
                <span className="text-white/60">{label}</span>
                <span className="font-semibold text-white tabular-nums">{formatCurrency(value as number)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between py-1.5">
              <span className="text-white/60">% Bruto / % Líquido</span>
              <span className="font-semibold text-white tabular-nums">
                {percBrutoFinal.toFixed(2)}% / {percLiquidFinal.toFixed(2)}%
              </span>
            </div>
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Observações (opcional)</label>
            <Textarea
              value={realizadoObs}
              onChange={(e) => setRealizadoObs(e.target.value)}
              placeholder="Notas sobre o fechamento deste mês..."
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setRealizadoDialogOpen(false)} disabled={realizadoSaving}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                if (!mes) return;
                setRealizadoSaving(true);
                try {
                  const { data: userData } = await supabase.auth.getUser();
                  const payload = {
                    mes: `${mes}-01`,
                    faturamento_total: faturamento.total,
                    lucro_bruto: lucro.total,
                    total_despesas_fixas: totalDespFixas,
                    total_despesas_folha: totalDespFolha,
                    total_despesas_variaveis: totalDespVariaveis,
                    lucro_liquido_final: lucroLiquidoFinal,
                    perc_bruto: percBrutoFinal,
                    perc_liquido: percLiquidFinal,
                    observacoes: realizadoObs || null,
                    realizado_por: userData.user?.id || null,
                    realizado_em: new Date().toISOString(),
                    status: statusSelecionado,
                  };
                  const { error } = await supabase
                    .from('dre_realizados' as any)
                    .upsert(payload, { onConflict: 'mes' });
                  if (error) throw error;
                  setRealizadoRow({ realizado_em: payload.realizado_em, observacoes: payload.observacoes, status: statusSelecionado });
                  setRealizadoDialogOpen(false);
                  toast.success('Status atualizado');
                } catch (err: any) {
                  console.error('Erro ao salvar dre_realizados:', err);
                  toast.error('Erro ao salvar: ' + (err?.message || 'desconhecido'));
                } finally {
                  setRealizadoSaving(false);
                }
              }}
              disabled={realizadoSaving}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              {realizadoSaving ? 'Salvando...' : realizadoRow ? 'Atualizar' : 'Confirmar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );

  if (embedded) {
    return (
      <>
        {screenContent}
        {modals}
      </>
    );
  }

  return (
    <>
    <style>{`
      @media print {
        @page { size: A4; margin: 0; }
        body * { visibility: hidden !important; }
        #dre-screen-area { display: none !important; }
        #dre-print-document, #dre-print-document * { visibility: visible !important; }
        #dre-print-document, #dre-print-document * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        #dre-print-document {
          display: block !important;
          position: static !important;
          width: 100%;
          padding: 14mm 12mm !important;
          background: white !important;
          color: #0f172a !important;
          font-family: 'Helvetica Neue', Arial, sans-serif;
          font-size: 10pt;
          line-height: 1.4;
        }
        #dre-print-document .pdf-page-break {
          page-break-before: always;
          break-before: page;
          -webkit-column-break-before: always;
          display: block;
          height: 1px;
          width: 100%;
        }
        #dre-print-document .pdf-page-break::before {
          content: '\\00a0';
          display: block;
          page-break-before: always;
          break-before: page;
        }
        @page landscape { size: A4 landscape; margin: 12mm 14mm; }
        #dre-print-document .pdf-landscape-page {
          page: landscape;
          page-break-before: always;
          break-before: page;
        }
        #dre-print-document .pdf-landscape-content {
          width: 100%;
        }
        #dre-print-document .pdf-avoid-break {
          page-break-inside: avoid;
          break-inside: avoid;
          -webkit-column-break-inside: avoid;
        }
        #dre-print-document table { border-collapse: collapse; width: 100%; }
        #dre-print-document thead { display: table-header-group; }
        #dre-print-document tfoot { display: table-footer-group; }
        #dre-print-document tr, #dre-print-document td, #dre-print-document th {
          page-break-inside: avoid;
          break-inside: avoid;
        }
      }
      #dre-print-document { display: none; }
    `}</style>

    {/* ============ DOCUMENTO DE IMPRESSÃO (oculto na tela) ============ */}
    <div id="dre-print-document">
      <PrintReport
        mesNome={mesNome}
        faturamento={faturamento}
        lucro={lucro}
        descontoExcedido={descontoExcedido}
        despesasFixas={despesasFixas}
        despesasFolha={despesasFolha}
        folhaDetalhada={folhaDetalhada}
        despesasVariaveis={despesasVariaveis}
        despesasImpostos={despesasImpostos}
        despesasInvestimentos={despesasInvestimentos}
        despesasFornecedores={despesasFornecedores}
        despesasFinanciamentos={despesasFinanciamentos}
        despesasFretes={despesasFretes}
        despesasAutorizados={despesasAutorizados}
        despesasSalarios={despesasSalarios}
        tiposCustosVariaveis={tiposCustosVariaveis}
        tiposCustosFixos={tiposCustosFixos}
        tiposCustosImpostos={tiposCustosImpostos}
        tiposCustosInvestimentos={tiposCustosInvestimentos}
        tiposCustosFornecedores={tiposCustosFornecedores}
        tiposCustosFinanciamentos={tiposCustosFinanciamentos}
        tiposCustosFretes={tiposCustosFretes}
        tiposCustosAutorizados={tiposCustosAutorizados}
        tiposCustosSalarios={tiposCustosSalarios}
        totalDespFixas={totalDespFixas}
        totalDespFolha={totalDespFolha}
        totalDespVariaveis={totalDespVariaveis}
        totalDespImpostos={totalDespImpostos}
        totalDespInvestimentos={totalDespInvestimentos}
        totalDespFornecedores={totalDespFornecedores}
        totalDespFinanciamentos={totalDespFinanciamentos}
        totalDespFretes={totalDespFretes}
        totalDespAutorizados={totalDespAutorizados}
        totalDespSalarios={totalDespSalarios}
        totalProjetadoAnual={totalProjetadoAnual}
        topAvulsos={topAvulsos}
        estoqueResumo={estoqueResumo}
        lucroLiquidoFinal={lucroLiquidoFinal}
        percBrutoFinal={percBrutoFinal}
        percLiquidFinal={percLiquidFinal}
        formatCurrency={formatCurrency}
        vendasListagem={vendasListagem}
        debitaCat={debitaCat}
      />
    </div>

    <style>{`
      @media screen {
        /* Mantém fora da tela mas renderizado, para que imagens (logo) carreguem */
        #dre-print-document {
          position: absolute !important;
          left: -10000px !important;
          top: 0 !important;
          width: 1px !important;
          height: 1px !important;
          overflow: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }
      }
    `}</style>
    <MinimalistLayout
      title="D.R.E"
      subtitle={mesNome}
      backPath="/direcao/estrategia/dre"
      fullWidth
      breadcrumbItems={[
        { label: 'Home', path: '/home' },
        { label: 'Direção', path: '/direcao' },
        { label: 'Estratégia', path: '/direcao/estrategia' },
        { label: 'DRE', path: '/direcao/estrategia/dre' },
        { label: mesNome },
      ]}
      headerActions={
        !loading ? (
          <div className="flex items-center gap-2 print:hidden">
            {(() => {
              const st = realizadoRow?.status ?? 'pendente';
              const map = {
                pendente: { label: 'Pendente', cls: 'bg-red-500/15 border-red-500/40 text-red-200 hover:bg-red-500/25' },
                realizado: { label: 'Realizado', cls: 'bg-yellow-500/15 border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/25' },
                aprovado: { label: 'Aprovado', cls: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/25' },
              } as const;
              const cur = map[st];
              return (
                <button
                  onClick={() => setRealizadoDialogOpen(true)}
                  title={`Status atual: ${cur.label}`}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-colors ${cur.cls}`}
                >
                  <span className={`inline-block w-2 h-2 rounded-full ${st === 'pendente' ? 'bg-red-400' : st === 'realizado' ? 'bg-yellow-400' : 'bg-emerald-400'}`} />
                  Alterar Status
                </button>
              );
            })()}
            <button
            onClick={async () => {
              // Pré-carrega o logo antes de imprimir, pois #dre-print-document
              // está em display:none e o Chrome pode não carregar a imagem a tempo.
              try {
                await new Promise<void>((resolve) => {
                  const img = new Image();
                  img.onload = () => resolve();
                  img.onerror = () => resolve();
                  img.src = logoElisa;
                });
              } catch {}
              window.print();
            }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 border border-white/10 text-white text-sm hover:bg-white/20 transition-colors"
            >
              <Printer className="w-4 h-4" strokeWidth={1.5} />
              Imprimir PDF
            </button>
          </div>
        ) : undefined
      }
    >
      {screenContent}
    </MinimalistLayout>
    {modals}
    </>
  );
}

function PortasDetalheDialog({
  open,
  onOpenChange,
  mesNome,
  vendas,
  formatCurrency,
  titulo = 'Vendas com Portas de Enrolar',
  categoriaLabel = 'Porta de Enrolar',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mesNome: string;
  vendas: VendaComPortasRow[];
  formatCurrency: (v: number) => string;
  titulo?: string;
  categoriaLabel?: string;
}) {
  const totals = vendas.reduce(
    (acc, v) => {
      v.itens.forEach((i) => {
        acc.tabela += i.valorTabela;
        acc.frete += i.freteRateado;
        acc.final += i.valorFinal;
        acc.lucro += i.lucro;
        acc.descAuto += i.descAuto;
        acc.descFria += i.descFria;
        acc.descGerente += i.descGerente;
        acc.descDiretor += i.descDiretor;
      });
      return acc;
    },
    { tabela: 0, frete: 0, final: 0, lucro: 0, descAuto: 0, descFria: 0, descGerente: 0, descDiretor: 0 }
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[92vh] overflow-y-auto bg-gradient-to-b from-slate-950 to-slate-900 border-white/10 text-white">
        <DialogHeader className="pb-2 border-b border-white/5">
          <DialogTitle className="text-white text-xl font-semibold tracking-tight">
            {titulo}
            <span className="text-white/40 font-normal ml-2">— {mesNome}</span>
          </DialogTitle>
          <DialogDescription className="text-white/50">
            {vendas.length} venda{vendas.length === 1 ? '' : 's'} com itens de {categoriaLabel}.
          </DialogDescription>
          <div className="flex flex-wrap gap-3 pt-3 text-[11px] text-white/60">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-white/60" /> Auto (até {3}% se não-cartão)</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-sky-400" /> Fria (+ 5% se temp. fria)</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" /> Gerente (+ 7% com senha)</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400" /> Diretor (restante)</span>
          </div>
        </DialogHeader>

        {vendas.length === 0 ? (
          <p className="text-white/40 text-sm py-8 text-center">Nenhuma venda com {categoriaLabel.toLowerCase()} neste mês.</p>
        ) : (
          <div className="space-y-4 pt-4">
            {vendas.map((v) => {
              const subFinal = v.itens.reduce((s, i) => s + i.valorFinal, 0);
              const subLucro = v.itens.reduce((s, i) => s + i.lucro, 0);
              return (
                <div key={v.vendaId} className="rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 p-4">
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <div>
                      <div className="text-xs text-white/40 uppercase">{format(new Date(v.dataVenda.slice(0, 10) + 'T12:00:00'), 'dd/MM/yyyy')}</div>
                      <div className="text-sm font-semibold text-white flex items-center gap-1.5 flex-wrap">
                        <span>{v.clienteNome || '—'}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded border bg-white/10 text-white/70 border-white/20 font-medium uppercase tracking-wide">{v.metodoPagamento}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium uppercase tracking-wide ${v.isFria ? 'bg-sky-500/15 text-sky-300 border-sky-500/30' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'}`}>{v.temperaturaLabel}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-white/40 uppercase">Valor da venda</div>
                      <div className="text-sm font-semibold text-white">{formatCurrency(v.valorVenda)}</div>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-white/10 text-white/40 uppercase text-[10px]">
                          <th className="text-left py-2 font-medium">Descrição</th>
                          <th className="text-right py-2 font-medium w-12">Qtd</th>
                          <th className="text-right py-2 font-medium w-24">Vlr Tabela</th>
                          <th className="text-right py-2 font-medium w-20">Frete</th>
                          <th className="text-right py-2 font-medium w-20">D. Auto</th>
                          <th className="text-right py-2 font-medium w-20">D. Fria</th>
                          <th className="text-right py-2 font-medium w-20">D. Gerente</th>
                          <th className="text-right py-2 font-medium w-20">D. Diretor</th>
                          <th className="text-right py-2 font-medium w-24">Vlr Final</th>
                          <th className="text-right py-2 font-medium w-20">Lucro</th>
                        </tr>
                      </thead>
                      <tbody>
                        {v.itens.map((i) => (
                          <tr key={i.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                            <td className="py-2 text-white/80">{i.descricao}</td>
                            <td className="py-2 text-right text-white/70">{i.quantidade}</td>
                            <td className="py-2 text-right text-white/80">{formatCurrency(i.valorTabela)}</td>
                            <td className="py-2 text-right text-white/70">{i.freteRateado > 0 ? formatCurrency(i.freteRateado) : '—'}</td>
                            <td className={`py-2 text-right ${i.descAuto > 0 ? 'text-white/70' : 'text-white/25'}`}>{i.descAuto > 0 ? formatCurrency(i.descAuto) : '—'}</td>
                            <td className={`py-2 text-right ${i.descFria > 0 ? 'text-sky-400' : 'text-white/25'}`}>{i.descFria > 0 ? formatCurrency(i.descFria) : '—'}</td>
                            <td className={`py-2 text-right ${i.descGerente > 0 ? 'text-amber-400' : 'text-white/25'}`}>{i.descGerente > 0 ? formatCurrency(i.descGerente) : '—'}</td>
                            <td className={`py-2 text-right ${i.descDiretor > 0 ? 'text-red-400' : 'text-white/25'}`}>{i.descDiretor > 0 ? formatCurrency(i.descDiretor) : '—'}</td>
                            <td className="py-2 text-right text-white font-medium">{formatCurrency(i.valorFinal)}</td>
                            <td className={`py-2 text-right font-medium ${i.lucro >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrency(i.lucro)}</td>
                          </tr>
                        ))}
                        <tr className="border-t border-white/10">
                          <td colSpan={8} className="py-2 text-right text-white/60 uppercase text-[10px]">Subtotal desta venda</td>
                          <td className="py-2 text-right text-white font-semibold">{formatCurrency(subFinal)}</td>
                          <td className={`py-2 text-right font-semibold ${subLucro >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrency(subLucro)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

            <div className="rounded-2xl bg-blue-500/10 border border-blue-400/20 backdrop-blur-xl p-4 sticky bottom-0">
              <div className="text-xs text-white/60 uppercase mb-2 font-semibold">Totais consolidados ({categoriaLabel})</div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 text-sm">
                <div><div className="text-[10px] text-white/40 uppercase">Valor Tabela</div><div className="font-semibold text-white">{formatCurrency(totals.tabela)}</div></div>
                <div><div className="text-[10px] text-white/40 uppercase">Frete</div><div className="font-semibold text-white">{formatCurrency(totals.frete)}</div></div>
                <div><div className="text-[10px] text-white/40 uppercase">D. Auto</div><div className={`font-semibold ${totals.descAuto > 0 ? 'text-white' : 'text-white/40'}`}>{totals.descAuto > 0 ? formatCurrency(totals.descAuto) : '—'}</div></div>
                <div><div className="text-[10px] text-white/40 uppercase">D. Fria</div><div className={`font-semibold ${totals.descFria > 0 ? 'text-sky-400' : 'text-white/40'}`}>{totals.descFria > 0 ? formatCurrency(totals.descFria) : '—'}</div></div>
                <div><div className="text-[10px] text-white/40 uppercase">D. Gerente</div><div className={`font-semibold ${totals.descGerente > 0 ? 'text-amber-400' : 'text-white/40'}`}>{totals.descGerente > 0 ? formatCurrency(totals.descGerente) : '—'}</div></div>
                <div><div className="text-[10px] text-white/40 uppercase">D. Diretor</div><div className={`font-semibold ${totals.descDiretor > 0 ? 'text-red-400' : 'text-white/40'}`}>{totals.descDiretor > 0 ? formatCurrency(totals.descDiretor) : '—'}</div></div>
                <div><div className="text-[10px] text-white/40 uppercase">Valor Final</div><div className="font-semibold text-white">{formatCurrency(totals.final)}</div></div>
                <div><div className="text-[10px] text-white/40 uppercase">Lucro</div><div className={`font-semibold ${totals.lucro >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrency(totals.lucro)}</div></div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ItensSimplesDetalheDialog({
  open,
  onOpenChange,
  titulo,
  categoriaLabel,
  vendas,
  formatCurrency,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titulo: string;
  categoriaLabel: string;
  vendas: VendaComItensSimplesRow[];
  formatCurrency: (v: number) => string;
}) {
  const totals = vendas.reduce(
    (acc, v) => {
      v.itens.forEach((i) => {
        acc.bruto += i.valorBruto;
        acc.desconto += i.descontoLinha;
        acc.liquido += i.valorLiquido;
        acc.lucro += i.lucro;
        acc.qtd += i.quantidade;
      });
      return acc;
    },
    { bruto: 0, desconto: 0, liquido: 0, lucro: 0, qtd: 0 }
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-slate-900 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">{titulo}</DialogTitle>
          <DialogDescription className="text-white/60">
            {vendas.length} venda{vendas.length === 1 ? '' : 's'} com itens da categoria {categoriaLabel}.
          </DialogDescription>
        </DialogHeader>

        {vendas.length === 0 ? (
          <p className="text-white/40 text-sm py-8 text-center">Nenhuma venda com {categoriaLabel.toLowerCase()} neste mês.</p>
        ) : (
          <div className="space-y-4">
            {vendas.map((v) => {
              const subLiquido = v.itens.reduce((s, i) => s + i.valorLiquido, 0);
              const subLucro = v.itens.reduce((s, i) => s + i.lucro, 0);
              return (
                <div key={v.vendaId} className="rounded-xl bg-white/5 border border-white/10 p-4">
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <div>
                      <div className="text-xs text-white/40 uppercase">{format(new Date(v.dataVenda.slice(0, 10) + 'T12:00:00'), 'dd/MM/yyyy')}</div>
                      <div className="text-sm font-semibold text-white">{v.clienteNome || '—'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-white/40 uppercase">Valor da venda</div>
                      <div className="text-sm font-semibold text-white">{formatCurrency(v.valorVenda)}</div>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-white/10 text-white/40 uppercase">
                          <th className="text-left py-2 font-medium">Descrição</th>
                          <th className="text-right py-2 font-medium w-12">Qtd</th>
                          <th className="text-right py-2 font-medium w-24">Valor unit.</th>
                          <th className="text-right py-2 font-medium w-24">Bruto</th>
                          <th className="text-right py-2 font-medium w-24">Desconto</th>
                          <th className="text-right py-2 font-medium w-28">Líquido</th>
                          <th className="text-right py-2 font-medium w-24">Lucro</th>
                        </tr>
                      </thead>
                      <tbody>
                        {v.itens.map((i) => (
                          <tr key={i.id} className="border-b border-white/5 last:border-0">
                            <td className="py-2 text-white/80">{i.descricao}</td>
                            <td className="py-2 text-right text-white/70">{i.quantidade}</td>
                            <td className="py-2 text-right text-white/70">{formatCurrency(i.valorUnitario)}</td>
                            <td className="py-2 text-right text-white/70">{formatCurrency(i.valorBruto)}</td>
                            <td className="py-2 text-right text-red-400">{i.descontoLinha > 0 ? formatCurrency(i.descontoLinha) : '—'}</td>
                            <td className="py-2 text-right text-white font-medium">{formatCurrency(i.valorLiquido)}</td>
                            <td className={`py-2 text-right font-medium ${i.lucro >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrency(i.lucro)}</td>
                          </tr>
                        ))}
                        <tr className="border-t border-white/10">
                          <td colSpan={5} className="py-2 text-right text-white/60 uppercase text-[10px]">Subtotal desta venda</td>
                          <td className="py-2 text-right text-white font-semibold">{formatCurrency(subLiquido)}</td>
                          <td className={`py-2 text-right font-semibold ${subLucro >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrency(subLucro)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

            <div className="rounded-xl bg-blue-900/40 border border-blue-500/30 p-4">
              <div className="text-xs text-white/60 uppercase mb-2 font-semibold">Totais consolidados ({categoriaLabel})</div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                <div><div className="text-[10px] text-white/40 uppercase">Qtd Itens</div><div className="font-semibold text-white">{totals.qtd}</div></div>
                <div><div className="text-[10px] text-white/40 uppercase">Bruto</div><div className="font-semibold text-white">{formatCurrency(totals.bruto)}</div></div>
                <div><div className="text-[10px] text-white/40 uppercase">Desconto</div><div className="font-semibold text-red-400">{formatCurrency(totals.desconto)}</div></div>
                <div><div className="text-[10px] text-white/40 uppercase">Líquido</div><div className="font-semibold text-white">{formatCurrency(totals.liquido)}</div></div>
                <div><div className="text-[10px] text-white/40 uppercase">Lucro</div><div className={`font-semibold ${totals.lucro >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrency(totals.lucro)}</div></div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
