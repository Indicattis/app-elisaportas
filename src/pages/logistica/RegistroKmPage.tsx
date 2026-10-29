import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Pencil, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { MinimalistLayout } from '@/components/MinimalistLayout';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const db = supabase as any;

type Viagem = { id: string; motorista_id: string; cidade: string; data: string | null; km: number | null; valor_km: number | null; valor_viagem: number; status: string; observacao: string | null };
type Adiant = { id: string; motorista_id: string; data: string | null; valor: number; observacao: string | null };

const fmtData = (d: string | null) => (d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—');
const num = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')));

export default function RegistroKmPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [motoristaId, setMotoristaId] = useState<string>('');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [vForm, setVForm] = useState<any | null>(null);
  const [aForm, setAForm] = useState<any | null>(null);

  const { data: motoristas = [] } = useQuery({
    queryKey: ['motoristas_frete'],
    queryFn: async () => (await db.from('motoristas_frete').select('*').order('nome')).data || [],
  });
  const mid = motoristaId || motoristas[0]?.id || '';
  const motorista = motoristas.find((m: any) => m.id === mid);

  const { data: viagens = [] } = useQuery<Viagem[]>({
    queryKey: ['registro_km_viagens', mid], enabled: !!mid,
    queryFn: async () => (await db.from('registro_km_viagens').select('*').eq('motorista_id', mid).order('data', { nullsFirst: false }).order('created_at')).data || [],
  });
  const { data: adiant = [] } = useQuery<Adiant[]>({
    queryKey: ['registro_km_adiantamentos', mid], enabled: !!mid,
    queryFn: async () => (await db.from('registro_km_adiantamentos').select('*').eq('motorista_id', mid).order('data').order('created_at')).data || [],
  });

  const inRange = (d: string | null) => (!de && !ate) || (!!d && (!de || d >= de) && (!ate || d <= ate));
  const vf = useMemo(() => viagens.filter((v) => inRange(v.data)), [viagens, de, ate]);
  const af = useMemo(() => adiant.filter((a) => inRange(a.data)), [adiant, de, ate]);
  const totalV = vf.reduce((s, v) => s + Number(v.valor_viagem || 0), 0);
  const totalA = af.reduce((s, a) => s + Number(a.valor || 0), 0);
  const saldo = totalV - totalA;

  const refresh = () => { qc.invalidateQueries({ queryKey: ['registro_km_viagens'] }); qc.invalidateQueries({ queryKey: ['registro_km_adiantamentos'] }); };

  const saveV = useMutation({
    mutationFn: async (f: any) => {
      const km = num(String(f.km ?? '')); const vk = num(String(f.valor_km ?? ''));
      const vv = num(String(f.valor_viagem ?? '')) ?? (km != null && vk != null ? km * vk : 0);
      const row = { motorista_id: mid, cidade: f.cidade, data: f.data || null, km, valor_km: vk, valor_viagem: vv, status: f.status || 'pendente', observacao: f.observacao || null };
      const r = f.id ? await db.from('registro_km_viagens').update(row).eq('id', f.id) : await db.from('registro_km_viagens').insert(row);
      if (r.error) throw r.error;
    },
    onSuccess: () => { setVForm(null); refresh(); toast({ title: 'Viagem salva' }); },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
  const saveA = useMutation({
    mutationFn: async (f: any) => {
      const row = { motorista_id: mid, data: f.data || null, valor: num(String(f.valor ?? '')) ?? 0, observacao: f.observacao || null };
      const r = f.id ? await db.from('registro_km_adiantamentos').update(row).eq('id', f.id) : await db.from('registro_km_adiantamentos').insert(row);
      if (r.error) throw r.error;
    },
    onSuccess: () => { setAForm(null); refresh(); toast({ title: 'Adiantamento salvo' }); },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });
  const del = async (table: string, id: string) => {
    if (!confirm('Excluir este registro?')) return;
    const { error } = await db.from(table).delete().eq('id', id);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' }); else refresh();
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14); doc.text(`Registro de KM — ${motorista?.nome || ''}`, 12, 14);
    doc.setFontSize(9); doc.text(`Pix: ${motorista?.pix || '-'}${motorista?.pix_secundario ? ` · ${motorista.pix_secundario_nome}: ${motorista.pix_secundario}` : ''}`, 12, 20);
    autoTable(doc, { startY: 25, margin: { left: 12, right: 150 }, head: [['Cidade', 'Data', 'KM', 'R$/KM', 'Valor', 'Status']],
      body: vf.map((v) => [v.cidade, fmtData(v.data), v.km ?? '', v.valor_km ?? '', formatCurrency(v.valor_viagem), v.status]),
      foot: [['Total', '', '', '', formatCurrency(totalV), '']], styles: { fontSize: 7 }, headStyles: { fillColor: [25, 118, 210] }, footStyles: { fillColor: [25, 118, 210] } });
    autoTable(doc, { startY: 25, margin: { left: 160, right: 12 }, head: [['Data', 'Adiantamento', 'Obs.']],
      body: af.map((a) => [fmtData(a.data), formatCurrency(a.valor), a.observacao || '']),
      foot: [['Total', formatCurrency(totalA), '']], styles: { fontSize: 7 }, headStyles: { fillColor: [25, 118, 210] }, footStyles: { fillColor: [25, 118, 210] } });
    const y = Math.max((doc as any).lastAutoTable.finalY, 30) + 8;
    doc.setFontSize(11); doc.text(`Saldo: ${formatCurrency(saldo)} ${saldo >= 0 ? '(empresa deve pagar o motorista)' : '(motorista em débito com a empresa)'}`, 160, y);
    doc.save(`registro-km-${(motorista?.nome || '').toLowerCase().replace(/\s+/g, '-')}.pdf`);
  };

  const card = 'rounded-xl bg-white/5 backdrop-blur-xl border border-white/10';
  const th = 'text-left text-[11px] uppercase tracking-wide text-white/50 font-medium px-3 py-2';
  const td = 'px-3 py-2 text-sm text-white/80';

  return (
    <MinimalistLayout title="Registro de KM" subtitle="Viagens, adiantamentos e saldo dos motoristas de frete" backPath="/logistica"
      breadcrumbItems={[{ label: 'Home', path: '/home' }, { label: 'Logística', path: '/logistica' }, { label: 'Registro de KM' }]}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px]">
            <label className="text-xs text-white/50">Motorista</label>
            <Select value={mid} onValueChange={setMotoristaId}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{motoristas.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><label className="text-xs text-white/50">De</label><Input type="date" value={de} onChange={(e) => setDe(e.target.value)} className="bg-white/5 border-white/10 text-white" /></div>
          <div><label className="text-xs text-white/50">Até</label><Input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className="bg-white/5 border-white/10 text-white" /></div>
          <Button variant="outline" onClick={exportPDF} className="ml-auto bg-white/5 border-white/10 text-white"><FileDown className="w-4 h-4 mr-2" />Exportar PDF</Button>
        </div>
        {motorista && <p className="text-xs text-white/50">Pix: {motorista.pix}{motorista.pix_secundario && ` · ${motorista.pix_secundario_nome}: ${motorista.pix_secundario}`}</p>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className={`${card} p-4`}><p className="text-xs text-white/50">Total de viagens</p><p className="text-2xl font-semibold text-white">{formatCurrency(totalV)}</p><p className="text-xs text-white/40">{vf.length} viagens</p></div>
          <div className={`${card} p-4`}><p className="text-xs text-white/50">Total de adiantamentos</p><p className="text-2xl font-semibold text-white">{formatCurrency(totalA)}</p><p className="text-xs text-white/40">{af.length} adiantamentos</p></div>
          <div className={`${card} p-4`}><p className="text-xs text-white/50">Saldo</p><p className={`text-2xl font-semibold ${saldo >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(saldo)}</p>
            <p className="text-xs text-white/40">{saldo >= 0 ? 'Positivo: a empresa deve pagar o motorista.' : 'Negativo: o motorista está em débito com a empresa.'}</p></div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className={`${card} xl:col-span-2 overflow-hidden`}>
            <div className="flex items-center justify-between p-3 border-b border-white/10"><h3 className="text-white font-medium">Viagens</h3>
              <Button size="sm" onClick={() => setVForm({ status: 'pendente' })}><Plus className="w-4 h-4 mr-1" />Viagem</Button></div>
            <div className="overflow-auto max-h-[60vh]"><table className="w-full"><thead><tr>{['Cidade', 'Data', 'KM', 'R$/KM', 'Valor', 'Status', ''].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
              <tbody>{vf.map((v) => (
                <tr key={v.id} className="border-t border-white/5 hover:bg-white/5">
                  <td className={td}>{v.cidade}{v.observacao && <span className="block text-[10px] text-white/40">{v.observacao}</span>}</td>
                  <td className={td}>{fmtData(v.data)}</td><td className={td}>{v.km ?? '—'}</td><td className={td}>{v.valor_km ?? '—'}</td>
                  <td className={`${td} font-medium`}>{formatCurrency(v.valor_viagem)}</td>
                  <td className={td}><span className={`text-xs px-2 py-0.5 rounded-full ${v.status === 'pago' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'}`}>{v.status === 'pago' ? 'Pago' : 'Pendente'}</span></td>
                  <td className={`${td} whitespace-nowrap`}><button onClick={() => setVForm({ ...v, km: v.km ?? '', valor_km: v.valor_km ?? '', data: v.data ?? '' })} className="p-1 text-white/50 hover:text-white"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => del('registro_km_viagens', v.id)} className="p-1 text-white/50 hover:text-red-400"><Trash2 className="w-4 h-4" /></button></td>
                </tr>))}</tbody></table></div>
          </div>
          <div className={`${card} overflow-hidden`}>
            <div className="flex items-center justify-between p-3 border-b border-white/10"><h3 className="text-white font-medium">Adiantamentos</h3>
              <Button size="sm" onClick={() => setAForm({})}><Plus className="w-4 h-4 mr-1" />Adiantamento</Button></div>
            <div className="overflow-auto max-h-[60vh]"><table className="w-full"><thead><tr>{['Data', 'Valor', ''].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
              <tbody>{af.map((a) => (
                <tr key={a.id} className="border-t border-white/5 hover:bg-white/5">
                  <td className={td}>{fmtData(a.data)}{a.observacao && <span className="block text-[10px] text-white/40">{a.observacao}</span>}</td>
                  <td className={`${td} font-medium`}>{formatCurrency(a.valor)}</td>
                  <td className={`${td} whitespace-nowrap`}><button onClick={() => setAForm({ ...a, data: a.data ?? '' })} className="p-1 text-white/50 hover:text-white"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => del('registro_km_adiantamentos', a.id)} className="p-1 text-white/50 hover:text-red-400"><Trash2 className="w-4 h-4" /></button></td>
                </tr>))}</tbody></table></div>
          </div>
        </div>
      </div>

      <Dialog open={!!vForm} onOpenChange={(o) => !o && setVForm(null)}>
        <DialogContent><DialogHeader><DialogTitle>{vForm?.id ? 'Editar viagem' : 'Nova viagem'}</DialogTitle></DialogHeader>
          {vForm && <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="text-xs">Cidade *</label><Input value={vForm.cidade || ''} onChange={(e) => setVForm({ ...vForm, cidade: e.target.value })} /></div>
            <div><label className="text-xs">Data</label><Input type="date" value={vForm.data || ''} onChange={(e) => setVForm({ ...vForm, data: e.target.value })} /></div>
            <div><label className="text-xs">Status</label><Select value={vForm.status} onValueChange={(s) => setVForm({ ...vForm, status: s })}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="pendente">Pendente</SelectItem><SelectItem value="pago">Pago</SelectItem></SelectContent></Select></div>
            <div><label className="text-xs">Quilometragem</label><Input value={vForm.km} onChange={(e) => setVForm({ ...vForm, km: e.target.value, valor_viagem: '' })} /></div>
            <div><label className="text-xs">Valor por KM</label><Input value={vForm.valor_km} onChange={(e) => setVForm({ ...vForm, valor_km: e.target.value, valor_viagem: '' })} /></div>
            <div className="col-span-2"><label className="text-xs">Valor da viagem (vazio = KM × valor/KM)</label><Input value={vForm.valor_viagem ?? ''} onChange={(e) => setVForm({ ...vForm, valor_viagem: e.target.value })} /></div>
            <div className="col-span-2"><label className="text-xs">Observação</label><Input value={vForm.observacao || ''} onChange={(e) => setVForm({ ...vForm, observacao: e.target.value })} /></div>
            <Button className="col-span-2" disabled={!vForm.cidade || saveV.isPending} onClick={() => saveV.mutate(vForm)}>Salvar</Button>
          </div>}
        </DialogContent>
      </Dialog>
      <Dialog open={!!aForm} onOpenChange={(o) => !o && setAForm(null)}>
        <DialogContent><DialogHeader><DialogTitle>{aForm?.id ? 'Editar adiantamento' : 'Novo adiantamento'}</DialogTitle></DialogHeader>
          {aForm && <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs">Data</label><Input type="date" value={aForm.data || ''} onChange={(e) => setAForm({ ...aForm, data: e.target.value })} /></div>
            <div><label className="text-xs">Valor *</label><Input value={aForm.valor ?? ''} onChange={(e) => setAForm({ ...aForm, valor: e.target.value })} /></div>
            <div className="col-span-2"><label className="text-xs">Observação</label><Input value={aForm.observacao || ''} onChange={(e) => setAForm({ ...aForm, observacao: e.target.value })} /></div>
            <Button className="col-span-2" disabled={!String(aForm.valor ?? '').trim() || saveA.isPending} onClick={() => saveA.mutate(aForm)}>Salvar</Button>
          </div>}
        </DialogContent>
      </Dialog>
    </MinimalistLayout>
  );
}
