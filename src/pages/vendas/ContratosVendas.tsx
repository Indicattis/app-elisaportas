import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileSignature, Search, Download, Trash2, FileText, FileClock, FileCheck2, Upload } from 'lucide-react';
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
import { AnexarContratoModal } from '@/components/vendas/AnexarContratoModal';
import { AnimatedBreadcrumb } from '@/components/AnimatedBreadcrumb';
import { DelayedParticles } from '@/components/DelayedParticles';

interface VendaRow {
  id: string;
  cliente_nome: string | null;
  cpf_cliente: string | null;
  cidade: string | null;
  data_venda: string;
  valor_venda: number | null;
  contrato_url: string | null;
  contrato_assinado_em: string | null;
}

export default function ContratosVendas() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');
  const [vendas, setVendas] = useState<VendaRow[]>([]);
  const [loadingVendas, setLoadingVendas] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedVendaId, setSelectedVendaId] = useState<string | null>(null);
  const [anexarOpen, setAnexarOpen] = useState(false);
  const [anexarVenda, setAnexarVenda] = useState<{ id: string; nome: string } | null>(null);

  const { contratos, deleteContrato, isDeleting } = useContratosVendas({});

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    (async () => {
      setLoadingVendas(true);
      const query = supabase
        .from('vendas')
        .select('id, cliente_nome, cpf_cliente, cidade, data_venda, valor_venda, atendente_id, contrato_url, contrato_assinado_em')
        .eq('is_rascunho', false)
        .eq('contrato_dispensado', false)
        .neq('status_aprovacao', 'reprovado')
        .order('data_venda', { ascending: false })
        .limit(5000);

      const { data, error } = await query;
      if (!error && data) setVendas(data as any);
      setLoadingVendas(false);
    })();
  }, [user]);

  const contratosByVenda = useMemo(() => {
    const map: Record<string, typeof contratos extends (infer T)[] | undefined ? T[] : never> = {} as any;
    (contratos || []).forEach(c => {
      (map[c.venda_id] ||= [] as any).push(c);
    });
    return map;
  }, [contratos]);

  const matchesSearch = (v: VendaRow) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return [v.cliente_nome, v.cpf_cliente, v.cidade].some(f =>
      (f || '').toLowerCase().includes(term)
    );
  };

  const { pendentes, gerados, assinados } = useMemo(() => {
    const pendentes: VendaRow[] = [];
    const gerados: VendaRow[] = [];
    const assinados: VendaRow[] = [];
    vendas.filter(matchesSearch).forEach(v => {
      const hasContratoUrl = !!v.contrato_url && v.contrato_url !== 'legado';
      const hasGerado = ((contratosByVenda as any)[v.id] || []).length > 0;
      if (hasContratoUrl) assinados.push(v);
      else if (hasGerado) gerados.push(v);
      else pendentes.push(v);
    });
    return { pendentes, gerados, assinados };
  }, [vendas, contratosByVenda, search]);

  const renderContratoFiles = (vendaId: string, allowDelete: boolean) => {
    const vContratos = (contratosByVenda as any)[vendaId] || [];
    if (vContratos.length === 0) return null;
    return (
      <div className="mt-3 space-y-1.5">
        {vContratos.map((c: any) => (
          <div
            key={c.id}
            className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/5"
          >
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-3.5 h-3.5 text-white/50 shrink-0" />
              <span className="text-xs text-white/80 truncate">{c.nome_arquivo}</span>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-white/70 hover:text-white hover:bg-white/10"
                onClick={() => window.open(c.arquivo_url, '_blank')}
              >
                <Download className="w-3.5 h-3.5" />
              </Button>
              {allowDelete && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-red-300/70 hover:text-red-300 hover:bg-red-500/10"
                  disabled={isDeleting}
                  onClick={() => {
                    if (confirm('Excluir este contrato?')) deleteContrato(c.id);
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const Card = ({ v, children }: { v: VendaRow; children?: React.ReactNode }) => (
    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-colors">
      <div className="min-w-0">
        <div className="text-white text-sm font-medium truncate">
          {v.cliente_nome || 'Sem nome'}
        </div>
        <div className="text-[11px] text-white/50 flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
          <span>{v.cpf_cliente || 'Sem CPF'}</span>
          <span>{v.cidade || '-'}</span>
          <span>{format(new Date(v.data_venda), 'dd/MM/yyyy', { locale: ptBR })}</span>
          <span className="text-blue-300">{formatCurrency(v.valor_venda || 0)}</span>
        </div>
      </div>
      {children}
    </div>
  );

  const Column = ({
    title,
    icon,
    accent,
    count,
    children,
  }: {
    title: string;
    icon: React.ReactNode;
    accent: string;
    count: number;
    children: React.ReactNode;
  }) => (
    <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 flex flex-col min-h-0">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
        <div className={`p-1.5 rounded-lg ${accent} text-white`}>{icon}</div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-white truncate">{title}</h2>
        </div>
        <span className="text-xs text-white/60 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
          {count}
        </span>
      </div>
      <div className="p-3 space-y-2 overflow-y-auto max-h-[calc(100vh-260px)]">
        {children}
      </div>
    </div>
  );

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

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-12">
        <div className="mb-6 flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/20">
            <FileSignature className="w-6 h-6" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Contratos</h1>
            <p className="text-sm text-white/60">
              Acompanhe o ciclo de contratos de cada venda.
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

        {loadingVendas ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-3 space-y-2">
                {Array.from({ length: 4 }).map((_, j) => (
                  <Skeleton key={j} className="h-16 bg-white/5" />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Column
              title="Pendente de Contrato"
              icon={<FileClock className="w-4 h-4" strokeWidth={1.8} />}
              accent="bg-gradient-to-br from-amber-500 to-amber-700 shadow-lg shadow-amber-500/20"
              count={pendentes.length}
            >
              {pendentes.length === 0 ? (
                <div className="text-center text-white/40 text-xs py-6">Nenhuma venda</div>
              ) : (
                pendentes.map(v => (
                  <Card key={v.id} v={v}>
                    <Button
                      size="sm"
                      className="mt-3 w-full bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 text-white border border-blue-400/30"
                      onClick={() => {
                        setSelectedVendaId(v.id);
                        setModalOpen(true);
                      }}
                    >
                      <FileSignature className="w-4 h-4 mr-2" />
                      Gerar Contrato
                    </Button>
                  </Card>
                ))
              )}
            </Column>

            <Column
              title="Contrato Gerado"
              icon={<FileText className="w-4 h-4" strokeWidth={1.8} />}
              accent="bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-500/20"
              count={gerados.length}
            >
              {gerados.length === 0 ? (
                <div className="text-center text-white/40 text-xs py-6">Nenhuma venda</div>
              ) : (
                gerados.map(v => (
                  <Card key={v.id} v={v}>
                    {renderContratoFiles(v.id, true)}
                    <Button
                      size="sm"
                      className="mt-3 w-full bg-gradient-to-r from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 text-white border border-emerald-400/30"
                      onClick={() => {
                        setAnexarVenda({ id: v.id, nome: v.cliente_nome || 'Sem nome' });
                        setAnexarOpen(true);
                      }}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Anexar Assinado
                    </Button>
                  </Card>
                ))
              )}
            </Column>

            <Column
              title="Contrato Assinado"
              icon={<FileCheck2 className="w-4 h-4" strokeWidth={1.8} />}
              accent="bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-lg shadow-emerald-500/20"
              count={assinados.length}
            >
              {assinados.length === 0 ? (
                <div className="text-center text-white/40 text-xs py-6">Nenhuma venda</div>
              ) : (
                assinados.map(v => (
                  <Card key={v.id} v={v}>
                    {v.contrato_assinado_em && (
                      <div className="mt-2 text-[11px] text-emerald-300/80 flex items-center gap-1">
                        <FileCheck2 className="w-3 h-3" />
                        Assinado em {format(new Date(v.contrato_assinado_em), 'dd/MM/yyyy', { locale: ptBR })}
                      </div>
                    )}
                    {renderContratoFiles(v.id, false)}
                    {v.contrato_url && v.contrato_url !== 'legado' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="mt-2 w-full text-white/80 hover:text-white hover:bg-white/10 border border-white/10"
                        onClick={async () => {
                          const { data } = await supabase.storage
                            .from('contratos-vendas')
                            .createSignedUrl(v.contrato_url as string, 300);
                          if (data?.signedUrl) window.open(data.signedUrl, '_blank');
                        }}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Baixar contrato assinado
                      </Button>
                    )}
                  </Card>
                ))
              )}
            </Column>
          </div>
        )}
      </div>

      <GerarContratoElisaModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        vendaId={selectedVendaId}
      />

      {anexarVenda && (
        <AnexarContratoModal
          open={anexarOpen}
          onOpenChange={(o) => {
            setAnexarOpen(o);
            if (!o) setAnexarVenda(null);
          }}
          vendaId={anexarVenda.id}
          clienteNome={anexarVenda.nome}
        />
      )}
    </div>
  );
}