import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useCategoriaDreConfig, type CategoriaDespesa } from '@/hooks/useCategoriaDreConfig';

const SECOES: { key: CategoriaDespesa; label: string }[] = [
  { key: 'folha', label: 'Folha Salarial' },
  { key: 'projetada', label: 'Despesa projetada' },
  { key: 'fixa', label: 'Fixas' },
  { key: 'variavel', label: 'Variáveis' },
  { key: 'autorizado', label: 'Autorizados' },
  { key: 'imposto', label: 'Impostos' },
  { key: 'investimento', label: 'Investimentos' },
  { key: 'fornecedor', label: 'Fornecedores' },
  { key: 'financiamento', label: 'Financiamentos' },
  { key: 'frete', label: 'Fretes e Logística' },
  { key: 'salario', label: 'Salários' },
];

export function TiposDreDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { debita, toggle, refetch } = useCategoriaDreConfig();

  const debitam = SECOES.filter((s) => debita(s.key)).length;
  const naoDebitam = SECOES.length - debitam;

  const handleOpenChange = (v: boolean) => {
    if (!v) void refetch();
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl bg-slate-950/90 backdrop-blur-xl border border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Tipos de despesa no DRE</DialogTitle>
          <DialogDescription className="text-white/50">
            Define quais seções são subtraídas do lucro líquido no DRE. A configuração é global e vale para todos os meses.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-emerald-500/10 border border-emerald-400/30 text-emerald-200 text-xs">
            ● {debitam} debitam
          </span>
          <span className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-200 text-xs">
            ○ {naoDebitam} não debitam
          </span>
        </div>

        <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1">
          {SECOES.map((s) => {
            const on = debita(s.key);
            return (
              <div
                key={s.key}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10"
              >
                <span className="text-sm text-white flex-1">{s.label}</span>
                <span
                  className={`hidden sm:inline-flex items-center h-7 px-3 rounded-full border text-xs ${
                    on
                      ? 'bg-emerald-500/10 border-emerald-400/30 text-emerald-200'
                      : 'bg-amber-500/10 border-amber-400/30 text-amber-200'
                  }`}
                >
                  {on ? '● Debita DRE' : '○ Não debita'}
                </span>
                <Switch
                  checked={on}
                  onCheckedChange={() => void toggle(s.key)}
                  className="data-[state=checked]:bg-emerald-500"
                />
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default TiposDreDialog;
