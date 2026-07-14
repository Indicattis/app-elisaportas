import { useEffect, useState, useMemo } from 'react';
import { Building2, Target, PieChart, Settings2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface Config {
  id: string;
  meta_por_cidade: number;
  total_cidades_brasil: number;
}

interface AutorizadoRow {
  id: string;
  nome: string;
  cidade: string | null;
  estado: string | null;
  vendedor_id: string | null;
  vendedor_responsavel_id: string | null;
}

export function IndicadoresAutorizados() {
  const [qtdAutorizados, setQtdAutorizados] = useState(0);
  const [qtdCidades, setQtdCidades] = useState(0);
  const [qtdCidadesCobertas, setQtdCidadesCobertas] = useState(0);
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [metaInput, setMetaInput] = useState('1');
  const [saving, setSaving] = useState(false);

  const [listagemOpen, setListagemOpen] = useState(false);
  const [listaAutorizados, setListaAutorizados] = useState<AutorizadoRow[]>([]);
  const [nomesUsuarios, setNomesUsuarios] = useState<Map<string, string>>(new Map());
  const [loadingLista, setLoadingLista] = useState(false);

  const loadListagem = async () => {
    setLoadingLista(true);
    try {
      const { data: autorizadosData, error } = await supabase
        .from('autorizados')
        .select('id, nome, cidade, estado, vendedor_id, vendedor_responsavel_id')
        .eq('ativo', true);
      if (error) throw error;
      const lista = (autorizadosData ?? []) as AutorizadoRow[];
      const userIds = Array.from(
        new Set(
          lista
            .flatMap((a) => [a.vendedor_id, a.vendedor_responsavel_id])
            .filter((v): v is string => !!v),
        ),
      );
      let mapaNomes = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('admin_users')
          .select('user_id, nome')
          .in('user_id', userIds);
        (users ?? []).forEach((u: any) => mapaNomes.set(u.user_id, u.nome));
      }
      setNomesUsuarios(mapaNomes);
      setListaAutorizados(lista);
    } catch (e: any) {
      toast.error('Erro ao carregar lista: ' + (e.message ?? e));
    } finally {
      setLoadingLista(false);
    }
  };

  const listaOrdenada = useMemo(() => {
    const arr = [...listaAutorizados];
    arr.sort((a, b) => {
      const ea = (a.estado ?? '').toUpperCase();
      const eb = (b.estado ?? '').toUpperCase();
      if (ea !== eb) return ea.localeCompare(eb);
      return (a.nome ?? '').localeCompare(b.nome ?? '');
    });
    return arr;
  }, [listaAutorizados]);

  const handleAbrirListagem = () => {
    setListagemOpen(true);
    loadListagem();
  };

  const load = async () => {
    setLoading(true);
    const [
      { count },
      { data: cidadesMaster },
      { data: estados },
      { data: autorizadosData },
      { data: secundarias },
      { data: cfg },
    ] = await Promise.all([
      supabase.from('autorizados').select('*', { count: 'exact', head: true }).eq('ativo', true),
      supabase.from('cidades_autorizados').select('nome, estado_id'),
      supabase.from('estados_autorizados').select('id, sigla'),
      supabase.from('autorizados').select('cidade, estado').eq('ativo', true),
      supabase.from('autorizado_cidades_secundarias').select('cidade, estado'),
      supabase.from('autorizados_meta_config').select('*').order('updated_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    setQtdAutorizados(count ?? 0);
    if (cfg) {
      setConfig(cfg as Config);
      setMetaInput(String(cfg.meta_por_cidade));
    }

    const meta = Number((cfg as any)?.meta_por_cidade ?? 0);
    const estadoById = new Map<string, string>();
    (estados ?? []).forEach((e: any) => estadoById.set(e.id, (e.sigla ?? '').toUpperCase()));

    const norm = (s: any) => String(s ?? '').trim().toLowerCase();
    const key = (cidade: any, estado: any) => `${norm(cidade)}|${norm(estado)}`;

    const contagem = new Map<string, number>();
    [...(autorizadosData ?? []), ...(secundarias ?? [])].forEach((a: any) => {
      if (!a.cidade || !a.estado) return;
      const k = key(a.cidade, a.estado);
      contagem.set(k, (contagem.get(k) ?? 0) + 1);
    });

    const cidadesTotal = cidadesMaster ?? [];
    setQtdCidades(cidadesTotal.length);
    let cobertas = 0;
    if (meta > 0) {
      cidadesTotal.forEach((c: any) => {
        const sigla = estadoById.get(c.estado_id) ?? '';
        const k = key(c.nome, sigla);
        if ((contagem.get(k) ?? 0) >= meta) cobertas++;
      });
    }
    setQtdCidadesCobertas(cobertas);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const metaTotal = config ? Number(config.meta_por_cidade) * qtdCidades : 0;
  const percentual = qtdCidades > 0 ? (qtdCidadesCobertas / qtdCidades) * 100 : 0;

  const salvarMeta = async () => {
    const valor = Number(metaInput.replace(',', '.'));
    if (!Number.isFinite(valor) || valor <= 0) {
      toast.error('Informe um valor válido (> 0)');
      return;
    }
    setSaving(true);
    try {
      if (config) {
        const { error } = await supabase
          .from('autorizados_meta_config')
          .update({ meta_por_cidade: valor, updated_at: new Date().toISOString() })
          .eq('id', config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('autorizados_meta_config')
          .insert({ meta_por_cidade: valor });
        if (error) throw error;
      }
      toast.success('Meta atualizada');
      setEditOpen(false);
      await load();
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + (e.message ?? e));
    } finally {
      setSaving(false);
    }
  };

  const cards = [
    {
      label: 'Autorizados Cadastrados',
      value: loading ? '—' : qtdAutorizados.toLocaleString('pt-BR'),
      icon: Building2,
      accent: 'from-blue-500/20 to-blue-600/10 border-blue-400/20 text-blue-300',
      iconBg: 'bg-blue-500/20 text-blue-300',
      onClick: handleAbrirListagem,
    },
    {
      label: 'Meta de Autorizados por Cidade',
      value: loading ? '—' : Number(config?.meta_por_cidade ?? 0).toLocaleString('pt-BR'),
      hint: config ? `Meta total: ${metaTotal.toLocaleString('pt-BR')} (${qtdCidades.toLocaleString('pt-BR')} cidades cadastradas)` : undefined,
      icon: Target,
      accent: 'from-emerald-500/20 to-emerald-600/10 border-emerald-400/20 text-emerald-300',
      iconBg: 'bg-emerald-500/20 text-emerald-300',
      action: (
        <button
          onClick={() => setEditOpen(true)}
          className="p-1.5 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          title="Configurar meta"
        >
          <Settings2 className="h-3.5 w-3.5" />
        </button>
      ),
    },
    {
      label: '% de Cobertura',
      value: loading ? '—' : `${percentual.toFixed(2)}%`,
      hint: !loading && qtdCidades > 0
        ? `${qtdCidadesCobertas.toLocaleString('pt-BR')} de ${qtdCidades.toLocaleString('pt-BR')} cidades com ≥ ${Number(config?.meta_por_cidade ?? 0).toLocaleString('pt-BR')} autorizado(s)`
        : undefined,
      icon: PieChart,
      accent: 'from-purple-500/20 to-purple-600/10 border-purple-400/20 text-purple-300',
      iconBg: 'bg-purple-500/20 text-purple-300',
    },
  ];

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          const clickable = !!(c as any).onClick;
          return (
            <div
              key={c.label}
              onClick={clickable ? (c as any).onClick : undefined}
              role={clickable ? 'button' : undefined}
              tabIndex={clickable ? 0 : undefined}
              onKeyDown={
                clickable
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        (c as any).onClick?.();
                      }
                    }
                  : undefined
              }
              className={`relative rounded-xl bg-gradient-to-br ${c.accent} backdrop-blur-xl border p-4 flex items-center gap-4 ${
                clickable ? 'cursor-pointer hover:brightness-110 hover:border-white/30 transition-all' : ''
              }`}
            >
              <div className={`h-11 w-11 rounded-lg flex items-center justify-center ${c.iconBg}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-white/60">{c.label}</div>
                <div className="text-2xl font-semibold text-white tabular-nums">{c.value}</div>
                {c.hint && <div className="text-[11px] text-white/40 mt-0.5 truncate">{c.hint}</div>}
              </div>
              {c.action && <div className="self-start">{c.action}</div>}
            </div>
          );
        })}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-black/90 border-white/10 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-white">Configurar Meta por Cidade</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-white/70 text-xs">Autorizados por cidade (meta)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={metaInput}
                onChange={(e) => setMetaInput(e.target.value)}
                className="bg-white/5 border-white/10 text-white mt-1"
              />
              <p className="text-[11px] text-white/40 mt-1">
                Base: {qtdCidades.toLocaleString('pt-BR')} cidades cadastradas
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditOpen(false)} disabled={saving} className="text-white/70 hover:bg-white/10">
              Cancelar
            </Button>
            <Button onClick={salvarMeta} disabled={saving} className="bg-blue-500 hover:bg-blue-600 text-white">
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={listagemOpen} onOpenChange={setListagemOpen}>
        <DialogContent className="bg-black/90 border-white/10 backdrop-blur-xl max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-white">
              Autorizados cadastrados
              {!loadingLista && ` (${listaOrdenada.length})`}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto -mx-6 px-6">
            {loadingLista ? (
              <div className="py-10 text-center text-white/60 text-sm">Carregando...</div>
            ) : listaOrdenada.length === 0 ? (
              <div className="py-10 text-center text-white/60 text-sm">Nenhum autorizado ativo.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-black/80 backdrop-blur-xl z-10">
                  <tr className="text-left text-xs uppercase tracking-wider text-white/50 border-b border-white/10">
                    <th className="py-2 px-3 font-medium">Estado</th>
                    <th className="py-2 px-3 font-medium">Cidade</th>
                    <th className="py-2 px-3 font-medium">Autorizado</th>
                    <th className="py-2 px-3 font-medium">Vendedor Responsável</th>
                    <th className="py-2 px-3 font-medium">Atendente</th>
                  </tr>
                </thead>
                <tbody>
                  {listaOrdenada.map((a, idx) => {
                    const prevEstado = idx > 0 ? (listaOrdenada[idx - 1].estado ?? '').toUpperCase() : null;
                    const estadoAtual = (a.estado ?? '').toUpperCase();
                    const novoGrupo = prevEstado !== estadoAtual;
                    return (
                      <tr
                        key={a.id}
                        className={`border-b border-white/5 text-white/80 hover:bg-white/5 ${
                          novoGrupo ? 'border-t border-white/15' : ''
                        }`}
                      >
                        <td className="py-2 px-3 font-medium text-white">{estadoAtual || '—'}</td>
                        <td className="py-2 px-3">{a.cidade || '—'}</td>
                        <td className="py-2 px-3">{a.nome}</td>
                        <td className="py-2 px-3">
                          {a.vendedor_responsavel_id ? nomesUsuarios.get(a.vendedor_responsavel_id) ?? '—' : '—'}
                        </td>
                        <td className="py-2 px-3">
                          {a.vendedor_id ? nomesUsuarios.get(a.vendedor_id) ?? '—' : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          <div className="flex justify-end pt-2">
            <Button variant="ghost" onClick={() => setListagemOpen(false)} className="text-white/70 hover:bg-white/10">
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}