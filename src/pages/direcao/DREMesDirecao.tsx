import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, Printer, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MinimalistLayout } from '@/components/MinimalistLayout';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import logoElisa from '@/assets/logo-elisa-dre.png';

interface FaturamentoProduto {
  portas: number;
  pintura: number;
  instalacoes: number;
  acessorios: number;
  adicionais: number;
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
  itens: {
    id: string;
    descricao: string;
    quantidade: number;
    valorPortaBruto: number;
    valorPinturaBruto: number;
    valorInstalacaoBruto: number;
    descontoLinha: number;
    valorLiquido: number;
    lucro: number;
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

// "Salário" ou "Folha" vai para folha salarial
const isFolha = (nome: string) => /sal[áa]rio|folha/i.test(nome);

function DespesaSectionReadOnly({
  title,
  despesas,
  total,
  formatCurrency,
  tiposDisponiveis,
  onClickTipo,
}: {
  title: string;
  despesas: DespesaAgrupada[];
  total: number;
  formatCurrency: (v: number) => string;
  tiposDisponiveis?: TipoCustoVariavel[];
  onClickTipo?: (tipoCustoId: string, nome: string) => void;
}) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white/70 uppercase">{title}</h3>
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

// =============== Modal com gastos do tipo selecionado ===============
interface GastoRow {
  id: string;
  data: string;
  descricao: string | null;
  valor: number;
  status: string | null;
  responsavel_nome?: string;
  banco_nome?: string;
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

      const { data: gastos, error } = await supabase
        .from('gastos' as any)
        .select('id, data, descricao, valor, status, responsavel_id, banco_id')
        .eq('tipo_custo_id', tipoCustoId)
        .gte('data', start)
        .lte('data', end)
        .order('data', { ascending: false });

      if (error || !gastos) {
        if (!cancelled) { setRows([]); setLoading(false); }
        return;
      }

      const respIds = [...new Set((gastos as any[]).map((g: any) => g.responsavel_id).filter(Boolean))];
      const bancoIds = [...new Set((gastos as any[]).map((g: any) => g.banco_id).filter(Boolean))];

      const [respRes, bancoRes] = await Promise.all([
        respIds.length
          ? supabase.from('admin_users').select('user_id, nome').in('user_id', respIds)
          : Promise.resolve({ data: [] as any[] }),
        bancoIds.length
          ? supabase.from('bancos' as any).select('id, nome').in('id', bancoIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const respMap: Record<string, string> = {};
      ((respRes.data || []) as any[]).forEach((u: any) => { respMap[u.user_id] = u.nome; });
      const bancoMap: Record<string, string> = {};
      ((bancoRes.data || []) as any[]).forEach((b: any) => { bancoMap[b.id] = b.nome; });

      const mapped: GastoRow[] = (gastos as any[]).map((g: any) => ({
        id: g.id,
        data: g.data,
        descricao: g.descricao,
        valor: Number(g.valor) || 0,
        status: g.status,
        responsavel_nome: g.responsavel_id ? respMap[g.responsavel_id] || '—' : '—',
        banco_nome: g.banco_id ? bancoMap[g.banco_id] || '—' : '—',
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
            Gastos lançados em {mes} • {rows.length} {rows.length === 1 ? 'lançamento' : 'lançamentos'}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg bg-white/5 border border-white/10 overflow-hidden max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="p-8 flex items-center justify-center text-white/50">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-center text-white/40 text-sm">
              Nenhum gasto lançado neste tipo para o mês.
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[#0a0a0a]">
                <tr className="border-b border-white/10 text-white/40 uppercase text-[10px]">
                  <th className="text-left p-2 font-medium">Data</th>
                  <th className="text-left p-2 font-medium">Descrição</th>
                  <th className="text-left p-2 font-medium">Responsável</th>
                  <th className="text-left p-2 font-medium">Banco</th>
                  <th className="text-left p-2 font-medium">Status</th>
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
                    <td className="p-2 text-white/60">{r.responsavel_nome}</td>
                    <td className="p-2 text-white/60">{r.banco_nome}</td>
                    <td className="p-2 text-white/60">{r.status || '—'}</td>
                    <td className="p-2 text-right font-medium text-white tabular-nums">
                      {formatCurrency(r.valor)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-white/10 bg-white/5">
                  <td colSpan={5} className="p-2 text-white/70 font-semibold">Total</td>
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
            onClick={() => navigate(`/administrativo/financeiro/gastos?mes=${mes}`)}
          >
            <ExternalLink className="h-4 w-4 mr-2" />Abrir em Gastos
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
  despesasFixas,
  despesasFolha,
  despesasVariaveis,
  tiposCustosFixos,
  tiposCustosVariaveis,
  totalDespFixas,
  totalDespFolha,
  totalDespVariaveis,
  totalProjetadoAnual,
  topAcessorios,
  topAdicionais,
  estoqueResumo,
  lucroLiquidoFinal,
  percBrutoFinal,
  percLiquidFinal,
  formatCurrency,
  vendasListagem,
}: {
  mesNome: string;
  faturamento: FaturamentoProduto;
  lucro: FaturamentoProduto;
  despesasFixas: DespesaAgrupada[];
  despesasFolha: DespesaAgrupada[];
  despesasVariaveis: DespesaAgrupada[];
  tiposCustosFixos: TipoCustoVariavel[];
  tiposCustosVariaveis: TipoCustoVariavel[];
  totalDespFixas: number;
  totalDespFolha: number;
  totalDespVariaveis: number;
  totalProjetadoAnual: number;
  topAcessorios: { nome: string; qtd: number }[];
  topAdicionais: { nome: string; qtd: number }[];
  estoqueResumo: { valorTotal: number; totalItens: number };
  lucroLiquidoFinal: number;
  percBrutoFinal: number;
  percLiquidFinal: number;
  formatCurrency: (v: number) => string;
  vendasListagem: { id: string; data: string; cliente: string; valorTabela: number; valorVenda: number; desconto: number; lucro: number }[];
}) {
  const SECTION: React.CSSProperties = { marginTop: 18, pageBreakInside: 'avoid' };
  const H2: React.CSSProperties = {
    fontSize: '11pt',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: '#ffffff',
    background: '#1e3a8a',
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

  const kpiBox = (label: string, value: string, color = '#0f172a', accent = '#1e3a8a'): React.CSSProperties => ({});

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
          <div style={{ fontSize: '11pt', color: '#1e3a8a', fontWeight: 600, marginTop: 2, textTransform: 'capitalize' }}>
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
          { label: 'Faturamento Bruto', value: formatCurrency(faturamento.total), color: '#0f172a', accent: '#1e3a8a' },
          { label: 'Lucro Bruto', value: formatCurrency(lucro.total), color: positive(lucro.total), accent: '#1e3a8a' },
          { label: 'Margem Bruta', value: `${percBrutoFinal.toFixed(1)}%`, color: positive(percBrutoFinal), accent: '#1e3a8a' },
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
              <th style={{ ...TH, textAlign: 'right' }}>Lucro</th>
              <th style={{ ...TH, textAlign: 'right' }}>Margem %</th>
            </tr>
          </thead>
          <tbody>
            {[
              { key: 'portas', label: 'Portas' },
              { key: 'pintura', label: 'Pintura' },
              { key: 'instalacoes', label: 'Instalações' },
              { key: 'acessorios', label: 'Acessórios' },
              { key: 'adicionais', label: 'Itens Avulso' },
            ].map((c, i) => {
              const f = faturamento[c.key as keyof FaturamentoProduto];
              const l = lucro[c.key as keyof FaturamentoProduto];
              const m = f > 0 ? (l / f) * 100 : 0;
              return (
                <tr key={c.key} style={trZebra(i)}>
                  <td style={{ ...TD, fontWeight: 600 }}>{c.label}</td>
                  <td style={tdRight}>{formatCurrency(f)}</td>
                  <td style={{ ...tdRight, color: positive(l), fontWeight: 600 }}>{formatCurrency(l)}</td>
                  <td style={{ ...tdRight, color: positive(m), fontWeight: 600 }}>{m.toFixed(1)}%</td>
                </tr>
              );
            })}
            <tr style={{ background: '#1e3a8a', color: '#fff' }}>
              <td style={{ ...TD, fontWeight: 800, color: '#fff', borderBottom: 'none' }}>TOTAL</td>
              <td style={{ ...tdRight, fontWeight: 800, color: '#fff', borderBottom: 'none' }}>
                {formatCurrency(faturamento.total)}
              </td>
              <td style={{ ...tdRight, fontWeight: 800, color: '#fff', borderBottom: 'none' }}>
                {formatCurrency(lucro.total)}
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
        <table>
          <tbody>
            {[
              { l: 'Faturamento Bruto', v: formatCurrency(faturamento.total), c: '#0f172a', b: false },
              { l: 'Margem Bruta', v: `${percBrutoFinal.toFixed(1)}%`, c: positive(percBrutoFinal), b: false },
              { l: 'Lucro Bruto', v: formatCurrency(lucro.total), c: positive(lucro.total), b: true },
              { l: '(–) Folha Salarial', v: formatCurrency(totalDespFolha), c: '#b91c1c', b: false },
              { l: '(–) Despesas Fixas', v: formatCurrency(totalDespFixas), c: '#b91c1c', b: false },
              { l: '(–) Despesas Variáveis', v: formatCurrency(totalDespVariaveis), c: '#b91c1c', b: false },
            ].map((r, i) => (
              <tr key={i} style={trZebra(i)}>
                <td style={{ ...TD, fontWeight: r.b ? 700 : 500 }}>{r.l}</td>
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

      {/* DESPESAS — nova página */}
      <div className="pdf-page-break" />

      <div style={{ marginTop: 0 }}>
        <div style={H2}>3. Folha Salarial</div>
        <PrintDespesaTable
          items={despesasFolha}
          total={totalDespFolha}
          formatCurrency={formatCurrency}
          tiposDisponiveis={tiposCustosFixos.filter(t => isFolha(t.nome))}
        />
      </div>

      <div style={SECTION}>
        <div style={H2}>4. Despesas Fixas</div>
        <PrintDespesaTable
          items={despesasFixas}
          total={totalDespFixas}
          formatCurrency={formatCurrency}
          tiposDisponiveis={tiposCustosFixos.filter(t => !isFolha(t.nome))}
        />
      </div>

      <div style={SECTION}>
        <div style={H2}>5. Despesas Variáveis</div>
        <PrintDespesaTable
          items={despesasVariaveis}
          total={totalDespVariaveis}
          formatCurrency={formatCurrency}
          tiposDisponiveis={tiposCustosVariaveis}
        />
      </div>

      {/* ESTOQUE */}
      <div style={SECTION}>
        <div style={H2}>6. Estoque</div>
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
      </div>

      {/* RODAPÉ */}
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

      {/* VENDAS DO MÊS — nova página */}
      {vendasListagem.length > 0 && (
        <>
          <div className="pdf-page-break" />
          <div style={{ marginTop: 0 }}>
            <div style={H2}>7. Vendas do Mês</div>
            <table>
              <thead style={{ display: 'table-header-group' }}>
                <tr>
                  <th style={{ ...TH, width: 55 }}>Data</th>
                  <th style={TH}>Cliente</th>
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
                    <tr style={{ background: '#1e3a8a', color: '#fff' }}>
                      <td style={{ ...TD, fontWeight: 800, color: '#fff', borderBottom: 'none' }} colSpan={2}>TOTAL</td>
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
        </>
      )}
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
        <tbody key={d.id} style={{ pageBreakInside: 'avoid' }}>
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
        <tr style={{ background: '#1e3a8a', color: '#fff' }}>
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

export default function DREMesDirecao() {
  const { mes } = useParams<{ mes: string }>();
  const [loading, setLoading] = useState(true);
  const [faturamento, setFaturamento] = useState<FaturamentoProduto>({ portas: 0, pintura: 0, instalacoes: 0, acessorios: 0, adicionais: 0, total: 0 });
  const [lucro, setLucro] = useState<FaturamentoProduto>({ portas: 0, pintura: 0, instalacoes: 0, acessorios: 0, adicionais: 0, total: 0 });
  const [despesasFixas, setDespesasFixas] = useState<DespesaAgrupada[]>([]);
  const [despesasFolha, setDespesasFolha] = useState<DespesaAgrupada[]>([]);
  const [despesasVariaveis, setDespesasVariaveis] = useState<DespesaAgrupada[]>([]);
  const [tipoModal, setTipoModal] = useState<{ id: string; nome: string } | null>(null);
  const [tiposCustosFixos, setTiposCustosFixos] = useState<TipoCustoVariavel[]>([]);
  const [tiposCustosVariaveis, setTiposCustosVariaveis] = useState<TipoCustoVariavel[]>([]);
  const [topAcessorios, setTopAcessorios] = useState<{nome: string, qtd: number}[]>([]);
  const [topAdicionais, setTopAdicionais] = useState<{nome: string, qtd: number}[]>([]);
  const [estoqueResumo, setEstoqueResumo] = useState({ valorTotal: 0, totalItens: 0 });
  const [vendasListagem, setVendasListagem] = useState<{ id: string; data: string; cliente: string; valorTabela: number; valorVenda: number; desconto: number; lucro: number }[]>([]);
  const [portasModalOpen, setPortasModalOpen] = useState(false);
  const [portasDetalhe, setPortasDetalhe] = useState<VendaComPortasRow[]>([]);
  const [pinturaModalOpen, setPinturaModalOpen] = useState(false);
  const [pinturaDetalhe, setPinturaDetalhe] = useState<VendaComItensSimplesRow[]>([]);
  const [acessoriosModalOpen, setAcessoriosModalOpen] = useState(false);
  const [acessoriosDetalhe, setAcessoriosDetalhe] = useState<VendaComItensSimplesRow[]>([]);
  const [avulsosModalOpen, setAvulsosModalOpen] = useState(false);
  const [avulsosDetalhe, setAvulsosDetalhe] = useState<VendaComItensSimplesRow[]>([]);

  const mesDate = mes ? new Date(mes + '-15') : new Date();
  const mesNome = format(mesDate, 'MMMM yyyy', { locale: ptBR });

  const fetchDespesasFromGastos = async () => {
    if (!mes) return;
    const start = `${mes}-01`;
    const [y, m] = mes.split('-').map(Number);
    const end = new Date(y, m, 0).toISOString().split('T')[0];

    // Fetch gastos do mês
    const { data: gastos, error } = await supabase
      .from('gastos' as any)
      .select('id, valor, tipo_custo_id, descricao, data')
      .gte('data', start)
      .lte('data', end);

    if (error) {
      console.error('Erro ao buscar gastos:', error);
      return;
    }

    // Fetch tipos_custos que aparecem no DRE
    const { data: tipos, error: tiposError } = await supabase
      .from('tipos_custos' as any)
      .select('id, nome, tipo, aparece_no_dre')
      .eq('aparece_no_dre', true);

    if (tiposError) {
      console.error('Erro ao buscar tipos custos:', tiposError);
      return;
    }

    const tiposMap: Record<string, { nome: string; tipo: string }> = {};
    ((tipos || []) as any[]).forEach((t: any) => {
      tiposMap[t.id] = { nome: t.nome, tipo: t.tipo };
    });

    // Agrupar gastos por tipo_custo_id
    const agrupado: Record<string, { nome: string; tipo: string; valor: number; gastos: { id: string; descricao: string | null; data: string; valor: number }[] }> = {};
    ((gastos || []) as any[]).forEach((g: any) => {
      const tipo = tiposMap[g.tipo_custo_id];
      if (!tipo) return;
      if (!agrupado[g.tipo_custo_id]) {
        agrupado[g.tipo_custo_id] = { nome: tipo.nome, tipo: tipo.tipo, valor: 0, gastos: [] };
      }
      agrupado[g.tipo_custo_id].valor += g.valor || 0;
      agrupado[g.tipo_custo_id].gastos.push({
        id: g.id,
        descricao: g.descricao ?? null,
        data: g.data,
        valor: Number(g.valor) || 0,
      });
    });

    const items = Object.entries(agrupado).map(([id, v]) => ({
      id,
      nome: v.nome,
      valor_real: v.valor,
      tipo: v.tipo,
      gastos: v.gastos.slice().sort((a, b) => a.data.localeCompare(b.data)),
    }));

    setDespesasFixas(items.filter(i => i.tipo === 'fixa' && !isFolha(i.nome)));
    setDespesasVariaveis(items.filter(i => i.tipo === 'variavel' && !isFolha(i.nome)));

    // Folha salarial agora vem da tabela custos_folha_mensais
    const { data: folhaItens, error: folhaErr } = await supabase
      .from('custos_folha_mensais' as any)
      .select('id, colaborador_nome, valor')
      .eq('mes_referencia', start);

    if (folhaErr) {
      console.error('Erro ao buscar custos de folha:', folhaErr);
      setDespesasFolha([]);
    } else {
      setDespesasFolha(
        ((folhaItens || []) as any[]).map((f) => ({
          id: f.id,
          nome: f.colaborador_nome,
          valor_real: Number(f.valor) || 0,
          tipo: 'fixa',
        }))
      );
    }
  };

  const fetchTiposCustosAtivos = async () => {
    const { data, error } = await supabase
      .from('tipos_custos' as any)
      .select('id, nome, valor_maximo_mensal, tipo')
      .eq('ativo', true)
      .order('nome');

    if (error) {
      console.error('Erro ao buscar tipos custos:', error);
      return;
    }
    const all = (data || []) as unknown as (TipoCustoVariavel & { tipo: string })[];
    setTiposCustosFixos(all.filter(t => t.tipo === 'fixa'));
    setTiposCustosVariaveis(all.filter(t => t.tipo === 'variavel'));
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
            vendas!inner(data_venda)
          `)
          .gte('vendas.data_venda', start + ' 00:00:00')
          .lte('vendas.data_venda', end + ' 23:59:59');

        if (prodError) throw prodError;

        const fat: FaturamentoProduto = { portas: 0, pintura: 0, instalacoes: 0, acessorios: 0, adicionais: 0, total: 0 };
        const luc: FaturamentoProduto = { portas: 0, pintura: 0, instalacoes: 0, acessorios: 0, adicionais: 0, total: 0 };

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
            // Distribui lucro_item proporcionalmente entre porta/pintura/instalação
            // (vendas legadas trazem porta+pintura+instalação embutidas na mesma linha)
            const lucroLinha = p.lucro_item || 0;
            luc.portas += lucroLinha * proporcaoProduto;
            luc.pintura += lucroLinha * proporcaoPintura;
            luc.instalacoes += lucroLinha * proporcaoInstalacao;
          } else if (tipo === 'pintura_epoxi') {
            fat.pintura += valorTotal;
            luc.pintura += p.lucro_item || 0;
          } else if (tipo === 'acessorio') {
            fat.acessorios += valorTotal;
            luc.acessorios += p.lucro_item || 0;
          } else if (['adicional', 'manutencao'].includes(tipo)) {
            fat.adicionais += valorTotal;
            luc.adicionais += p.lucro_item || 0;
          } else if (tipo === 'instalacao') {
            fat.instalacoes += valorTotal;
            luc.instalacoes += p.lucro_item || 0;
          }
        });

        const { data: vendas } = await supabase
          .from('vendas')
          .select('valor_credito, lucro_instalacao, valor_instalacao')
          .gte('data_venda', start + ' 00:00:00')
          .lte('data_venda', end + ' 23:59:59');

        const totalCredito = vendas?.reduce((sum, v) => sum + ((v as any).valor_credito || 0), 0) || 0;

        fat.total = fat.portas + fat.pintura + fat.instalacoes + fat.acessorios + fat.adicionais + totalCredito;
        luc.total = luc.portas + luc.pintura + luc.instalacoes + luc.acessorios + luc.adicionais;

        setFaturamento(fat);
        setLucro(luc);

        // Top 5 acessórios e adicionais
        const acessoriosMap: Record<string, number> = {};
        const adicionaisMap: Record<string, number> = {};
        produtos?.forEach((p: any) => {
          const nome = p.descricao || 'Sem descrição';
          const qtd = p.quantidade || 1;
          if (p.tipo_produto === 'acessorio') {
            acessoriosMap[nome] = (acessoriosMap[nome] || 0) + qtd;
          } else if (['adicional', 'manutencao'].includes(p.tipo_produto)) {
            adicionaisMap[nome] = (adicionaisMap[nome] || 0) + qtd;
          }
        });
        setTopAcessorios(
          Object.entries(acessoriosMap)
            .map(([nome, qtd]) => ({ nome, qtd }))
            .sort((a, b) => b.qtd - a.qtd)
            .slice(0, 5)
        );
        setTopAdicionais(
          Object.entries(adicionaisMap)
            .map(([nome, qtd]) => ({ nome, qtd }))
            .sort((a, b) => b.qtd - a.qtd)
            .slice(0, 5)
        );

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
          .select('id, data_venda, cliente_nome, valor_venda, valor_frete, lucro_total, lucro_instalacao, produtos_vendas(valor_produto, valor_pintura, valor_instalacao, quantidade)')
          .gte('data_venda', start + ' 00:00:00')
          .lte('data_venda', end + ' 23:59:59')
          .order('data_venda', { ascending: true });

        setVendasListagem(
          ((vendasList || []) as any[]).map((v) => {
            const valorTabela = (v.produtos_vendas || []).reduce(
              (s: number, p: any) =>
                s + ((p.valor_produto || 0) + (p.valor_pintura || 0) + (p.valor_instalacao || 0)) * (p.quantidade || 1),
              0
            );
            const valorVenda = (v.valor_venda || 0) - (v.valor_frete || 0);
            return {
              id: v.id,
              data: v.data_venda,
              cliente: v.cliente_nome || '',
              valorTabela,
              valorVenda,
              desconto: valorTabela - valorVenda,
              lucro: (v.lucro_total || 0) + (v.lucro_instalacao || 0),
            };
          })
        );

        // Detalhe das vendas com porta_enrolar (modal "Portas")
        const { data: portasRaw } = await supabase
          .from('produtos_vendas')
          .select(`
            id, descricao, quantidade,
            valor_produto, valor_pintura, valor_instalacao,
            tipo_desconto, desconto_percentual, desconto_valor,
            lucro_item,
            vendas!inner(id, data_venda, cliente_nome, valor_venda, valor_frete)
          `)
          .eq('tipo_produto', 'porta_enrolar')
          .gte('vendas.data_venda', start + ' 00:00:00')
          .lte('vendas.data_venda', end + ' 23:59:59');

        const porVenda = new Map<string, VendaComPortasRow>();
        ((portasRaw || []) as any[]).forEach((p) => {
          const v = p.vendas;
          if (!v) return;
          const qty = p.quantidade || 1;
          const valorPortaBruto = (p.valor_produto || 0) * qty;
          const valorPinturaBruto = (p.valor_pintura || 0) * qty;
          const valorInstBruto = (p.valor_instalacao || 0) * qty;
          const bruto = valorPortaBruto + valorPinturaBruto + valorInstBruto;
          let desc = 0;
          if (p.tipo_desconto === 'percentual' && p.desconto_percentual > 0) {
            desc = bruto * (p.desconto_percentual / 100);
          } else if (p.tipo_desconto === 'valor' && p.desconto_valor > 0) {
            desc = p.desconto_valor;
          }
          const valorLiquido = bruto - desc;
          const existing = porVenda.get(v.id) || {
            vendaId: v.id,
            dataVenda: v.data_venda,
            clienteNome: v.cliente_nome || '',
            valorVenda: (v.valor_venda || 0) - (v.valor_frete || 0),
            itens: [],
          };
          existing.itens.push({
            id: p.id,
            descricao: p.descricao || 'Sem descrição',
            quantidade: qty,
            valorPortaBruto,
            valorPinturaBruto,
            valorInstalacaoBruto: valorInstBruto,
            descontoLinha: desc,
            valorLiquido,
            lucro: p.lucro_item || 0,
          });
          porVenda.set(v.id, existing);
        });
        setPortasDetalhe(
          Array.from(porVenda.values()).sort((a, b) => a.dataVenda.localeCompare(b.dataVenda))
        );

        // ============ Detalhes Pintura / Acessórios / Itens Avulso ============
        const { data: detalhesRaw } = await supabase
          .from('produtos_vendas')
          .select(`
            id, descricao, quantidade, tipo_produto,
            valor_produto, valor_pintura, valor_instalacao,
            tipo_desconto, desconto_percentual, desconto_valor,
            lucro_item, lucro_pintura,
            vendas!inner(id, data_venda, cliente_nome, valor_venda, valor_frete)
          `)
          .in('tipo_produto', ['pintura_epoxi', 'acessorio', 'adicional', 'manutencao', 'porta_enrolar', 'porta_social'])
          .gte('vendas.data_venda', start + ' 00:00:00')
          .lte('vendas.data_venda', end + ' 23:59:59');

        const buildMap = (
          rows: any[],
          mapper: (p: any, v: any) => VendaComItensSimplesRow['itens'][number] | null,
        ) => {
          const map = new Map<string, VendaComItensSimplesRow>();
          rows.forEach((p) => {
            const v = p.vendas;
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

        // ---- Pintura: pintura_epoxi + componente pintura de portas ----
        setPinturaDetalhe(
          buildMap(todosRows, (p) => {
            const qty = p.quantidade || 1;
            if (p.tipo_produto === 'pintura_epoxi') {
              const bruto = (p.valor_produto || 0) * qty;
              let desc = 0;
              if (p.tipo_desconto === 'percentual' && p.desconto_percentual > 0) {
                desc = bruto * (p.desconto_percentual / 100);
              } else if (p.tipo_desconto === 'valor' && p.desconto_valor > 0) {
                desc = p.desconto_valor;
              }
              return {
                id: p.id,
                descricao: p.descricao || 'Pintura Epóxi',
                quantidade: qty,
                valorUnitario: p.valor_produto || 0,
                valorBruto: bruto,
                descontoLinha: desc,
                valorLiquido: bruto - desc,
                lucro: p.lucro_item || 0,
              };
            }
            // Pintura embutida em porta_enrolar / porta_social
            if (['porta_enrolar', 'porta_social'].includes(p.tipo_produto) && (p.valor_pintura || 0) > 0) {
              const valorProdutoBase = (p.valor_produto || 0) * qty;
              const valorPinturaBase = (p.valor_pintura || 0) * qty;
              const valorInstBase = (p.valor_instalacao || 0) * qty;
              const bruto = valorProdutoBase + valorPinturaBase + valorInstBase;
              let descTotal = 0;
              if (p.tipo_desconto === 'percentual' && p.desconto_percentual > 0) {
                descTotal = bruto * (p.desconto_percentual / 100);
              } else if (p.tipo_desconto === 'valor' && p.desconto_valor > 0) {
                descTotal = p.desconto_valor;
              }
              const propPintura = bruto > 0 ? valorPinturaBase / bruto : 0;
              const descPintura = descTotal * propPintura;
              const lucroLinha = p.lucro_item || 0;
              return {
                id: p.id + '-pintura',
                descricao: `${p.descricao || 'Porta'} — pintura`,
                quantidade: qty,
                valorUnitario: p.valor_pintura || 0,
                valorBruto: valorPinturaBase,
                descontoLinha: descPintura,
                valorLiquido: valorPinturaBase - descPintura,
                lucro: lucroLinha * propPintura,
              };
            }
            return null;
          }),
        );

        // ---- Acessórios ----
        setAcessoriosDetalhe(
          buildMap(todosRows, (p) => {
            if (p.tipo_produto !== 'acessorio') return null;
            const qty = p.quantidade || 1;
            const bruto = (p.valor_produto || 0) * qty;
            let desc = 0;
            if (p.tipo_desconto === 'percentual' && p.desconto_percentual > 0) {
              desc = bruto * (p.desconto_percentual / 100);
            } else if (p.tipo_desconto === 'valor' && p.desconto_valor > 0) {
              desc = p.desconto_valor;
            }
            return {
              id: p.id,
              descricao: p.descricao || 'Acessório',
              quantidade: qty,
              valorUnitario: p.valor_produto || 0,
              valorBruto: bruto,
              descontoLinha: desc,
              valorLiquido: bruto - desc,
              lucro: p.lucro_item || 0,
            };
          }),
        );

        // ---- Itens Avulso (adicional + manutencao) ----
        setAvulsosDetalhe(
          buildMap(todosRows, (p) => {
            if (!['adicional', 'manutencao'].includes(p.tipo_produto)) return null;
            const qty = p.quantidade || 1;
            const bruto = (p.valor_produto || 0) * qty;
            let desc = 0;
            if (p.tipo_desconto === 'percentual' && p.desconto_percentual > 0) {
              desc = bruto * (p.desconto_percentual / 100);
            } else if (p.tipo_desconto === 'valor' && p.desconto_valor > 0) {
              desc = p.desconto_valor;
            }
            return {
              id: p.id,
              descricao: p.descricao || 'Item avulso',
              quantidade: qty,
              valorUnitario: p.valor_produto || 0,
              valorBruto: bruto,
              descontoLinha: desc,
              valorLiquido: bruto - desc,
              lucro: p.lucro_item || 0,
            };
          }),
        );
      } catch (err) {
        console.error('Erro ao buscar dados DRE:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [mes]);

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const columns = [
    { key: 'portas', label: 'Portas' },
    { key: 'pintura', label: 'Pintura' },
    { key: 'instalacoes', label: 'Instalações' },
    { key: 'acessorios', label: 'Acessórios' },
    { key: 'adicionais', label: 'Itens Avulso' },
    { key: 'total', label: 'Total' },
  ] as const;

  const totalDespFixas = despesasFixas.reduce((acc, d) => acc + (d.valor_real || 0), 0);
  const totalDespFolha = despesasFolha.reduce((acc, d) => acc + (d.valor_real || 0), 0);
  const totalDespVariaveis = despesasVariaveis.reduce((acc, d) => acc + (d.valor_real || 0), 0);
  const totalProjetadoAnual = tiposCustosVariaveis.reduce((acc, t) => acc + (t.valor_maximo_mensal * 12), 0);

  const lucroLiquidoFinal = lucro.total - totalDespFixas - totalDespFolha - totalDespVariaveis;
  const percBrutoFinal = faturamento.total > 0 ? (lucro.total / faturamento.total) * 100 : 0;
  const percLiquidFinal = faturamento.total > 0 ? (lucroLiquidoFinal / faturamento.total) * 100 : 0;

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
          position: absolute !important;
          left: 0; top: 0;
          width: 100%;
          padding: 14mm 12mm !important;
          background: white !important;
          color: #0f172a !important;
          font-family: 'Helvetica Neue', Arial, sans-serif;
          font-size: 10pt;
          line-height: 1.4;
        }
        #dre-print-document .pdf-page-break { page-break-before: always; }
        #dre-print-document .pdf-avoid-break { page-break-inside: avoid; }
        #dre-print-document table { border-collapse: collapse; width: 100%; }
      }
      #dre-print-document { display: none; }
    `}</style>

    {/* ============ DOCUMENTO DE IMPRESSÃO (oculto na tela) ============ */}
    <div id="dre-print-document">
      <PrintReport
        mesNome={mesNome}
        faturamento={faturamento}
        lucro={lucro}
        despesasFixas={despesasFixas}
        despesasFolha={despesasFolha}
        despesasVariaveis={despesasVariaveis}
        tiposCustosVariaveis={tiposCustosVariaveis}
        tiposCustosFixos={tiposCustosFixos}
        totalDespFixas={totalDespFixas}
        totalDespFolha={totalDespFolha}
        totalDespVariaveis={totalDespVariaveis}
        totalProjetadoAnual={totalProjetadoAnual}
        topAcessorios={topAcessorios}
        topAdicionais={topAdicionais}
        estoqueResumo={estoqueResumo}
        lucroLiquidoFinal={lucroLiquidoFinal}
        percBrutoFinal={percBrutoFinal}
        percLiquidFinal={percLiquidFinal}
        formatCurrency={formatCurrency}
        vendasListagem={vendasListagem}
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
      backPath="/direcao/dre"
      breadcrumbItems={[
        { label: 'Home', path: '/home' },
        { label: 'Direção', path: '/direcao' },
        { label: 'DRE', path: '/direcao/dre' },
        { label: mesNome },
      ]}
      headerActions={
        !loading ? (
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
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 border border-white/10 text-white text-sm hover:bg-white/20 transition-colors print:hidden"
          >
            <Printer className="w-4 h-4" strokeWidth={1.5} />
            Imprimir PDF
          </button>
        ) : undefined
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-white/40" />
        </div>
      ) : (
        <div id="dre-screen-area" className="space-y-6">
          {/* Grid de Faturamento e Lucro */}
          <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-3 text-white/40 font-medium text-xs uppercase"></th>
                    {columns.map(col => {
                      const topList = col.key === 'acessorios' ? topAcessorios : col.key === 'adicionais' ? topAdicionais : null;
                      const isPortas = col.key === 'portas';
                      const isPintura = col.key === 'pintura';
                      const isAcessorios = col.key === 'acessorios';
                      const isAdicionais = col.key === 'adicionais';
                      const onClickHeader = isPortas
                        ? () => setPortasModalOpen(true)
                        : isPintura
                          ? () => setPinturaModalOpen(true)
                          : isAcessorios
                            ? () => setAcessoriosModalOpen(true)
                            : isAdicionais
                              ? () => setAvulsosModalOpen(true)
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
                  <tr>
                    <td className="p-3 text-white/60 font-medium text-xs uppercase">Lucro</td>
                    {columns.map(col => {
                      const val = lucro[col.key];
                      const isInstalacoes = col.key === 'instalacoes';
                      return (
                        <td
                          key={col.key}
                          className={`text-right p-3 font-semibold ${isInstalacoes ? 'text-yellow-400' : val >= 0 ? 'text-emerald-400' : 'text-red-400'} ${col.key === 'total' ? 'bg-white/5' : ''}`}
                        >
                          {formatCurrency(val)}
                        </td>
                      );
                    })}
                  </tr>
                  <tr className="border-t border-white/5">
                    <td className="p-3 text-white/60 font-medium text-xs uppercase">Margem %</td>
                    {columns.map(col => {
                      const perc = faturamento[col.key] > 0
                        ? (lucro[col.key] / faturamento[col.key]) * 100
                        : 0;
                      const isInstalacoes = col.key === 'instalacoes';
                      return (
                        <td key={col.key} className={`text-right p-3 ${col.key === 'total' ? 'bg-white/5' : ''}`}>
                          <span className={`inline-block rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold ${isInstalacoes ? 'text-yellow-400' : perc >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
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

          {/* Despesas: 3 seções + painel lateral */}
          <div className="grid grid-cols-1 lg:grid-cols-[3fr_1fr] gap-4">
            {/* Coluna esquerda: 3 seções empilhadas */}
            <div className="space-y-4">
              <DespesaSectionReadOnly
                title="Folha Salarial"
                despesas={despesasFolha}
                total={totalDespFolha}
                formatCurrency={formatCurrency}
                tiposDisponiveis={tiposCustosFixos.filter(t => isFolha(t.nome))}
              />
              <DespesaSectionReadOnly
                title="Despesas Fixas"
                despesas={despesasFixas}
                total={totalDespFixas}
                formatCurrency={formatCurrency}
                tiposDisponiveis={tiposCustosFixos.filter(t => !isFolha(t.nome))}
                onClickTipo={(id, nome) => setTipoModal({ id, nome })}
              />
              <DespesaSectionReadOnly
                title="Despesas Variáveis"
                despesas={despesasVariaveis}
                total={totalDespVariaveis}
                formatCurrency={formatCurrency}
                tiposDisponiveis={tiposCustosVariaveis}
                onClickTipo={(id, nome) => setTipoModal({ id, nome })}
              />
            </div>

            {/* Coluna direita: painel lateral */}
            <div className="rounded-xl bg-white/5 border border-white/10 p-4 h-fit lg:sticky lg:top-4">
              <h3 className="text-sm font-semibold text-white/70 uppercase mb-3">
                Despesas Projetadas do Ano
              </h3>
              {tiposCustosVariaveis.length === 0 ? (
                <p className="text-white/30 text-sm">Nenhum tipo de custo variável cadastrado</p>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between pb-1 border-b border-white/10">
                    <span className="text-xs text-white/40 uppercase flex-1">Nome</span>
                    <span className="text-xs text-white/40 uppercase w-24 text-right">Mês</span>
                    <span className="text-xs text-white/40 uppercase w-24 text-right">Anual</span>
                  </div>
                  {tiposCustosVariaveis.map(t => {
                    const despMes = despesasVariaveis.find(d => d.nome === t.nome);
                    const valorMes = despMes?.valor_real || 0;
                    return (
                      <div key={t.id} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                        <span className="text-sm text-white/60 flex-1">{t.nome}</span>
                        <span className="text-sm font-medium text-white/70 w-24 text-right">
                          {formatCurrency(valorMes)}
                        </span>
                        <span className="text-sm font-medium text-white w-24 text-right">
                          {formatCurrency(t.valor_maximo_mensal * 12)}
                        </span>
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <span className="text-sm font-semibold text-white/80 flex-1">Total</span>
                    <span className="text-sm font-bold text-white/70 w-24 text-right">
                      {formatCurrency(totalDespVariaveis)}
                    </span>
                    <span className="text-sm font-bold text-white w-24 text-right">
                      {formatCurrency(totalProjetadoAnual)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Valor de Estoque */}
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
          </div>

          {/* Resumo Final */}
          {(() => {
            const lucroLiquido = lucro.total - totalDespFixas - totalDespFolha - totalDespVariaveis;
            const percBruto = faturamento.total > 0 ? (lucro.total / faturamento.total) * 100 : 0;
            const percLiquid = faturamento.total > 0 ? (lucroLiquido / faturamento.total) * 100 : 0;
            const colorClass = (v: number) => v >= 0 ? 'text-emerald-400' : 'text-red-400';

            const items = [
              { label: 'Faturamento Bruto', value: formatCurrency(faturamento.total), color: 'text-white' },
              { label: '% Bruto', value: `${percBruto.toFixed(1)}%`, color: colorClass(percBruto) },
              { label: 'Fat. Líquido (Lucro Bruto)', value: formatCurrency(lucro.total), color: colorClass(lucro.total) },
              { label: 'Despesas Fixas', value: formatCurrency(totalDespFixas), color: 'text-red-400' },
              { label: 'Folha Salarial', value: formatCurrency(totalDespFolha), color: 'text-red-400' },
              { label: 'Desp. Variáveis', value: formatCurrency(totalDespVariaveis), color: 'text-red-400' },
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
      )}
    </MinimalistLayout>
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
    <ItensSimplesDetalheDialog
      open={pinturaModalOpen}
      onOpenChange={setPinturaModalOpen}
      titulo={`Vendas com Pintura — ${mesNome}`}
      categoriaLabel="Pintura"
      vendas={pinturaDetalhe}
      formatCurrency={formatCurrency}
    />
    <ItensSimplesDetalheDialog
      open={acessoriosModalOpen}
      onOpenChange={setAcessoriosModalOpen}
      titulo={`Vendas com Acessórios — ${mesNome}`}
      categoriaLabel="Acessórios"
      vendas={acessoriosDetalhe}
      formatCurrency={formatCurrency}
    />
    <ItensSimplesDetalheDialog
      open={avulsosModalOpen}
      onOpenChange={setAvulsosModalOpen}
      titulo={`Vendas com Itens Avulso — ${mesNome}`}
      categoriaLabel="Itens Avulso"
      vendas={avulsosDetalhe}
      formatCurrency={formatCurrency}
    />
    </>
  );
}

function PortasDetalheDialog({
  open,
  onOpenChange,
  mesNome,
  vendas,
  formatCurrency,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mesNome: string;
  vendas: VendaComPortasRow[];
  formatCurrency: (v: number) => string;
}) {
  const totals = vendas.reduce(
    (acc, v) => {
      v.itens.forEach((i) => {
        acc.porta += i.valorPortaBruto;
        acc.pintura += i.valorPinturaBruto;
        acc.instalacao += i.valorInstalacaoBruto;
        acc.desconto += i.descontoLinha;
        acc.liquido += i.valorLiquido;
        acc.lucro += i.lucro;
      });
      return acc;
    },
    { porta: 0, pintura: 0, instalacao: 0, desconto: 0, liquido: 0, lucro: 0 }
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-slate-900 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Vendas com Portas de Enrolar — {mesNome}</DialogTitle>
          <DialogDescription className="text-white/60">
            {vendas.length} venda{vendas.length === 1 ? '' : 's'} com itens do tipo Porta de Enrolar.
          </DialogDescription>
        </DialogHeader>

        {vendas.length === 0 ? (
          <p className="text-white/40 text-sm py-8 text-center">Nenhuma venda com portas de enrolar neste mês.</p>
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
                          <th className="text-right py-2 font-medium w-24">Porta</th>
                          <th className="text-right py-2 font-medium w-24">Pintura</th>
                          <th className="text-right py-2 font-medium w-24">Instalação</th>
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
                            <td className="py-2 text-right text-white/70">{formatCurrency(i.valorPortaBruto)}</td>
                            <td className="py-2 text-right text-white/70">{formatCurrency(i.valorPinturaBruto)}</td>
                            <td className="py-2 text-right text-white/70">{formatCurrency(i.valorInstalacaoBruto)}</td>
                            <td className="py-2 text-right text-red-400">{i.descontoLinha > 0 ? formatCurrency(i.descontoLinha) : '—'}</td>
                            <td className="py-2 text-right text-white font-medium">{formatCurrency(i.valorLiquido)}</td>
                            <td className={`py-2 text-right font-medium ${i.lucro >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrency(i.lucro)}</td>
                          </tr>
                        ))}
                        <tr className="border-t border-white/10">
                          <td colSpan={6} className="py-2 text-right text-white/60 uppercase text-[10px]">Subtotal desta venda</td>
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
              <div className="text-xs text-white/60 uppercase mb-2 font-semibold">Totais consolidados (Portas de Enrolar)</div>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
                <div><div className="text-[10px] text-white/40 uppercase">Porta</div><div className="font-semibold text-white">{formatCurrency(totals.porta)}</div></div>
                <div><div className="text-[10px] text-white/40 uppercase">Pintura</div><div className="font-semibold text-white">{formatCurrency(totals.pintura)}</div></div>
                <div><div className="text-[10px] text-white/40 uppercase">Instalação</div><div className="font-semibold text-white">{formatCurrency(totals.instalacao)}</div></div>
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
