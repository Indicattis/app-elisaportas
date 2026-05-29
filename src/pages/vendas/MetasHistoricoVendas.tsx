import { useMemo, useState } from 'react';
import { Target, TrendingUp, User, CalendarRange } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { MinimalistLayout } from '@/components/MinimalistLayout';
import { useHistoricoMetasVendas } from '@/hooks/useHistoricoMetasVendas';
import { formatCurrency } from '@/lib/utils';

export default function MetasHistoricoVendas() {
  const { data, isLoading } = useHistoricoMetasVendas();

  const [filtroVendedor, setFiltroVendedor] = useState<string>('all');
  const [filtroSemana, setFiltroSemana] = useState<string>('all');

  // Vendedores únicos (a partir de todas as metas individuais)
  const vendedoresOpcoes = useMemo(() => {
    const map = new Map<string, string>();
    (data || []).forEach(({ periodos }) => {
      periodos.forEach((p) => {
        p.vendedores.forEach((v) => {
          if (!map.has(v.vendedor_id)) map.set(v.vendedor_id, v.nome);
        });
      });
    });
    return Array.from(map.entries())
      .map(([id, nome]) => ({ id, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [data]);

  // Semanas únicas (apenas de metas semanais)
  const semanasOpcoes = useMemo(() => {
    const map = new Map<string, string>();
    (data || []).forEach(({ meta, periodos }) => {
      if (meta.periodo !== 'semanal') return;
      periodos.forEach((p) => {
        if (!map.has(p.key)) map.set(p.key, p.label);
      });
    });
    return Array.from(map.entries())
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => (a.key < b.key ? 1 : -1));
  }, [data]);

  // Aplica filtros — esconde períodos/metas sem resultado
  const dataFiltrada = useMemo(() => {
    return (data || [])
      .map(({ meta, periodos }) => {
        const periodosFiltrados = periodos
          .filter((p) => {
            if (filtroSemana !== 'all') {
              if (meta.periodo !== 'semanal') return false;
              if (p.key !== filtroSemana) return false;
            }
            return true;
          })
          .map((p) => {
            if (meta.escopo !== 'individual' || filtroVendedor === 'all') return p;
            return { ...p, vendedores: p.vendedores.filter((v) => v.vendedor_id === filtroVendedor) };
          })
          .filter((p) => {
            if (meta.escopo === 'individual' && filtroVendedor !== 'all') {
              return p.vendedores.length > 0;
            }
            return true;
          });
        return { meta, periodos: periodosFiltrados };
      })
      .filter(({ meta, periodos }) => {
        // Se há filtro de vendedor e a meta é global, esconde
        if (filtroVendedor !== 'all' && meta.escopo === 'global') return false;
        // Se há filtro de semana e a meta não é semanal, esconde
        if (filtroSemana !== 'all' && meta.periodo !== 'semanal') return false;
        return periodos.length > 0 || (filtroVendedor === 'all' && filtroSemana === 'all');
      });
  }, [data, filtroVendedor, filtroSemana]);

  const filtrosAtivos = filtroVendedor !== 'all' || filtroSemana !== 'all';

  const headerActions = (
    <div className="flex items-center gap-2 flex-wrap justify-end">
      <Select value={filtroVendedor} onValueChange={setFiltroVendedor}>
        <SelectTrigger className="w-[200px] h-8 bg-white/5 border-white/10 text-white/80 text-xs">
          <User className="w-3 h-3 mr-1.5 text-white/40" />
          <SelectValue placeholder="Todos os vendedores" />
        </SelectTrigger>
        <SelectContent className="bg-[#1a1a1a] border-white/20">
          <SelectItem value="all" className="text-white hover:bg-white/10">Todos os vendedores</SelectItem>
          {vendedoresOpcoes.map((v) => (
            <SelectItem key={v.id} value={v.id} className="text-white hover:bg-white/10">
              {v.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filtroSemana} onValueChange={setFiltroSemana}>
        <SelectTrigger className="w-[220px] h-8 bg-white/5 border-white/10 text-white/80 text-xs">
          <CalendarRange className="w-3 h-3 mr-1.5 text-white/40" />
          <SelectValue placeholder="Todas as semanas" />
        </SelectTrigger>
        <SelectContent className="bg-[#1a1a1a] border-white/20 max-h-[300px]">
          <SelectItem value="all" className="text-white hover:bg-white/10">Todas as semanas</SelectItem>
          {semanasOpcoes.length === 0 ? (
            <div className="px-2 py-1.5 text-xs text-white/40">Sem metas semanais</div>
          ) : (
            semanasOpcoes.map((s) => (
              <SelectItem key={s.key} value={s.key} className="text-white hover:bg-white/10">
                {s.label}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

      {filtrosAtivos && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { setFiltroVendedor('all'); setFiltroSemana('all'); }}
          className="h-8 text-white/50 hover:text-white hover:bg-white/10 text-xs px-2"
        >
          Limpar filtros
        </Button>
      )}
    </div>
  );

  return (
    <MinimalistLayout
      title="Histórico de Metas"
      subtitle="Resultados passados das metas do setor de vendas"
      backPath="/vendas"
      headerActions={headerActions}
      breadcrumbItems={[
        { label: 'Home', path: '/home' },
        { label: 'Vendas', path: '/vendas' },
        { label: 'Metas' },
      ]}
    >
      <div className="space-y-4">
        {isLoading && (
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 animate-pulse">
            <div className="h-4 w-40 bg-white/10 rounded mb-3" />
            <div className="h-3 w-64 bg-white/10 rounded" />
          </div>
        )}

        {!isLoading && dataFiltrada.length === 0 && (
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 text-center">
            <Target className="h-10 w-10 text-white/30 mx-auto mb-2" />
            <p className="text-sm text-white/60">
              {filtrosAtivos ? 'Nenhum resultado para os filtros aplicados.' : 'Nenhuma meta cadastrada ainda.'}
            </p>
          </div>
        )}

        {dataFiltrada.map(({ meta, periodos }) => (
          <div
            key={meta.id}
            className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-4 space-y-4"
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-white">{meta.nome}</h3>
                  <Badge variant="outline" className="capitalize">{meta.periodo}</Badge>
                  <Badge variant="outline" className="capitalize">{meta.escopo}</Badge>
                  {!meta.ativa && <Badge variant="secondary">Inativa</Badge>}
                </div>
                <div className="text-xs text-white/50 mt-1">
                  Vigência: {meta.data_inicio_vigencia}
                  {meta.data_fim_vigencia ? ` → ${meta.data_fim_vigencia}` : ' → indefinido'}
                </div>
              </div>
            </div>

            {periodos.length === 0 ? (
              <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4 text-center text-xs text-white/40">
                Sem períodos encerrados ainda.
              </div>
            ) : (
              <div className="space-y-3">
                {periodos.map((p) => (
                  <div
                    key={p.key}
                    className="rounded-lg border border-white/10 bg-white/[0.03] p-3"
                  >
                    <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
                      <div className="flex items-center gap-2 text-sm text-white/80">
                        <TrendingUp className="h-4 w-4 text-white/40" />
                        <span className="font-medium">{p.label}</span>
                      </div>
                      {meta.escopo === 'global' && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-white/50">Total:</span>
                          <span className="text-sm font-semibold text-white">
                            {formatCurrency(p.totalGlobal)}
                          </span>
                          {p.tier_atingido_global ? (
                            <span
                              className="px-2 py-0.5 rounded-md border text-[11px] font-medium"
                              style={{
                                borderColor: p.tier_atingido_global.cor + '80',
                                background: p.tier_atingido_global.cor + '20',
                                color: '#fff',
                              }}
                            >
                              {p.tier_atingido_global.nome}
                            </span>
                          ) : (
                            <span className="text-[11px] text-white/40">Sem tier</span>
                          )}
                          {p.bonificacao_global > 0 && (
                            <span className="text-xs text-emerald-300">
                              +{formatCurrency(p.bonificacao_global)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {meta.escopo === 'individual' && (
                      <div className="space-y-1.5">
                        {p.vendedores.length === 0 ? (
                          <div className="text-[11px] text-white/40 px-1">
                            Nenhuma venda neste período.
                          </div>
                        ) : (
                          p.vendedores.map((v) => (
                            <div
                              key={v.vendedor_id}
                              className="flex items-center justify-between gap-3 px-2 py-1.5 rounded-md bg-white/[0.03]"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {v.foto_perfil_url ? (
                                  <img
                                    src={v.foto_perfil_url}
                                    alt={v.nome}
                                    className="w-6 h-6 rounded-full object-cover border border-white/10"
                                  />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-[10px] text-white/60">
                                    {v.nome.slice(0, 1).toUpperCase()}
                                  </div>
                                )}
                                <span className="text-xs text-white/80 truncate">{v.nome}</span>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap justify-end">
                                <span className="text-xs font-medium text-white">
                                  {formatCurrency(v.total_vendido)}
                                </span>
                                {v.tier_atingido ? (
                                  <span
                                    className="px-1.5 py-0.5 rounded-md border text-[10px]"
                                    style={{
                                      borderColor: v.tier_atingido.cor + '80',
                                      background: v.tier_atingido.cor + '20',
                                      color: '#fff',
                                    }}
                                  >
                                    {v.tier_atingido.nome}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-white/40">—</span>
                                )}
                                {v.bonificacao_calculada > 0 && (
                                  <span className="text-[11px] text-emerald-300">
                                    +{formatCurrency(v.bonificacao_calculada)}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </MinimalistLayout>
  );
}