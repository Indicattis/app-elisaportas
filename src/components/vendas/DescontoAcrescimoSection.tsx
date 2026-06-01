import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Percent, Minus, Plus, X, Check, AlertCircle } from 'lucide-react';

export type AjusteGlobal = {
  tipo: 'desconto' | 'acrescimo';
  unidade: '%' | 'R$';
  valor: number;
};

interface Props {
  ajusteAplicado: AjusteGlobal;
  onAplicar: (a: AjusteGlobal) => void;
  onLimpar: () => void;
  valorBase: number;
  disabled?: boolean;
  disabledReason?: string;
}

const sectionWrapperClass = "p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10";
const labelClass = "text-xs font-semibold text-white/60 uppercase tracking-wider";

export function DescontoAcrescimoSection({ ajusteAplicado, onAplicar, onLimpar, valorBase, disabled, disabledReason }: Props) {
  const [rascunho, setRascunho] = useState<AjusteGlobal>(ajusteAplicado);

  // Sincroniza rascunho quando o aplicado muda externamente (ex.: limpar, autorização)
  useEffect(() => {
    setRascunho(ajusteAplicado);
  }, [ajusteAplicado]);

  const valorAjusteAbs = useMemo(() => {
    if (!rascunho.valor || rascunho.valor <= 0) return 0;
    if (rascunho.unidade === '%') return Math.max(0, valorBase) * (rascunho.valor / 100);
    return rascunho.valor;
  }, [rascunho, valorBase]);

  const sinalLabel = rascunho.tipo === 'desconto' ? '-' : '+';
  const corValor = rascunho.tipo === 'desconto' ? 'text-emerald-300' : 'text-amber-300';

  const isAplicado = ajusteAplicado.valor > 0;
  const hasPendingChange =
    rascunho.valor !== ajusteAplicado.valor ||
    rascunho.tipo !== ajusteAplicado.tipo ||
    rascunho.unidade !== ajusteAplicado.unidade;
  const podeAplicar = rascunho.valor > 0 && hasPendingChange && !disabled;

  return (
    <div className={sectionWrapperClass}>
      <div className="px-5 py-4 border-b border-white/10 bg-gradient-to-r from-white/5 to-transparent">
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/30">
              <Percent className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-sm font-semibold text-white tracking-wide">Desconto / Acréscimo</h3>
          </div>
          {isAplicado && (
            <button
              type="button"
              onClick={onLimpar}
              className="flex items-center gap-1 text-xs text-white/60 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Limpar
            </button>
          )}
        </div>
      </div>

      <div className="p-5 space-y-4">
        {disabled && (
          <div className="text-xs text-amber-300/80 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
            {disabledReason || 'Ajuste indisponível.'}
          </div>
        )}

        {isAplicado && (
          <div
            className={cn(
              "flex items-center justify-between gap-2 rounded-lg px-3 py-2 border",
              ajusteAplicado.tipo === 'desconto'
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-100"
                : "bg-amber-500/15 border-amber-500/30 text-amber-100"
            )}
          >
            <div className="flex items-center gap-2 text-xs">
              <Check className="w-3.5 h-3.5" />
              <span className="font-semibold uppercase tracking-wider">
                {ajusteAplicado.tipo === 'desconto' ? 'Desconto aplicado' : 'Acréscimo aplicado'}
              </span>
              <span className="opacity-80">
                {ajusteAplicado.valor}{ajusteAplicado.unidade === '%' ? '%' : ' R$'}
              </span>
            </div>
          </div>
        )}

        {hasPendingChange && rascunho.valor > 0 && (
          <div className="flex items-center gap-2 text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Alterações pendentes — clique em <strong>Aplicar</strong> para confirmar.</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-[auto,auto,1fr,auto] gap-3 items-end">
          {/* Tipo: Desconto / Acréscimo */}
          <div className="space-y-1">
            <span className={labelClass}>Tipo</span>
            <div className="flex rounded-lg overflow-hidden border border-white/10 bg-white/5">
              <button
                type="button"
                disabled={disabled}
                onClick={() => setRascunho(prev => ({ ...prev, tipo: 'desconto' }))}
                className={cn(
                  "flex items-center gap-1.5 px-3 h-10 text-sm font-medium transition-all",
                  rascunho.tipo === 'desconto'
                    ? "bg-gradient-to-r from-emerald-500/30 to-emerald-700/20 text-emerald-100"
                    : "text-white/70 hover:bg-white/10"
                )}
              >
                <Minus className="w-3.5 h-3.5" /> Desconto
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => setRascunho(prev => ({ ...prev, tipo: 'acrescimo' }))}
                className={cn(
                  "flex items-center gap-1.5 px-3 h-10 text-sm font-medium transition-all border-l border-white/10",
                  rascunho.tipo === 'acrescimo'
                    ? "bg-gradient-to-r from-amber-500/30 to-amber-700/20 text-amber-100"
                    : "text-white/70 hover:bg-white/10"
                )}
              >
                <Plus className="w-3.5 h-3.5" /> Acréscimo
              </button>
            </div>
          </div>

          {/* Unidade % / R$ */}
          <div className="space-y-1">
            <span className={labelClass}>Unidade</span>
            <div className="flex rounded-lg overflow-hidden border border-white/10 bg-white/5">
              <button
                type="button"
                disabled={disabled}
                onClick={() => setRascunho(prev => ({ ...prev, unidade: '%' }))}
                className={cn(
                  "px-3 h-10 text-sm font-medium transition-all",
                  rascunho.unidade === '%' ? "bg-blue-500/30 text-white" : "text-white/70 hover:bg-white/10"
                )}
              >
                %
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => setRascunho(prev => ({ ...prev, unidade: 'R$' }))}
                className={cn(
                  "px-3 h-10 text-sm font-medium transition-all border-l border-white/10",
                  rascunho.unidade === 'R$' ? "bg-blue-500/30 text-white" : "text-white/70 hover:bg-white/10"
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
              step={rascunho.unidade === '%' ? 0.1 : 0.01}
              value={rascunho.valor || ''}
              disabled={disabled}
              onChange={(e) => setRascunho(prev => ({ ...prev, valor: Math.max(0, parseFloat(e.target.value) || 0) }))}
              placeholder={rascunho.unidade === '%' ? '0,0' : '0,00'}
              className="h-10 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-lg focus:border-white/30 focus:ring-2 focus:ring-white/20"
            />
          </div>

          {/* Aplicar */}
          <div className="space-y-1">
            <span className={labelClass}>Ação</span>
            <button
              type="button"
              aria-label="Aplicar desconto ou acréscimo"
              disabled={!podeAplicar}
              onClick={() => onAplicar(rascunho)}
              className={cn(
                "h-10 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5",
                podeAplicar
                  ? "bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/30 hover:from-blue-400 hover:to-blue-600"
                  : "bg-white/10 text-white/40 cursor-not-allowed border border-white/10"
              )}
            >
              <Check className="w-4 h-4" /> Aplicar
            </button>
          </div>
        </div>

        {/* Impacto previsto do rascunho */}
        <div className="flex items-center justify-between border-t border-white/10 pt-2">
          <span className={labelClass}>Impacto previsto</span>
          <p className={cn("text-base font-bold", corValor)}>
            {sinalLabel} R$ {valorAjusteAbs.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}