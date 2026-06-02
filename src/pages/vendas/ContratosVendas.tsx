import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileSignature, Search, Download, Trash2, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useContratosVendas } from '@/hooks/useContratosVendas';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { GerarContratoElisaModal } from '@/components/contratos/GerarContratoElisaModal';
import { AnimatedBreadcrumb } from '@/components/AnimatedBreadcrumb';
import { DelayedParticles } from '@/components/DelayedParticles';

interface VendaRow {
  id: string;
  cliente_nome: string | null;
  cpf_cliente: string | null;
  cidade: string | null;
  data_venda: string;
  valor_venda: number | null;
}

export default function ContratosVendas() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');
  const [vendas, setVendas] = useState<VendaRow[]>([]);
  const [loadingVendas, setLoadingVendas] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedVendaId, setSelectedVendaId] = useState<string | null>(null);

  const { contratos, deleteContrato, isDeleting } = useContratosVendas({});

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    (async () => {
      setLoadingVendas(true);
      let query = supabase
        .from('vendas')
        .select('id, cliente_nome, cpf_cliente, cidade, data_venda, valor_venda, atendente_id')
        .eq('is_rascunho', false)
        .order('data_venda', { ascending: false })
        .limit(200);

      if (!isAdmin && user) {
        query = query.eq('atendente_id', user.id);
      }

      const { data, error } = await query;
      if (!error && data) setVendas(data as any);
      setLoadingVendas(false);
    })();
  }, [user, isAdmin]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return vendas;
    return vendas.filter(v =>
      [v.cliente_nome, v.cpf_cliente, v.cidade].some(f =>
        (f || '').toLowerCase().includes(term)
      )
    );
  }, [vendas, search]);

  const contratosByVenda = useMemo(() => {
    const map: Record<string, typeof contratos extends (infer T)[] | undefined ? T[] : never> = {} as any;
    (contratos || []).forEach(c => {
      (map[c.venda_id] ||= [] as any).push(c);
    });
    return map;
  }, [contratos]);

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <DelayedParticles />

      <AnimatedBreadcrumb
        items={[
          { label: 'Home', path: '/home' },
          { label: 'Vendas', path: '/vendas' },
          { label: 'Contratos' },
        ]}
        mounted={mounted}
      />

      <button
        onClick={() => navigate('/vendas')}
        className="fixed top-4 left-4 z-50 p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-all"
      >
        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/20">
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </div>
      </button>

      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-24 pb-12">
        <div className="mb-6 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/20">
            <FileSignature className="w-6 h-6" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Contratos</h1>
            <p className="text-sm text-white/60">
              Gere contratos GRUPO ELISA a partir das vendas existentes.
            </p>
          </div>
        </div>

        <div className="mb-4 p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10">
          <div className="flex items-center gap-2 px-3">
            <Search className="w-4 h-4 text-white/50" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por cliente, CPF/CNPJ ou cidade..."
              className="border-0 bg-transparent text-white placeholder:text-white/40 focus-visible:ring-0"
            />
          </div>
        </div>

        <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 overflow-hidden">
          {loadingVendas ? (
            <div className="p-6 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 bg-white/5" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-white/60">
              Nenhuma venda encontrada.
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filtered.map(v => {
                const vContratos = (contratosByVenda as any)[v.id] || [];
                return (
                  <div key={v.id} className="p-4 hover:bg-white/[0.02] transition-colors">
                    <div className="flex flex-wrap items-center gap-4 justify-between">
                      <div className="min-w-0">
                        <div className="text-white font-medium truncate">
                          {v.cliente_nome || 'Sem nome'}
                        </div>
                        <div className="text-xs text-white/50 flex flex-wrap gap-x-3">
                          <span>{v.cpf_cliente || 'Sem CPF'}</span>
                          <span>{v.cidade || '-'}</span>
                          <span>{format(new Date(v.data_venda), 'dd/MM/yyyy', { locale: ptBR })}</span>
                          <span className="text-blue-300">{formatCurrency(v.valor_venda || 0)}</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 text-white border border-blue-400/30"
                        onClick={() => {
                          setSelectedVendaId(v.id);
                          setModalOpen(true);
                        }}
                      >
                        <FileSignature className="w-4 h-4 mr-2" />
                        Gerar Contrato
                      </Button>
                    </div>

                    {vContratos.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        {vContratos.map((c: any) => (
                          <div
                            key={c.id}
                            className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="w-4 h-4 text-white/50 shrink-0" />
                              <span className="text-sm text-white/80 truncate">{c.nome_arquivo}</span>
                              <span className="text-xs text-white/40 shrink-0">
                                {format(new Date(c.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
                                onClick={() => window.open(c.arquivo_url, '_blank')}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-red-300/70 hover:text-red-300 hover:bg-red-500/10"
                                disabled={isDeleting}
                                onClick={() => {
                                  if (confirm('Excluir este contrato?')) deleteContrato(c.id);
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <GerarContratoElisaModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        vendaId={selectedVendaId}
      />
    </div>
  );
}