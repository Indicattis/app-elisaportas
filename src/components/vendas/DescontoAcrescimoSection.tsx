import { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Percent, Minus, Plus, X } from 'lucide-react';

export type AjusteGlobal = {
  tipo: 'desconto' | 'acrescimo';
  unidade: '%' | 'R$';
  valor: number;
};

interface Props {
  ajuste: AjusteGlobal;
  onChange: (a: AjusteGlobal) => void;
  valorBase: number;
  disabled?: boolean;
  disabledReason?: string;
}

const sectionWrapperClass = "p-1.5 rounded-xl bg-gradient-to-br from-blue-500/5 to-blue-900/10 backdrop-blur-xl border border-blue-500/20";
const labelClass = "text-xs font-semibold text-blue-300/80 uppercase tracking-wider";

export function DescontoAcrescimoSection({ ajuste, onChange, valorBase, disabled, disabledReason }: Props) {
  const valorAjusteAbs = useMemo(() => {
    if (!ajuste.valor || ajuste.valor <= 0) return 0;
    if (ajuste.unidade === '%') return Math.max(0, valorBase) * (ajuste.valor / 100);
    return ajuste.valor;
  }, [ajuste, valorBase]);

  const sinalLabel = ajuste.tipo === 'desconto' ? '-' : '+';
  const corValor = ajuste.tipo === 'desconto' ? 'text-emerald-300' : 'text-amber-300';

  const isAtivo = ajuste.valor > 0;

  return (
    <div className={sectionWrapperClass}>
      <div className="px-4 py-3 border-b border-blue-500/10 bg-gradient-to-r from-blue-500/10 to-transparent">
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/30">
              <Percent className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-sm font-semibold text-blue-100 tracking-wide">Desconto / Acréscimo</h3>
          </div>
          {isAtivo && (
            <button
              type="button"
              onClick={() => onChange({ ...ajuste, valor: 0 })}
              className="flex items-center gap-1 text-xs text-blue-300/70 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Limpar
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {disabled && (
          <div className="text-xs text-amber-300/80 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
            {disabledReason || 'Ajuste indisponível.'}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-[auto,auto,1fr,auto] gap-3 items-end">
          {/* Tipo: Desconto / Acréscimo */}
          <div className="space-y-1">
            <span className={labelClass}>Tipo</span>
            <div className="flex rounded-lg overflow-hidden border border-blue-500/25 bg-blue-500/5">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange({ ...ajuste, tipo: 'desconto' })}
                className={cn(
                  "flex items-center gap-1.5 px-3 h-10 text-sm font-medium transition-all",
                  ajuste.tipo === 'desconto'
                    ? "bg-gradient-to-r from-emerald-500/30 to-emerald-700/20 text-emerald-100"
                    : "text-blue-200/70 hover:bg-blue-500/10"
                )}
              >
                <Minus className="w-3.5 h-3.5" /> Desconto
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange({ ...ajuste, tipo: 'acrescimo' })}
                className={cn(
                  "flex items-center gap-1.5 px-3 h-10 text-sm font-medium transition-all border-l border-blue-500/25",
                  ajuste.tipo === 'acrescimo'
                    ? "bg-gradient-to-r from-amber-500/30 to-amber-700/20 text-amber-100"
                    : "text-blue-200/70 hover:bg-blue-500/10"
                )}
              >
                <Plus className="w-3.5 h-3.5" /> Acréscimo
              </button>
            </div>
          </div>

          {/* Unidade % / R$ */}
          <div className="space-y-1">
            <span className={labelClass}>Unidade</span>
            <div className="flex rounded-lg overflow-hidden border border-blue-500/25 bg-blue-500/5">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange({ ...ajuste, unidade: '%' })}
                className={cn(
                  "px-3 h-10 text-sm font-medium transition-all",
                  ajuste.unidade === '%' ? "bg-blue-500/30 text-white" : "text-blue-200/70 hover:bg-blue-500/10"
                )}
              >
                %
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange({ ...ajuste, unidade: 'R$' })}
                className={cn(
                  "px-3 h-10 text-sm font-medium transition-all border-l border-blue-500/25",
                  ajuste.unidade === 'R$' ? "bg-blue-500/30 text-white" : "text-blue-200/70 hover:bg-blue-500/10"
                )}
              >
                R$
              </button>
            </div>
          </div>

          {/* Valor */}
          <div className="space-y-1">
            <span className={labelClass}>Valor</span>
            <Input
              type="number"
              min={0}
              step={ajuste.unidade === '%' ? 0.1 : 0.01}
              value={ajuste.valor || ''}
              disabled={disabled}
              onChange={(e) => onChange({ ...ajuste, valor: Math.max(0, parseFloat(e.target.value) || 0) })}
              placeholder={ajuste.unidade === '%' ? '0,0' : '0,00'}
              className="h-10 bg-blue-500/5 border-blue-500/20 text-white placeholder:text-blue-200/30 rounded-lg focus:border-blue-400 focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          {/* Resultado */}
          <div className="space-y-1 md:text-right">
            <span className={labelClass}>Impacto</span>
            <p className={cn("h-10 flex items-center md:justify-end text-base font-bold", corValor)}>
              {sinalLabel} R$ {valorAjusteAbs.toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}