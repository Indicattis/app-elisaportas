import { useNavigate } from 'react-router-dom';
import TabelaPrecos from '@/pages/TabelaPrecos';
import { CatalogoPrecosTab } from '@/components/tabela-precos/CatalogoPrecosTab';
import { MinimalistLayout } from '@/components/MinimalistLayout';
import { Button } from '@/components/ui/button';
import { FileText, FileSpreadsheet, Menu, BookOpen } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { useTabelaPrecos } from '@/hooks/useTabelaPrecos';
import { useVendasCatalogo } from '@/hooks/useVendasCatalogo';
import { exportEstrategiaPrecosPDF, exportEstrategiaPrecosExcel } from '@/utils/estrategiaPrecosExport';

export default function EstrategiaPrecos() {
  const navigate = useNavigate();
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

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        className="!h-[50px] gap-2 bg-card/60 border-border text-foreground hover:bg-primary/10"
        onClick={() => navigate('/direcao/vendas/regras-vendas')}
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
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <TabelaPrecos embedded />
        </div>
        <div className="xl:col-span-1">
          <CatalogoPrecosTab compact />
        </div>
      </div>
    </MinimalistLayout>
  );
}
