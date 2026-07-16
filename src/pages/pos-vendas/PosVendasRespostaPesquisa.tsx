import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Star, MessageSquare, ShoppingBag, Globe, Paperclip, ThumbsUp, Calendar, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
import { MinimalistLayout } from '@/components/MinimalistLayout';

interface AnexoRef { path: string; nome: string; tipo: string; }
interface ItemAvulso { descricao: string; quantidade: number; preco_venda: number; }

function Stars({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`w-5 h-5 ${n <= value ? 'fill-amber-400 text-amber-400' : 'text-white/20'}`}
        />
      ))}
    </div>
  );
}

function YesNo({ value, label, icon: Icon }: { value: boolean | null | undefined; label: string; icon: any }) {
  const yes = value === true;
  return (
    <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/5 border border-white/10">
      <div className="flex items-center gap-2 text-white/80 text-sm">
        <Icon className="w-4 h-4 text-white/50" />
        {label}
      </div>
      <span
        className={`text-[11px] uppercase tracking-wide px-2 py-0.5 rounded-full border ${
          yes
            ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300'
            : 'bg-white/5 border-white/10 text-white/50'
        }`}
      >
        {yes ? 'Sim' : 'Não'}
      </span>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
      <div className="text-xs uppercase tracking-wider text-white/40 mb-3">{title}</div>
      {children}
    </div>
  );
}

function AnexoItem({ anexo }: { anexo: AnexoRef }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data } = await supabase.storage
        .from('pesquisas-satisfacao')
        .createSignedUrl(anexo.path, 3600);
      if (!cancel) setUrl(data?.signedUrl || null);
    })();
    return () => { cancel = true; };
  }, [anexo.path]);

  const isImg = (anexo.tipo || '').startsWith('image/');

  const abrir = () => {
    if (!url) {
      toast.error('Não foi possível abrir o anexo');
      return;
    }
    window.open(url, '_blank');
  };

  return (
    <button
      type="button"
      onClick={abrir}
      className="group flex items-center gap-3 p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-left"
    >
      <div className="w-14 h-14 rounded-md bg-black/40 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
        {isImg && url ? (
          <img src={url} alt={anexo.nome} className="w-full h-full object-cover" />
        ) : (
          <FileText className="w-6 h-6 text-white/40" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm text-white truncate">{anexo.nome}</div>
        <div className="text-[11px] text-white/40">{anexo.tipo || 'arquivo'}</div>
      </div>
    </button>
  );
}

export default function PosVendasRespostaPesquisa() {
  const { pedidoId } = useParams<{ pedidoId: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['pos-vendas-resposta', pedidoId],
    enabled: !!pedidoId,
    queryFn: async () => {
      const [{ data: pesquisa, error: e1 }, { data: pedido, error: e2 }] = await Promise.all([
        supabase
          .from('pesquisas_satisfacao')
          .select('*')
          .eq('pedido_id', pedidoId)
          .maybeSingle(),
        supabase
          .from('pedidos_producao')
          .select('id, numero_pedido, cliente_nome, cliente_telefone, vendas(data_venda, atendente:admin_users!fk_vendas_atendente(nome, foto_perfil_url))')
          .eq('id', pedidoId)
          .maybeSingle(),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;

      let respondentNome: string | null = null;
      if (pesquisa?.respondido_por) {
        const { data: adm } = await supabase
          .from('admin_users')
          .select('nome')
          .eq('user_id', pesquisa.respondido_por)
          .maybeSingle();
        respondentNome = adm?.nome || null;
      }
      return { pesquisa, pedido, respondentNome };
    },
  });

  const pesquisa = data?.pesquisa;
  const pedido = data?.pedido as any;

  const anexos: AnexoRef[] = Array.isArray(pesquisa?.anexos) ? (pesquisa!.anexos as any) : [];
  const itensAvulsos: ItemAvulso[] = Array.isArray(pesquisa?.itens_avulsos) ? (pesquisa!.itens_avulsos as any) : [];

  const formatDT = (iso?: string | null) => {
    if (!iso) return '-';
    try { return format(parseISO(iso), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }); } catch { return '-'; }
  };

  const subtitulo = pedido
    ? `Pedido #${pedido.numero_pedido} — ${pedido.cliente_nome}`
    : 'Resposta da pesquisa de satisfação';

  return (
    <MinimalistLayout
      title="Resposta da pesquisa"
      subtitle={subtitulo}
      backPath="/pos-vendas/pedidos"
      fullWidth={false}
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-white/50">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando...
        </div>
      ) : !pesquisa ? (
        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-12 text-center">
          <FileText className="w-10 h-10 text-white/30 mx-auto mb-3" />
          <p className="text-white/60">Nenhuma resposta encontrada para este pedido.</p>
          <button
            onClick={() => navigate('/pos-vendas/pedidos')}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Meta */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-white/50">
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/5 border border-white/10">
              <Calendar className="w-3 h-3" />
              Respondido em {formatDT(pesquisa.created_at)}
            </div>
            {data?.respondentNome && (
              <div className="px-2 py-1 rounded-full bg-white/5 border border-white/10">
                Por {data.respondentNome}
              </div>
            )}
            {pedido?.cliente_telefone && (
              <div className="px-2 py-1 rounded-full bg-white/5 border border-white/10">
                {pedido.cliente_telefone}
              </div>
            )}
          </div>

          {/* Avaliações */}
          <Card title="Avaliações">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Atendimento', value: pesquisa.nota_atendimento },
                { label: 'Produto', value: pesquisa.nota_produto },
                { label: 'Instalação', value: pesquisa.nota_instalacao },
              ].map((n) => (
                <div key={n.label} className="rounded-lg bg-white/5 border border-white/10 p-3">
                  <div className="text-[11px] uppercase tracking-wide text-white/40 mb-1.5">{n.label}</div>
                  <div className="flex items-center justify-between">
                    <Stars value={n.value || 0} />
                    <span className="text-white/70 text-sm font-medium">{n.value || 0}/5</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Perguntas */}
          <Card title="Perguntas">
            <div className="grid gap-2 sm:grid-cols-3">
              <YesNo value={pesquisa.recomendaria} label="Recomendaria" icon={ThumbsUp} />
              <YesNo value={pesquisa.quis_comprar_avulsos} label="Quis comprar avulsos" icon={ShoppingBag} />
              <YesNo value={pesquisa.avaliou_no_google} label="Avaliou no Google" icon={Globe} />
            </div>
          </Card>

          {/* Comentário */}
          {pesquisa.comentario && (
            <Card title="Comentário">
              <div className="flex gap-3">
                <MessageSquare className="w-4 h-4 text-white/40 mt-1 shrink-0" />
                <p className="text-sm text-white/80 whitespace-pre-wrap">{pesquisa.comentario}</p>
              </div>
            </Card>
          )}

          {/* Itens avulsos */}
          {pesquisa.quis_comprar_avulsos && itensAvulsos.length > 0 && (
            <Card title="Itens avulsos">
              <div className="space-y-2">
                {itensAvulsos.map((it, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm">
                    <div className="text-white/80">
                      <span className="text-white/50 mr-2">{it.quantidade}x</span>
                      {it.descricao}
                    </div>
                    <div className="text-white/70">
                      {Number(it.preco_venda || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Anexos */}
          {anexos.length > 0 && (
            <Card title="Anexos">
              <div className="grid gap-2 sm:grid-cols-2">
                {anexos.map((a) => (
                  <AnexoItem key={a.path} anexo={a} />
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </MinimalistLayout>
  );
}