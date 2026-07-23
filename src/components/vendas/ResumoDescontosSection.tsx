import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { formatCurrency } from '@/lib/utils';
import { CheckCircle2, AlertTriangle, Percent } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  precoTabelado: number;
  limitePermitidoPct: number;
  precoFinal: number;
  justificativa: string;
  onChangeJustificativa: (v: string) => void;
}

export function ResumoDescontosSection({
  precoTabelado,
  limitePermitidoPct,
  precoFinal,
  justificativa,
  onChangeJustificativa,
}: Props) {
  const precoLimite = precoTabelado * (1 - (limitePermitidoPct || 0) / 100);
  const descontoAplicadoPct = precoTabelado > 0
    ? Math.max(0, (precoTabelado - precoFinal) / precoTabelado) * 100
    : 0;
  const abaixoDoLimite = precoFinal + 0.01 < precoLimite;

  const labelClass = 'text-white/60 text-xs font-medium uppercase tracking-wider';

  return (
    <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-blue-500/15 border border-blue-400/20">
          <Percent className="w-5 h-5 text-blue-300" strokeWidth={1.5} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Resumo dos descontos</h3>
          <p className="text-xs text-white/50">Comparativo entre o preço de tabela, o limite autorizado e o preço final praticado.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <ValorCard
          label="Preço tabelado"
          value={precoTabelado}
          hint="Soma dos produtos sem descontos"
          tone="neutral"
        />
        <ValorCard
          label="Preço limite de descontos"
          value={precoLimite}
          hint={`Limite permitido: ${limitePermitidoPct.toFixed(1)}% de desconto`}
          tone="warning"
        />
        <ValorCard
          label="Preço final"
          value={precoFinal}
          hint={`Desconto aplicado: ${descontoAplicadoPct.toFixed(1)}%`}
          tone={abaixoDoLimite ? 'danger' : 'success'}
        />
      </div>

      <div
        className={cn(
          'flex items-center gap-3 rounded-lg border p-3',
          abaixoDoLimite
            ? 'bg-amber-500/10 border-amber-400/30 text-amber-200'
            : 'bg-emerald-500/10 border-emerald-400/30 text-emerald-200'
        )}
      >
        {abaixoDoLimite ? (
          <AlertTriangle className="w-4 h-4 shrink-0" />
        ) : (
          <CheckCircle2 className="w-4 h-4 shrink-0" />
        )}
        <p className="text-xs">
          {abaixoDoLimite
            ? 'O preço final está abaixo do limite permitido — descreva a justificativa abaixo.'
            : 'O preço final está dentro do limite permitido de descontos.'}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="justificativa-desconto" className={labelClass}>
          Justificativa {abaixoDoLimite && <span className="text-amber-300 normal-case">(recomendada)</span>}
        </Label>
        <Textarea
          id="justificativa-desconto"
          value={justificativa}
          onChange={(e) => onChangeJustificativa(e.target.value)}
          rows={3}
          placeholder="Explique o motivo do desconto concedido nesta venda..."
          className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-blue-400/40"
        />
      </div>
    </div>
  );
}

function ValorCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number;
  hint?: string;
  tone: 'neutral' | 'success' | 'warning' | 'danger';
}) {
  const toneClass =
    tone === 'success'
      ? 'text-emerald-300'
      : tone === 'warning'
      ? 'text-amber-300'
      : tone === 'danger'
      ? 'text-rose-300'
      : 'text-blue-300';
  return (
    <div className="rounded-lg bg-white/[0.03] border border-white/10 p-4 space-y-1">
      <p className="text-[11px] uppercase tracking-wider text-white/50 font-medium">{label}</p>
      <p className={cn('text-xl font-bold', toneClass)}>{formatCurrency(value || 0)}</p>
      {hint && <p className="text-[11px] text-white/40">{hint}</p>}
    </div>
  );
}