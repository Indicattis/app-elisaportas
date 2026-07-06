import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Plus, Trash2, Upload, X, Loader2, ChevronDown, ChevronUp, Play, Clock, Pencil, CheckCircle2, User } from 'lucide-react';
import { AnimatedBreadcrumb } from '@/components/AnimatedBreadcrumb';
import { DelayedParticles } from '@/components/DelayedParticles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { logVisitaHistorico } from '@/lib/visitasHistorico';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useCronometro } from '@/hooks/useCronometro';
import { formatCronometro } from '@/utils/timeFormat';

interface Cor { id: string; nome: string; codigo_hex: string }
interface CustoItem { id: string; descricao: string; categoria: string | null }
interface AcessorioSel { custo_item_id: string; nome: string; quantidade: number }
interface FotoLocal { id: string; url: string; legenda: string; existing?: boolean }

interface PortaForm {
  id: string; // local
  dbId?: string;
  ordem: number;
  largura_vao: string;
  altura_vao: string;
  largura_total: string;
  altura_total: string;
  meia_cana_tipo: string;
  cores: Cor[];
  tem_tiras_frontais: boolean;
  qtd_tiras_frontais: string;
  tem_controle_adicional: boolean;
  qtd_controle_adicional: string;
  caixa_motor: string;
  guia_tamanho: string;
  acessorios: AcessorioSel[];
  posicao_porta: string;
  posicao_motor: string;
  posicao_guia: string;
  posicao_testeira: string;
  tipo_guia: string;
  dificuldade_instalacao: string;
  tem_tubo_afastamento: boolean;
  distancia_tubo_cm: string;
  tem_tubo_tiras_frontais: boolean;
  retirar_portao_local: boolean;
  observacoes: string;
  fotos: FotoLocal[];
  novasFotos: File[];
  legendasNovas: string[];
  expandido: boolean;
}

function novaPorta(ordem: number): PortaForm {
  return {
    id: crypto.randomUUID(),
    ordem,
    largura_vao: '', altura_vao: '', largura_total: '', altura_total: '',
    meia_cana_tipo: '',
    cores: [],
    tem_tiras_frontais: false, qtd_tiras_frontais: '',
    tem_controle_adicional: false, qtd_controle_adicional: '',
    caixa_motor: '', guia_tamanho: '',
    acessorios: [],
    posicao_porta: '', posicao_motor: '', posicao_guia: '', posicao_testeira: '',
    tipo_guia: '', dificuldade_instalacao: '',
    tem_tubo_afastamento: false, distancia_tubo_cm: '',
    tem_tubo_tiras_frontais: false,
    retirar_portao_local: false,
    observacoes: '',
    fotos: [],
    novasFotos: [],
    legendasNovas: [],
    expandido: true,
  };
}

const inputCls = 'mt-1 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-blue-500/50 focus-visible:border-blue-400/50';
const labelCls = 'text-[11px] uppercase tracking-wider text-white/50 font-medium';
const selectTriggerCls = 'mt-1 bg-white/5 border-white/10 text-white focus:ring-blue-500/50';
const selectContentCls = 'bg-black/90 backdrop-blur-xl border-white/10 text-white';

export default function VisitaTecnicaConclusao() {
  const { visitaId } = useParams<{ visitaId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { userRole } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [portas, setPortas] = useState<PortaForm[]>([]);
  const [obsGerais, setObsGerais] = useState('');
  const [readOnly, setReadOnly] = useState(false);
  const [iniciado, setIniciado] = useState(false);
  const [lightbox, setLightbox] = useState<{ open: boolean; url: string; legenda: string }>({ open: false, url: '', legenda: '' });
  const { segundosDecorridos, isRunning, start: startCron } = useCronometro();

  useEffect(() => { const t = setTimeout(() => setMounted(true), 50); return () => clearTimeout(t); }, []);

  const { data: visita, isLoading: loadingVisita } = useQuery({
    queryKey: ['visita-agendada', visitaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('visitas_tecnicas_agendadas').select('*').eq('id', visitaId).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!visitaId,
  });

  const { data: cores = [] } = useQuery({
    queryKey: ['catalogo-cores-ativas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('catalogo_cores').select('id, nome, codigo_hex').eq('ativa', true).order('nome');
      if (error) throw error;
      return (data || []) as Cor[];
    },
  });

  const { data: acessoriosLista = [] } = useQuery({
    queryKey: ['custos-itens-acessorios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custos_itens').select('id, descricao, categoria').eq('categoria', 'Acessórios').order('descricao');
      if (error) throw error;
      return (data || []) as CustoItem[];
    },
  });

  // Carregar conclusão existente (se houver)
  const { data: existente } = useQuery({
    queryKey: ['visita-conclusao', visitaId],
    queryFn: async () => {
      const { data: c } = await supabase
        .from('visitas_tecnicas_conclusoes').select('*').eq('visita_id', visitaId).maybeSingle();
      if (!c) return null;
      const { data: ps } = await supabase
        .from('visitas_tecnicas_portas').select('*').eq('conclusao_id', c.id).order('ordem');
      const portasIds = (ps || []).map((p: any) => p.id);
      const { data: fotos } = portasIds.length
        ? await supabase.from('visitas_tecnicas_portas_fotos').select('*').in('porta_id', portasIds).order('ordem')
        : { data: [] as any[] };
      return { conclusao: c, portas: ps || [], fotos: fotos || [] };
    },
    enabled: !!visitaId,
  });

  const carregarConclusao = useCallback((dados: typeof existente) => {
    if (!dados) return;
    setReadOnly(true);
    setIniciado(true);
    setObsGerais(dados.conclusao.observacoes_gerais || '');
    const fotosPorPorta = new Map<string, any[]>();
    for (const f of dados.fotos) {
      const arr = fotosPorPorta.get(f.porta_id) || [];
      arr.push(f);
      fotosPorPorta.set(f.porta_id, arr);
    }
    setPortas(dados.portas.map((p: any, idx: number) => ({
      id: p.id, dbId: p.id, ordem: p.ordem ?? idx,
      largura_vao: p.largura_vao?.toString() || '',
      altura_vao: p.altura_vao?.toString() || '',
      largura_total: p.largura_total?.toString() || '',
      altura_total: p.altura_total?.toString() || '',
      meia_cana_tipo: p.meia_cana_tipo || '',
      cores: (p.cores as Cor[]) || [],
      tem_tiras_frontais: !!p.tem_tiras_frontais,
      qtd_tiras_frontais: p.qtd_tiras_frontais?.toString() || '',
      tem_controle_adicional: !!p.tem_controle_adicional,
      qtd_controle_adicional: p.qtd_controle_adicional?.toString() || '',
      caixa_motor: p.caixa_motor || '',
      guia_tamanho: p.guia_tamanho || '',
      acessorios: (p.acessorios as AcessorioSel[]) || [],
      posicao_porta: p.posicao_porta || '',
      posicao_motor: p.posicao_motor || '',
      posicao_guia: p.posicao_guia || '',
      posicao_testeira: p.posicao_testeira || '',
      tipo_guia: p.tipo_guia || '',
      dificuldade_instalacao: p.dificuldade_instalacao || '',
      tem_tubo_afastamento: !!p.tem_tubo_afastamento,
      distancia_tubo_cm: p.distancia_tubo_cm?.toString() || '',
      tem_tubo_tiras_frontais: !!p.tem_tubo_tiras_frontais,
      retirar_portao_local: !!p.retirar_portao_local,
      observacoes: p.observacoes || '',
      fotos: (fotosPorPorta.get(p.id) || []).map((f: any) => ({
        id: f.id, url: f.url, legenda: f.legenda || '', existing: true,
      })),
      novasFotos: [],
      legendasNovas: [],
      expandido: false,
    })));
  }, []);

  useEffect(() => {
    carregarConclusao(existente);
  }, [existente, carregarConclusao]);

  const { data: concluidoPor } = useQuery({
    queryKey: ['visita-concluido-por', existente?.conclusao?.concluido_por],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_users')
        .select('nome, user_id')
        .eq('user_id', existente?.conclusao?.concluido_por)
        .maybeSingle();
      if (error) throw error;
      return data as { nome: string; user_id: string } | null;
    },
    enabled: !!readOnly && !!existente?.conclusao?.concluido_por,
  });

  const iniciarEdicao = () => {
    setReadOnly(false);
    setPortas(prev => prev.map(p => ({ ...p, expandido: true })));
  };

  const cancelarEdicao = () => {
    carregarConclusao(existente);
  };

  const updatePorta = (id: string, patch: Partial<PortaForm>) => {
    setPortas(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
  };

  const removerPorta = (id: string) => {
    if (!confirm('Remover esta porta?')) return;
    setPortas(prev => prev.filter(p => p.id !== id));
  };

  const adicionarPorta = () => {
    setPortas(prev => [...prev, novaPorta(prev.length)]);
  };

  const toggleCor = (portaId: string, cor: Cor) => {
    const p = portas.find(x => x.id === portaId);
    if (!p) return;
    const exists = p.cores.find(c => c.id === cor.id);
    updatePorta(portaId, {
      cores: exists ? p.cores.filter(c => c.id !== cor.id) : [...p.cores, cor],
    });
  };

  const toggleAcessorio = (portaId: string, item: CustoItem) => {
    const p = portas.find(x => x.id === portaId);
    if (!p) return;
    const exists = p.acessorios.find(a => a.custo_item_id === item.id);
    updatePorta(portaId, {
      acessorios: exists
        ? p.acessorios.filter(a => a.custo_item_id !== item.id)
        : [...p.acessorios, { custo_item_id: item.id, nome: item.descricao, quantidade: 1 }],
    });
  };

  const setAcessorioQtd = (portaId: string, custoId: string, qtd: number) => {
    const p = portas.find(x => x.id === portaId);
    if (!p) return;
    updatePorta(portaId, {
      acessorios: p.acessorios.map(a => a.custo_item_id === custoId ? { ...a, quantidade: qtd } : a),
    });
  };

  const onFilesAdded = (portaId: string, files: FileList | null) => {
    if (!files) return;
    const p = portas.find(x => x.id === portaId);
    if (!p) return;
    const novas = Array.from(files).slice(0, 10 - p.fotos.length - p.novasFotos.length);
    updatePorta(portaId, {
      novasFotos: [...p.novasFotos, ...novas],
      legendasNovas: [...p.legendasNovas, ...novas.map(() => '')],
    });
  };

  const removerNovaFoto = (portaId: string, idx: number) => {
    const p = portas.find(x => x.id === portaId);
    if (!p) return;
    updatePorta(portaId, {
      novasFotos: p.novasFotos.filter((_, i) => i !== idx),
      legendasNovas: p.legendasNovas.filter((_, i) => i !== idx),
    });
  };

  const validarPorta = (p: PortaForm): string | null => {
    if (!p.largura_vao || !p.altura_vao) return 'Largura e altura do vão são obrigatórias';
    if (!p.largura_total || !p.altura_total) return 'Largura e altura total são obrigatórias';
    {
      const lv = Number(p.largura_vao);
      const av = Number(p.altura_vao);
      const lt = Number(p.largura_total);
      const at = Number(p.altura_total);
      if (lt < lv) return 'Largura final não pode ser menor que a largura da porta';
      if (at < av) return 'Altura final não pode ser menor que a altura da porta';
      if ((p.posicao_testeira === 'fora' || p.posicao_testeira === 'entre') && at <= av) {
        return 'Com testeira FORA DO VÃO ou ENTRE O VÃO, a altura final deve ser MAIOR que a altura da porta';
      }
      if ((p.posicao_guia === 'fora' || p.posicao_guia === 'misto') && lt <= lv) {
        return 'Com guia FORA DO VÃO ou MISTO, a largura final deve ser MAIOR que a largura da porta';
      }
    }
    if (!p.meia_cana_tipo) return 'Meia cana é obrigatória';
    if (p.cores.length === 0) return 'Selecione pelo menos uma cor de pintura';
    if (!p.caixa_motor) return 'Tipo de caixa é obrigatório';
    if (!p.guia_tamanho) return 'Tamanho do guia é obrigatório';
    if (!p.posicao_porta) return 'Posicionamento da porta é obrigatório';
    if (!p.posicao_motor) return 'Posicionamento do motor é obrigatório';
    if (!p.posicao_guia) return 'Posicionamento do guia é obrigatório';
    if (!p.posicao_testeira) return 'Posicionamento da testeira é obrigatório';
    if (!p.tipo_guia) return 'Tipo do guia é obrigatório';
    if (!p.dificuldade_instalacao) return 'Dificuldade da instalação é obrigatória';
    if (p.tem_tiras_frontais && !p.qtd_tiras_frontais) return 'Informe a quantidade de tiras frontais';
    if (p.tem_controle_adicional && !p.qtd_controle_adicional) return 'Informe a quantidade de controles adicionais';
    if (p.tem_tubo_afastamento && !p.distancia_tubo_cm) return 'Informe a distância do tubo de afastamento';
    if (p.acessorios.length === 0) return 'Selecione pelo menos um acessório';
    if (p.fotos.length === 0 && p.novasFotos.length === 0) return 'Adicione pelo menos uma foto da porta';
    return null;
  };
  const erroFormulario = useMemo(() => {
    if (portas.length === 0) return 'Adicione pelo menos uma porta';
    for (let i = 0; i < portas.length; i++) {
      const erro = validarPorta(portas[i]);
      if (erro) return `Porta ${i + 1}: ${erro}`;
    }
    return null;
  }, [portas, obsGerais]);

  const concluirMut = useMutation({
    mutationFn: async () => {
      if (portas.length === 0) throw new Error('Adicione pelo menos uma porta');
      for (let i = 0; i < portas.length; i++) {
        const erro = validarPorta(portas[i]);
        if (erro) throw new Error(`Porta ${i + 1}: ${erro}`);
      }

      const { data: u } = await supabase.auth.getUser();

      const { data: conclusao, error: cErr } = await supabase
        .from('visitas_tecnicas_conclusoes')
        .upsert([{
          visita_id: visitaId,
          observacoes_gerais: obsGerais || null,
          concluido_por: u.user?.id || null,
        }] as any, { onConflict: 'visita_id' })
        .select()
        .single();
      if (cErr) throw cErr;

      // Remove portas existentes (re-conclusão) para evitar duplicidade
      await supabase.from('visitas_tecnicas_portas').delete().eq('conclusao_id', conclusao.id);

      for (const p of portas) {
        const { data: portaRow, error: pErr } = await supabase
          .from('visitas_tecnicas_portas')
          .insert([{
            conclusao_id: conclusao.id,
            ordem: p.ordem,
            largura_vao: p.largura_vao ? Number(p.largura_vao) : null,
            altura_vao: p.altura_vao ? Number(p.altura_vao) : null,
            largura_total: p.largura_total ? Number(p.largura_total) : null,
            altura_total: p.altura_total ? Number(p.altura_total) : null,
            meia_cana_tipo: p.meia_cana_tipo || null,
            cores: p.cores,
            tem_tiras_frontais: p.tem_tiras_frontais,
            qtd_tiras_frontais: p.qtd_tiras_frontais ? Number(p.qtd_tiras_frontais) : null,
            tem_controle_adicional: p.tem_controle_adicional,
            qtd_controle_adicional: p.qtd_controle_adicional ? Number(p.qtd_controle_adicional) : null,
            caixa_motor: p.caixa_motor || null,
            guia_tamanho: p.guia_tamanho || null,
            acessorios: p.acessorios,
            posicao_porta: p.posicao_porta || null,
            posicao_motor: p.posicao_motor || null,
            posicao_guia: p.posicao_guia || null,
            posicao_testeira: p.posicao_testeira || null,
            tipo_guia: p.tipo_guia || null,
            dificuldade_instalacao: p.dificuldade_instalacao || null,
            tem_tubo_afastamento: p.tem_tubo_afastamento,
            distancia_tubo_cm: p.distancia_tubo_cm ? Number(p.distancia_tubo_cm) : null,
            tem_tubo_tiras_frontais: p.tem_tubo_tiras_frontais,
            retirar_portao_local: p.retirar_portao_local,
            observacoes: p.observacoes || null,
          }] as any)
          .select()
          .single();
        if (pErr) throw pErr;

        // Upload novas fotos
        for (let i = 0; i < p.novasFotos.length; i++) {
          const file = p.novasFotos[i];
          const fname = `${conclusao.id}/${portaRow.id}/${Date.now()}-${i}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
          const { error: upErr } = await supabase.storage.from('visitas-tecnicas-fotos').upload(fname, file);
          if (upErr) throw upErr;
          const { data: pub } = supabase.storage.from('visitas-tecnicas-fotos').getPublicUrl(fname);
          await supabase.from('visitas_tecnicas_portas_fotos').insert([{
            porta_id: portaRow.id, url: pub.publicUrl, legenda: p.legendasNovas[i] || null, ordem: i,
          }] as any);
        }
      }

      // marcar visita como concluída
      await supabase
        .from('visitas_tecnicas_agendadas')
        .update({ status: 'concluida', duracao_medicao_segundos: segundosDecorridos } as any)
        .eq('id', visitaId);
      await logVisitaHistorico({
        visita_id: visitaId!,
        acao: 'concluida',
        titulo: visita?.titulo,
        data_visita: visita?.data_visita,
        cidade: visita?.cidade,
        estado: visita?.estado,
        usuario_id: userRole?.user_id || null,
        usuario_nome: userRole?.nome || null,
      });
    },
    onSuccess: () => {
      toast.success('Visita técnica concluída');
      qc.invalidateQueries({ queryKey: ['visitas-agendadas'] });
      qc.invalidateQueries({ queryKey: ['visita-conclusao', visitaId] });
      qc.invalidateQueries({ queryKey: ['visitas-historico'] });
      navigate('/vendas/visitas-tecnicas');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao concluir'),
  });

  const concluirStatusMut = useMutation({
    mutationFn: async () => {
      await supabase
        .from('visitas_tecnicas_agendadas')
        .update({ status: 'concluida' } as any)
        .eq('id', visitaId);
      await logVisitaHistorico({
        visita_id: visitaId!,
        acao: 'concluida',
        titulo: visita?.titulo,
        data_visita: visita?.data_visita,
        cidade: visita?.cidade,
        estado: visita?.estado,
        usuario_id: userRole?.user_id || null,
        usuario_nome: userRole?.nome || null,
      });
    },
    onSuccess: () => {
      toast.success('Visita técnica concluída');
      qc.invalidateQueries({ queryKey: ['visitas-agendadas'] });
      qc.invalidateQueries({ queryKey: ['visita-agendada', visitaId] });
      qc.invalidateQueries({ queryKey: ['visitas-historico'] });
      navigate('/vendas/visitas-tecnicas');
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao concluir'),
  });

  if (loadingVisita) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center overflow-hidden relative">
      <DelayedParticles />
      <AnimatedBreadcrumb
        items={[
          { label: 'Home', path: '/home' },
          { label: 'Vendas', path: '/vendas' },
          { label: 'Visitas Técnicas', path: '/vendas/visitas-tecnicas' },
          { label: readOnly ? 'Ficha' : 'Concluir' },
        ]}
        mounted={mounted}
      />
      <button
        onClick={() => navigate('/vendas/visitas-tecnicas')}
        className="fixed top-4 left-4 z-50 p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-all duration-300"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateX(0)' : 'translateX(-20px)',
          transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 100ms',
        }}
      >
        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/20">
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </div>
      </button>

      <div
        className="relative z-10 w-full max-w-4xl px-4 pt-20 pb-10"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 300ms',
        }}
      >
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-xl font-semibold text-white">
              {readOnly ? 'Ficha da visita técnica' : 'Concluir visita técnica'}
            </h1>
            {visita?.status && (
              <span className={cn(
                "px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-medium border",
                visita.status === 'concluida' && "bg-emerald-500/15 text-emerald-200 border-emerald-400/30",
                visita.status === 'realizada' && "bg-blue-500/15 text-blue-200 border-blue-400/30",
                visita.status === 'agendada' && "bg-amber-500/15 text-amber-200 border-amber-400/30",
                visita.status === 'cancelada' && "bg-red-500/15 text-red-200 border-red-400/30",
                !['concluida','realizada','agendada','cancelada'].includes(visita.status) && "bg-white/10 text-white/70 border-white/20"
              )}>
                {visita.status === 'concluida' ? 'Concluída' : visita.status === 'realizada' ? 'Realizada' : visita.status === 'agendada' ? 'Agendada' : visita.status === 'cancelada' ? 'Cancelada' : visita.status}
              </span>
            )}
          </div>
          {visita && (
            <p className="text-white/40 text-sm mt-1">
              {visita.titulo} — {visita.cidade ? `${visita.cidade}/${visita.estado}` : ''} —{' '}
              {visita.data_visita?.slice(0, 10)} {visita.hora_inicio?.slice(0, 5)}
            </p>
          )}
          {iniciado && !readOnly && !existente && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-400/20">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
              </span>
              <Clock className={`w-4 h-4 text-blue-300 ${isRunning ? 'animate-pulse' : ''}`} />
              <span className="font-mono text-base text-blue-200">{formatCronometro(segundosDecorridos)}</span>
              <span className="text-[10px] uppercase tracking-wider text-white/40">Medição em andamento</span>
            </div>
          )}
          {readOnly && visita?.duracao_medicao_segundos != null && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
              <Clock className="w-4 h-4 text-white/60" />
              <span className="font-mono text-sm text-white/80">{formatCronometro(visita.duracao_medicao_segundos)}</span>
              <span className="text-[10px] uppercase tracking-wider text-white/40">Duração da medição</span>
            </div>
          )}
          {readOnly && existente && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                onClick={iniciarEdicao}
              >
                <Pencil className="w-4 h-4 mr-2" /> Editar conclusão
              </Button>
              {visita?.status !== 'concluida' && (
                <Button
                  className="bg-gradient-to-br from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 text-white shadow-lg shadow-blue-500/30"
                  onClick={() => concluirStatusMut.mutate()}
                  disabled={concluirStatusMut.isPending}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Concluir visita
                </Button>
              )}
            </div>
          )}
        </div>

        {!iniciado && !readOnly ? (
          <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-10 flex flex-col items-center justify-center text-center">
            <div className="p-4 rounded-full bg-blue-500/10 border border-blue-400/20 mb-5">
              <Clock className="w-10 h-10 text-blue-300" strokeWidth={1.5} />
            </div>
            <h2 className="text-lg font-medium text-white mb-2">Pronto para iniciar a medição?</h2>
            <p className="text-sm text-white/50 mb-6 max-w-md">
              Ao clicar em iniciar, o cronômetro começa a contar e o formulário de medição será liberado.
            </p>
            <Button
              size="lg"
              className="bg-gradient-to-br from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 text-white shadow-lg shadow-blue-500/30 h-12 px-8"
              onClick={() => { startCron(); setIniciado(true); }}
            >
              <Play className="w-5 h-5 mr-2" /> Iniciar Medição
            </Button>
          </div>
        ) : (
        <div className={cn(
          "space-y-4 rounded-2xl border transition-all duration-500",
          iniciado && !readOnly
            ? "bg-blue-500/[0.03] border-blue-400/30 shadow-[0_0_40px_-15px_rgba(59,130,246,0.2)] p-4"
            : "border-transparent bg-transparent p-0"
        )}>
          {readOnly && (
            <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-4">
              <h2 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <Upload className="w-4 h-4 text-blue-300" /> Mídias da visita
              </h2>
              {portas.every(p => p.fotos.length === 0) ? (
                <p className="text-white/40 text-sm">Nenhuma mídia registrada</p>
              ) : (
                <div className="space-y-4">
                  {portas.filter(p => p.fotos.length > 0).map((p, idx) => (
                    <div key={p.id}>
                      <h3 className="text-xs uppercase tracking-wider text-white/50 font-medium mb-2">Porta {idx + 1}</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {p.fotos.map((f, i) => (
                          <button
                            key={f.id}
                            onClick={() => setLightbox({ open: true, url: f.url, legenda: f.legenda || `Foto ${i + 1}` })}
                            className="relative rounded-md overflow-hidden bg-white/5 border border-white/10 hover:border-blue-400/50 transition-colors text-left"
                          >
                            <img src={f.url} alt={f.legenda} className="w-full h-24 object-cover" />
                            {f.legenda && <div className="text-[10px] text-white/70 p-1 bg-black/40 truncate">{f.legenda}</div>}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {portas.map((p, idx) => (
            <PortaCard
              key={p.id}
              porta={p}
              idx={idx}
              cores={cores}
              acessorios={acessoriosLista}
              readOnly={readOnly}
              onUpdate={(patch) => updatePorta(p.id, patch)}
              onRemove={() => removerPorta(p.id)}
              onToggleCor={(c) => toggleCor(p.id, c)}
              onToggleAcessorio={(it) => toggleAcessorio(p.id, it)}
              onSetAcessorioQtd={(custoId, qtd) => setAcessorioQtd(p.id, custoId, qtd)}
              onFilesAdded={(files) => onFilesAdded(p.id, files)}
              onRemoverNovaFoto={(i) => removerNovaFoto(p.id, i)}
              onLegendaNova={(i, v) => {
                const cur = portas.find(x => x.id === p.id)!;
                updatePorta(p.id, { legendasNovas: cur.legendasNovas.map((l, k) => k === i ? v : l) });
              }}
              onFotoClick={(url, legenda) => setLightbox({ open: true, url, legenda })}
            />
          ))}

          {!readOnly && (
            <Button
              variant="outline"
              className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10"
              onClick={adicionarPorta}
            >
              <Plus className="w-4 h-4 mr-2" /> Adicionar porta
            </Button>
          )}

          <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 p-4">
            <label className={labelCls}>Observações gerais da visita</label>
            <Textarea
              className={inputCls}
              rows={3}
              value={obsGerais}
              onChange={e => setObsGerais(e.target.value)}
              disabled={readOnly}
            />
          </div>

          {!readOnly && (
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                className="text-white/70 hover:text-white hover:bg-white/10"
                onClick={() => existente ? cancelarEdicao() : navigate('/vendas/visitas-tecnicas')}
              >
                {existente ? 'Cancelar edição' : 'Cancelar'}
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      className="bg-gradient-to-br from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 text-white shadow-lg shadow-blue-500/30"
                      onClick={() => concluirMut.mutate()}
                      disabled={concluirMut.isPending || !!erroFormulario}
                    >
                      {concluirMut.isPending ? 'Concluindo...' : 'Concluir visita'}
                    </Button>
                  </span>
                </TooltipTrigger>
                {erroFormulario && (
                  <TooltipContent>
                    <p className="text-xs max-w-xs">{erroFormulario}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </div>
          )}
        </div>
        )}

        <Dialog open={lightbox.open} onOpenChange={open => setLightbox(prev => ({ ...prev, open }))}>
          <DialogContent className="max-w-4xl bg-black/90 backdrop-blur-xl border-white/10 p-1">
            <DialogHeader>
              <DialogTitle className="text-white text-sm">{lightbox.legenda}</DialogTitle>
            </DialogHeader>
            <img src={lightbox.url} alt={lightbox.legenda} className="w-full max-h-[80vh] object-contain rounded-md" />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

interface PortaCardProps {
  porta: PortaForm;
  idx: number;
  cores: Cor[];
  acessorios: CustoItem[];
  readOnly: boolean;
  onUpdate: (patch: Partial<PortaForm>) => void;
  onRemove: () => void;
  onToggleCor: (cor: Cor) => void;
  onToggleAcessorio: (item: CustoItem) => void;
  onSetAcessorioQtd: (custoId: string, qtd: number) => void;
  onFilesAdded: (files: FileList | null) => void;
  onRemoverNovaFoto: (i: number) => void;
  onLegendaNova: (i: number, v: string) => void;
  onFotoClick?: (url: string, legenda: string) => void;
}

function PortaCard({
  porta: p, idx, cores, acessorios, readOnly,
  onUpdate, onRemove, onToggleCor, onToggleAcessorio, onSetAcessorioQtd,
  onFilesAdded, onRemoverNovaFoto, onLegendaNova, onFotoClick,
}: PortaCardProps) {
  const resumo = useMemo(() => {
    const dims = (p.largura_total && p.altura_total) ? `${p.largura_total}m × ${p.altura_total}m` : 'sem medidas';
    return dims;
  }, [p.largura_total, p.altura_total]);

  return (
    <div className="rounded-xl bg-white/5 backdrop-blur-xl border border-white/10">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <button
          className="flex items-center gap-2 text-white hover:text-blue-300 transition-colors"
          onClick={() => onUpdate({ expandido: !p.expandido })}
        >
          {p.expandido ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          <span className="font-medium">Porta {idx + 1}</span>
          <span className="text-white/40 text-sm">— {resumo}</span>
        </button>
        {!readOnly && (
          <button
            className="p-1.5 rounded-lg text-red-300 hover:bg-red-500/20"
            onClick={onRemove}
            title="Remover porta"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {p.expandido && (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Medidas */}
          <div><label className={labelCls}>Largura do vão (m) *</label>
            <Input type="number" step="0.01" className={inputCls} value={p.largura_vao} onChange={e => onUpdate({ largura_vao: e.target.value })} disabled={readOnly} />
          </div>
          <div><label className={labelCls}>Altura do vão (m) *</label>
            <Input type="number" step="0.01" className={inputCls} value={p.altura_vao} onChange={e => onUpdate({ altura_vao: e.target.value })} disabled={readOnly} />
          </div>
          <div><label className={labelCls}>Largura total (m) *</label>
            <Input type="number" step="0.01" className={inputCls} value={p.largura_total} onChange={e => onUpdate({ largura_total: e.target.value })} disabled={readOnly} />
          </div>
          <div><label className={labelCls}>Altura total (m) *</label>
            <Input type="number" step="0.01" className={inputCls} value={p.altura_total} onChange={e => onUpdate({ altura_total: e.target.value })} disabled={readOnly} />
          </div>

          {/* Meia cana */}
          <div><label className={labelCls}>Meia cana *</label>
            <Select value={p.meia_cana_tipo || ''} onValueChange={v => onUpdate({ meia_cana_tipo: v })} disabled={readOnly}>
              <SelectTrigger className={selectTriggerCls}><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent className={selectContentCls}>
                <SelectItem value="lisa">Lisa</SelectItem>
                <SelectItem value="perfurada">Perfurada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Pintura - cores */}
          <div className="md:col-span-2">
            <label className={labelCls}>Pintura — Cores *</label>
            {p.cores.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {p.cores.map(cor => (
                  <span
                    key={cor.id}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/20 border border-blue-400/40 text-white/90"
                  >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cor.codigo_hex }} />
                    {cor.nome}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-1 flex flex-wrap gap-2 p-2 rounded-md bg-white/[0.02] border border-white/10 max-h-40 overflow-y-auto">
              {cores.length === 0 && <span className="text-white/40 text-xs">Nenhuma cor cadastrada</span>}
              {cores.map(c => {
                const sel = !!p.cores.find(x => x.id === c.id);
                const temSelecao = p.cores.length > 0;
                return (
                  <button
                    key={c.id}
                    onClick={() => !readOnly && onToggleCor(c)}
                    disabled={readOnly}
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs border transition-colors",
                      sel
                        ? "bg-blue-500/30 border-blue-400/50 text-white"
                        : temSelecao
                          ? "bg-black/20 border-white/5 text-white/40 hover:bg-white/5"
                          : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                    )}
                  >
                    <span className={cn("w-3 h-3 rounded-full border", sel ? "border-white/40" : "border-white/10")} style={{ backgroundColor: c.codigo_hex }} />
                    {c.nome}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tiras frontais */}
          <div className="flex items-center justify-between p-3 rounded-md bg-white/[0.02] border border-white/10">
            <label className="text-white text-sm">Tiras frontais</label>
            <Switch checked={p.tem_tiras_frontais} onCheckedChange={v => onUpdate({ tem_tiras_frontais: v })} disabled={readOnly} />
          </div>
          {p.tem_tiras_frontais && (
            <div><label className={labelCls}>Qtd tiras frontais *</label>
              <Input type="number" className={inputCls} value={p.qtd_tiras_frontais} onChange={e => onUpdate({ qtd_tiras_frontais: e.target.value })} disabled={readOnly} />
            </div>
          )}

          {/* Controle adicional */}
          <div className="flex items-center justify-between p-3 rounded-md bg-white/[0.02] border border-white/10">
            <label className="text-white text-sm">Controle adicional</label>
            <Switch checked={p.tem_controle_adicional} onCheckedChange={v => onUpdate({ tem_controle_adicional: v })} disabled={readOnly} />
          </div>
          {p.tem_controle_adicional && (
            <div><label className={labelCls}>Qtd controles *</label>
              <Input type="number" className={inputCls} value={p.qtd_controle_adicional} onChange={e => onUpdate({ qtd_controle_adicional: e.target.value })} disabled={readOnly} />
            </div>
          )}

          {/* Caixa motor + Guia */}
          <div><label className={labelCls}>Tipo de caixa *</label>
            <Select value={p.caixa_motor || ''} onValueChange={v => onUpdate({ caixa_motor: v })} disabled={readOnly}>
              <SelectTrigger className={selectTriggerCls}><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent className={selectContentCls}>
                <SelectItem value="somente_motor">Caixa somente no motor</SelectItem>
                <SelectItem value="total">Caixa total</SelectItem>
                <SelectItem value="caixa_l">Caixa L</SelectItem>
                <SelectItem value="sem_caixa">Sem caixa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><label className={labelCls}>Tamanho do guia *</label>
            <Select value={p.guia_tamanho || ''} onValueChange={v => onUpdate({ guia_tamanho: v })} disabled={readOnly}>
              <SelectTrigger className={selectTriggerCls}><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent className={selectContentCls}>
                <SelectItem value="M">Guia M</SelectItem>
                <SelectItem value="G">Guia G</SelectItem>
              </SelectContent>
            </Select>
          </div>


          {/* Posicionamentos */}
          <div><label className={labelCls}>Posicionamento da porta *</label>
            <Select value={p.posicao_porta || ''} onValueChange={v => onUpdate({ posicao_porta: v })} disabled={readOnly}>
              <SelectTrigger className={selectTriggerCls}><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent className={selectContentCls}>
                <SelectItem value="interno">Interno</SelectItem>
                <SelectItem value="externo">Externo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><label className={labelCls}>Posicionamento do motor *</label>
            <Select value={p.posicao_motor || ''} onValueChange={v => onUpdate({ posicao_motor: v })} disabled={readOnly}>
              <SelectTrigger className={selectTriggerCls}><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent className={selectContentCls}>
                <SelectItem value="direito">Lado direito</SelectItem>
                <SelectItem value="esquerdo">Lado esquerdo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><label className={labelCls}>Posicionamento do guia *</label>
            <Select value={p.posicao_guia || ''} onValueChange={v => onUpdate({ posicao_guia: v })} disabled={readOnly}>
              <SelectTrigger className={selectTriggerCls}><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent className={selectContentCls}>
                <SelectItem value="dentro_vao">Dentro do vão</SelectItem>
                <SelectItem value="fora_vao">Fora do vão</SelectItem>
                <SelectItem value="misto">Misto</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><label className={labelCls}>POSICIONAMENTO DO ROLO/TESTEIRA*</label>
            <Select value={p.posicao_testeira || ''} onValueChange={v => onUpdate({ posicao_testeira: v })} disabled={readOnly}>
              <SelectTrigger className={selectTriggerCls}><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent className={selectContentCls}>
                <SelectItem value="fora">FORA DO VÃO</SelectItem>
                <SelectItem value="dentro">DENTRO DO VÃO</SelectItem>
                <SelectItem value="entre">ENTRE O VÃO: Pegando espaço do vão livre</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><label className={labelCls}>Tipo do guia *</label>
            <Select value={p.tipo_guia || ''} onValueChange={v => onUpdate({ tipo_guia: v })} disabled={readOnly}>
              <SelectTrigger className={selectTriggerCls}><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent className={selectContentCls}>
                <SelectItem value="aparente">Aparente</SelectItem>
                <SelectItem value="escondido">Escondido</SelectItem>
                <SelectItem value="misto">Misto</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><label className={labelCls}>Dificuldade da instalação *</label>
            <Select value={p.dificuldade_instalacao || ''} onValueChange={v => onUpdate({ dificuldade_instalacao: v })} disabled={readOnly}>
              <SelectTrigger className={selectTriggerCls}><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent className={selectContentCls}>
                <SelectItem value="simples">Simples</SelectItem>
                <SelectItem value="erguer_no_rolo">Erguer porta no rolo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tubo afastamento */}
          <div className="flex items-center justify-between p-3 rounded-md bg-white/[0.02] border border-white/10">
            <label className="text-white text-sm">Tubo de afastamento</label>
            <Switch checked={p.tem_tubo_afastamento} onCheckedChange={v => onUpdate({ tem_tubo_afastamento: v })} disabled={readOnly} />
          </div>
          {p.tem_tubo_afastamento && (
            <div><label className={labelCls}>Distância (cm) *</label>
              <Input type="number" step="0.1" className={inputCls} value={p.distancia_tubo_cm} onChange={e => onUpdate({ distancia_tubo_cm: e.target.value })} disabled={readOnly} />
            </div>
          )}

          {/* Tubo tiras frontais */}
          <div className="flex items-center justify-between p-3 rounded-md bg-white/[0.02] border border-white/10">
            <label className="text-white text-sm">Tubo p/ tiras frontais</label>
            <Switch checked={p.tem_tubo_tiras_frontais} onCheckedChange={v => onUpdate({ tem_tubo_tiras_frontais: v })} disabled={readOnly} />
          </div>
          <div className="flex items-center justify-between p-3 rounded-md bg-white/[0.02] border border-white/10">
            <label className="text-white text-sm">Retirar portão existente no local</label>
            <Switch checked={p.retirar_portao_local} onCheckedChange={v => onUpdate({ retirar_portao_local: v })} disabled={readOnly} />
          </div>

          {/* Acessórios */}
          <div className="md:col-span-2">
            <label className={labelCls}>Acessórios inclusos *</label>
            <div className="mt-1 flex flex-wrap gap-2 p-2 rounded-md bg-white/[0.02] border border-white/10 max-h-40 overflow-y-auto">
              {acessorios.length === 0 && <span className="text-white/40 text-xs">Nenhum acessório cadastrado</span>}
              {acessorios.map(it => {
                const sel = !!p.acessorios.find(a => a.custo_item_id === it.id);
                return (
                  <button
                    key={it.id}
                    onClick={() => !readOnly && onToggleAcessorio(it)}
                    disabled={readOnly}
                    className={`px-2 py-1 rounded-md text-xs border transition-colors ${
                      sel ? 'bg-blue-500/30 border-blue-400/50 text-white' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    {it.descricao}
                  </button>
                );
              })}
            </div>
            {p.acessorios.length > 0 && (
              <div className="mt-2 space-y-1">
                {p.acessorios.map(a => (
                  <div key={a.custo_item_id} className="flex items-center justify-between gap-2 p-2 rounded-md bg-white/[0.02] border border-white/10">
                    <span className="text-white/80 text-xs flex-1">{a.nome}</span>
                    <Input
                      type="number" min={1}
                      className="w-20 h-8 bg-white/5 border-white/10 text-white text-xs"
                      value={a.quantidade}
                      onChange={e => onSetAcessorioQtd(a.custo_item_id, Number(e.target.value) || 1)}
                      disabled={readOnly}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Observações */}
          <div className="md:col-span-2">
            <label className={labelCls}>Observações da porta</label>
            <Textarea className={inputCls} rows={2} value={p.observacoes} onChange={e => onUpdate({ observacoes: e.target.value })} disabled={readOnly} />
          </div>

          {/* Fotos */}
          <div className="md:col-span-2">
            <label className={labelCls}>Fotos *</label>
            {(p.fotos.length > 0 || p.novasFotos.length > 0) && (
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                {p.fotos.map(f => (
                  <button
                    key={f.id}
                    onClick={() => onFotoClick?.(f.url, f.legenda || '')}
                    className="relative rounded-md overflow-hidden bg-white/5 border border-white/10 hover:border-blue-400/50 transition-colors text-left"
                  >
                    <img src={f.url} alt={f.legenda} className="w-full h-32 object-cover" />
                    {f.legenda && <div className="text-[10px] text-white/70 p-1 bg-black/40">{f.legenda}</div>}
                  </button>
                ))}
                {p.novasFotos.map((file, i) => (
                  <div key={i} className="relative rounded-md overflow-hidden bg-white/5 border border-white/10">
                    <img src={URL.createObjectURL(file)} alt="" className="w-full h-32 object-cover" />
                    {!readOnly && (
                      <button
                        className="absolute top-1 right-1 p-1 rounded-full bg-red-500/80 hover:bg-red-500 text-white"
                        onClick={() => onRemoverNovaFoto(i)}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                    <Input
                      placeholder="Legenda"
                      className="rounded-none h-7 text-xs bg-black/40 border-0 border-t border-white/10 text-white"
                      value={p.legendasNovas[i] || ''}
                      onChange={e => onLegendaNova(i, e.target.value)}
                      disabled={readOnly}
                    />
                  </div>
                ))}
              </div>
            )}
            {!readOnly && (p.fotos.length + p.novasFotos.length) < 10 && (
              <label className="mt-2 inline-flex items-center gap-2 px-3 py-2 rounded-md bg-white/5 border border-white/10 text-white/70 cursor-pointer hover:bg-white/10 text-sm">
                <Upload className="w-4 h-4" /> Adicionar fotos
                <input type="file" multiple accept="image/*" className="hidden" onChange={e => onFilesAdded(e.target.files)} />
              </label>
            )}
          </div>
        </div>
      )}
    </div>
  );
}