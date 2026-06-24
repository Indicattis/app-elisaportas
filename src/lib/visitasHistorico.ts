import { supabase } from '@/integrations/supabase/client';

export type VisitaHistAcao = 'criada' | 'alterada' | 'excluida' | 'concluida' | 'reagendada';

export interface LogVisitaParams {
  visita_id: string | null;
  acao: VisitaHistAcao;
  titulo?: string | null;
  data_visita?: string | null;
  data_anterior?: string | null;
  responsavel_nome?: string | null;
  cidade?: string | null;
  estado?: string | null;
  detalhes?: Record<string, unknown> | null;
  usuario_id?: string | null;
  usuario_nome?: string | null;
}

function ymd(d?: string | null) {
  if (!d) return null;
  return d.slice(0, 10);
}

export async function logVisitaHistorico(p: LogVisitaParams) {
  try {
    await supabase.from('visitas_tecnicas_historico' as any).insert({
      visita_id: p.visita_id,
      acao: p.acao,
      titulo: p.titulo ?? null,
      data_visita: ymd(p.data_visita),
      data_anterior: ymd(p.data_anterior),
      responsavel_nome: p.responsavel_nome ?? null,
      cidade: p.cidade ?? null,
      estado: p.estado ?? null,
      detalhes: (p.detalhes ?? null) as any,
      usuario_id: p.usuario_id ?? null,
      usuario_nome: p.usuario_nome ?? null,
    });
  } catch (e) {
    console.error('[visitasHistorico] erro ao registrar evento', e);
  }
}

export function diffVisita(antes: Record<string, any>, depois: Record<string, any>): Record<string, { de: any; para: any }> {
  const campos = ['titulo','tipo','data_visita','hora_inicio','responsavel_id','telefone_contato','cep','endereco','numero','complemento','bairro','cidade','estado','observacoes'];
  const diff: Record<string, { de: any; para: any }> = {};
  for (const k of campos) {
    let a = antes?.[k] ?? null;
    let b = depois?.[k] ?? null;
    if (k === 'data_visita') { a = ymd(a); b = ymd(b); }
    if ((a ?? '') !== (b ?? '')) diff[k] = { de: a, para: b };
  }
  return diff;
}