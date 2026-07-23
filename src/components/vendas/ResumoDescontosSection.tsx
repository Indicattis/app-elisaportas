import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';
import { CheckCircle2, AlertTriangle, Percent } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface Props {
  precoTabelado: number;
  limitePermitidoPct: number;
  precoFinal: number;
  justificativa: string;
  onChangeJustificativa: (v: string) => void;
  metodos?: Array<{ tipo: string; valor: number; parcelas?: number }>;
  temperatura?: boolean | null;
}

export function ResumoDescontosSection({
  precoTabelado,
  limitePermitidoPct,
  precoFinal,
  justificativa,
  onChangeJustificativa,
  metodos = [],
  temperatura = null,
}: Props) {
  const precoLimite = precoTabelado * (1 - (limitePermitidoPct || 0) / 100);

  // Valor manual de simulação — não altera o valor real da venda.
  const [simulado, setSimulado] = useState<string>(precoFinal.toFixed(2));
  useEffect(() => {
    setSimulado(precoFinal.toFixed(2));
  }, [precoFinal]);
  const valorSimulado = Number(String(simulado).replace(',', '.')) || 0;

  const abaixoDoLimite = valorSimulado + 0.01 < precoLimite;

  const labelClass = 'text-white/60 text-xs font-medium uppercase tracking-wider';

  return (
    <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-blue-500/15 border border-blue-400/20">
          <Percent className="w-5 h-5 text-blue-300" strokeWidth={1.5} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Resumo dos descontos</h3>
          <p className="text-xs text-white/50">Simule um preço final para comparar com o preço de tabela e o limite autorizado.</p>
        </div>
      </div>

      {(metodos.length > 0 || temperatura !== null) && (
        <div className="flex flex-wrap items-center gap-2">
          {temperatura !== null && (
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium',
                temperatura
                  ? 'bg-orange-500/10 border-orange-400/30 text-orange-200'
                  : 'bg-sky-500/10 border-sky-400/30 text-sky-200'
              )}
            >
              <span className="text-[10px] uppercase tracking-wider opacity-70">Temperatura</span>
              {temperatura ? 'Quente (presencial)' : 'Fria (online)'}
            </span>
          )}
          {metodos.filter(m => m?.tipo).map((m, i) => {
            const isParcelado = m.tipo === 'boleto' || m.tipo === 'cartao_credito';
            const qtdParcelas = Math.max(1, Number(m.parcelas) || 1);
            const mostrarParcelas = isParcelado;
            return (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/80"
              >
                <span className="text-[10px] uppercase tracking-wider text-white/50">Método {i + 1}</span>
                {m.tipo === 'boleto' ? 'boleto' : m.tipo === 'cartao_credito' ? 'cartão' : m.tipo}
                {mostrarParcelas && (
                  <span className="text-blue-200">· {qtdParcelas}x</span>
                )}
                {m.valor > 0 && (
                  <span className="text-white/50">· {formatCurrency(m.valor)}</span>
                )}
              </span>
            );
          })}
        </div>
      )}

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
        <div className={cn(
          'rounded-lg bg-white/[0.03] border p-4 space-y-2',
          abaixoDoLimite ? 'border-rose-400/30' : 'border-emerald-400/30'
        )}>
          <p className="text-[11px] uppercase tracking-wider text-white/50 font-medium">
            Preço final (simulação)
          </p>
          <div className="flex items-center gap-1">
            <span className={cn(
              'text-sm font-semibold',
              abaixoDoLimite ? 'text-rose-300' : 'text-emerald-300'
            )}>R$</span>
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={simulado}
              onChange={(e) => setSimulado(e.target.value)}
              className={cn(
                'h-9 bg-white/5 border-white/10 text-lg font-bold px-2',
                abaixoDoLimite ? 'text-rose-300' : 'text-emerald-300'
              )}
            />
          </div>
          <p className="text-[11px] text-white/40">
            {abaixoDoLimite ? (
              <span className="text-rose-300">
                Excedente ao limite: {formatCurrency(Math.max(0, precoLimite - valorSimulado))}
                {precoTabelado > 0 && (
                  <span className="ml-1 text-white/40">
                    ({((Math.max(0, precoLimite - valorSimulado) / precoTabelado) * 100).toFixed(1)}%)
                  </span>
                )}
              </span>
            ) : (
              <span className="text-emerald-300/80">Dentro do limite permitido</span>
            )}
          </p>
        </div>
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