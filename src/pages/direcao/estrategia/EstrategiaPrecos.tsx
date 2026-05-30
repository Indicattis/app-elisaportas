import { useNavigate } from 'react-router-dom';
import TabelaPrecos from '@/pages/TabelaPrecos';
import { MinimalistLayout } from '@/components/MinimalistLayout';
import { Button } from '@/components/ui/button';
import { FileText, FileSpreadsheet, Menu, BookOpen } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { useTabelaPrecos } from '@/hooks/useTabelaPrecos';
import { useCustosItens } from '@/hooks/useCustosItens';
import { useMemo } from 'react';
import { exportEstrategiaPrecosPDF, exportEstrategiaPrecosExcel } from '@/utils/estrategiaPrecosExport';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { cn } from '@/lib/utils';

export default function EstrategiaPrecos() {
  const navigate = useNavigate();
  const { itens: kits } = useTabelaPrecos();
  const { items: custosItens } = useCustosItens();

  const itensAvulso = useMemo(
    () =>
      (custosItens ?? [])
        .filter((i) => i.vendavel_avulso)
        .sort((a, b) => {
          const ca = (a.categoria || 'Sem categoria').localeCompare(b.categoria || 'Sem categoria');
          if (ca !== 0) return ca;
          return (a.descricao || '').localeCompare(b.descricao || '');
        }),
    [custosItens],
  );

  const fmtBRL = (v: number | null | undefined) =>
    Number(v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleExport = (kind: 'pdf' | 'excel') => {
    try {
      if (!kits || kits.length === 0) {
        toast.error('Nada para exportar');
        return;
      }
      if (kind === 'pdf') {
        exportEstrategiaPrecosPDF(kits || []);
        toast.success('PDF gerado');
      } else {
        exportEstrategiaPrecosExcel(kits || []);
        toast.success('Excel gerado');
      }
    } catch (e: any) {
      toast.error(`Falha ao gerar ${kind === 'pdf' ? 'PDF' : 'Excel'}: ${e?.message ?? e}`);
    }
  };

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        className="!h-[50px] gap-2 bg-card/60 border-border text-foreground hover:bg-primary/10"
        onClick={() => navigate('/direcao/estrategia/precos/regras-vendas')}
      >
        <BookOpen className="h-4 w-4" />
        Regras de Vendas
      </Button>
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="!h-[50px] gap-2 bg-card/60 border-border text-foreground hover:bg-primary/10"
        >
          <Menu className="h-4 w-4" />
          Exportar
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-48 p-1">
        <button
          onClick={() => handleExport('pdf')}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-red-500/10 hover:text-red-300 transition-colors"
        >
          <FileText className="h-4 w-4" />
          Exportar PDF
        </button>
        <button
          onClick={() => handleExport('excel')}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-emerald-500/10 hover:text-emerald-300 transition-colors"
        >
          <FileSpreadsheet className="h-4 w-4" />
          Exportar Excel
        </button>
      </PopoverContent>
    </Popover>
    </div>
  );

  return (
    <MinimalistLayout
      title="Tabela de Preços"
      subtitle="Kits de portas e catálogo"
      backPath="/direcao/estrategia"
      breadcrumbItems={[
        { label: 'Home', path: '/home' },
        { label: 'Direção', path: '/direcao' },
        { label: 'Estratégia', path: '/direcao/estrategia' },
        { label: 'Tabela de Preços' },
      ]}
      fullWidth
      headerActions={headerActions}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
        <div className="min-w-0">
          <TabelaPrecos embedded />
        </div>
        <aside className="flex flex-col gap-4 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-8rem)] min-h-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-base font-medium text-white">Itens Avulso</h2>
              <p className="text-xs text-white/50">
                {itensAvulso.length} {itensAvulso.length === 1 ? 'item disponível' : 'itens disponíveis'}
              </p>
            </div>
          </div>
          {itensAvulso.length === 0 ? (
            <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 text-center py-8 px-4 text-xs text-white/50">
              Nenhum item marcado como avulso. Ative em Estratégia → Itens.
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto rounded-xl bg-white/5 backdrop-blur-xl border border-white/10">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-xs font-medium text-white/60">Nome</TableHead>
                    <TableHead className="text-xs font-medium text-white/60">Un.</TableHead>
                    <TableHead className="text-right text-xs font-medium text-emerald-400">Preço/un</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itensAvulso.map((it, index) => (
                    <TableRow
                      key={it.id}
                      className={cn('border-white/10 hover:bg-white/5', index % 2 === 1 && 'bg-white/[0.02]')}
                    >
                      <TableCell className="font-medium text-white">{it.descricao}</TableCell>
                      <TableCell className="text-white/70">{it.unidade || '-'}</TableCell>
                      <TableCell className="text-right font-semibold text-emerald-400">
                        {fmtBRL(it.preco_venda)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </aside>
      </div>
    </MinimalistLayout>
  );
}
