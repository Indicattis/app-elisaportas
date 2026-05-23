import TabelaPrecos from '@/pages/TabelaPrecos';
import { CatalogoPrecosTab } from '@/components/tabela-precos/CatalogoPrecosTab';
import { MinimalistLayout } from '@/components/MinimalistLayout';
import { Button } from '@/components/ui/button';
import { FileText, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { useTabelaPrecos } from '@/hooks/useTabelaPrecos';
import { useVendasCatalogo } from '@/hooks/useVendasCatalogo';
import { exportEstrategiaPrecosPDF, exportEstrategiaPrecosExcel } from '@/utils/estrategiaPrecosExport';

export default function EstrategiaPrecos() {
  const { itens: kits } = useTabelaPrecos();
  const { produtos } = useVendasCatalogo();

  const handleExport = (kind: 'pdf' | 'excel') => {
    try {
      if ((!kits || kits.length === 0) && (!produtos || produtos.length === 0)) {
        toast.error('Nada para exportar');
        return;
      }
      if (kind === 'pdf') {
        exportEstrategiaPrecosPDF(kits || [], produtos || []);
        toast.success('PDF gerado');
      } else {
        exportEstrategiaPrecosExcel(kits || [], produtos || []);
        toast.success('Excel gerado');
      }
    } catch (e: any) {
      toast.error(`Falha ao gerar ${kind === 'pdf' ? 'PDF' : 'Excel'}: ${e?.message ?? e}`);
    }
  };

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
    >
      <div className="flex flex-wrap items-center justify-end gap-2 mb-4">
        <Button
          variant="outline"
          className="!h-[50px] gap-2 bg-card/60 border-border text-foreground hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/40"
          onClick={() => handleExport('pdf')}
        >
          <FileText className="h-4 w-4" />
          Exportar PDF
        </Button>
        <Button
          variant="outline"
          className="!h-[50px] gap-2 bg-card/60 border-border text-foreground hover:bg-emerald-500/10 hover:text-emerald-300 hover:border-emerald-500/40"
          onClick={() => handleExport('excel')}
        >
          <FileSpreadsheet className="h-4 w-4" />
          Exportar Excel
        </Button>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <TabelaPrecos
            embedded
            hideLucroColumn
            hideAcoesColumn
          />
        </div>
        <div className="xl:col-span-1">
          <CatalogoPrecosTab compact />
        </div>
      </div>
    </MinimalistLayout>
  );
}
