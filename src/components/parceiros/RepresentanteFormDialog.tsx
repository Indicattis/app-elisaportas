import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, UserPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ESTADOS_BRASIL, getCidadesPorEstado } from '@/utils/estadosCidades';
import { ETAPA_ORDER_REPRESENTANTE } from '@/utils/parceiros';

interface RepresentanteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormState {
  nome: string;
  responsavel: string;
  telefone: string;
  whatsapp: string;
  email: string;
  cpf_cnpj: string;
  chave_pix: string;
  estado: string;
  cidade: string;
  cep: string;
}

const INITIAL: FormState = {
  nome: '',
  responsavel: '',
  telefone: '',
  whatsapp: '',
  email: '',
  cpf_cnpj: '',
  chave_pix: '',
  estado: '',
  cidade: '',
  cep: '',
};

export function RepresentanteFormDialog({ open, onOpenChange }: RepresentanteFormDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [cidades, setCidades] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const handleEstadoChange = (sigla: string) => {
    setForm((prev) => ({ ...prev, estado: sigla, cidade: '' }));
    setCidades(getCidadesPorEstado(sigla));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.nome.trim()) e.nome = 'Nome é obrigatório';
    if (!form.responsavel.trim()) e.responsavel = 'Responsável é obrigatório';
    if (!form.telefone.trim()) e.telefone = 'Telefone é obrigatório';
    if (!form.whatsapp.trim()) e.whatsapp = 'WhatsApp é obrigatório';
    if (!form.estado.trim()) e.estado = 'Estado é obrigatório';
    if (!form.cidade.trim()) e.cidade = 'Cidade é obrigatória';
    if (!form.cep.trim()) e.cep = 'CEP é obrigatório';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const reset = () => {
    setForm(INITIAL);
    setCidades([]);
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast({ variant: 'destructive', title: 'Erro de validação', description: 'Preencha todos os campos obrigatórios.' });
      return;
    }
    if (!user?.id) {
      toast({ variant: 'destructive', title: 'Sessão inválida', description: 'Faça login novamente.' });
      return;
    }

    try {
      setSaving(true);

      const { data: adminRow, error: adminErr } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (adminErr) throw adminErr;
      if (!adminRow?.id) {
        throw new Error('Usuário não encontrado no organograma.');
      }

      const { data: inserted, error } = await supabase
        .from('autorizados')
        .insert([{
          nome: form.nome,
          responsavel: form.responsavel,
          telefone: form.telefone,
          whatsapp: form.whatsapp,
          email: form.email || null,
          cpf_cnpj: form.cpf_cnpj || null,
          chave_pix: form.chave_pix || null,
          estado: form.estado,
          cidade: form.cidade,
          cep: form.cep,
          endereco: null,
          regiao: null,
          logo_url: null,
          ativo: true,
          tipo_parceiro: 'representante' as const,
          representante_etapa: ETAPA_ORDER_REPRESENTANTE[0],
          vendedor_id: adminRow.id,
          created_by: adminRow.id,
        }])
        .select('id')
        .single();

      if (error) throw error;

      if (inserted?.id) {
        try {
          await supabase.functions.invoke('geocode-nominatim', {
            body: { id: inserted.id, cidade: form.cidade, estado: form.estado },
          });
        } catch (geoErr) {
          console.warn('Geocode falhou:', geoErr);
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['meus-parceiros'] });
      toast({ title: 'Representante cadastrado', description: 'Ele já aparece na sua lista de parceiros.' });
      reset();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Erro ao cadastrar representante:', err);
      toast({ variant: 'destructive', title: 'Erro ao cadastrar', description: err?.message || 'Tente novamente.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !saving) { reset(); } onOpenChange(o); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-purple-400" />
            Cadastrar Representante
          </DialogTitle>
          <DialogDescription>
            O representante será vinculado a você automaticamente e aparecerá em "Meus Parceiros".
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className={errors.nome ? 'border-red-500' : ''} />
              {errors.nome && <p className="text-xs text-red-500">{errors.nome}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Responsável *</Label>
              <Input value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} className={errors.responsavel ? 'border-red-500' : ''} />
              {errors.responsavel && <p className="text-xs text-red-500">{errors.responsavel}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>

            <div className="space-y-1.5">
              <Label>Telefone *</Label>
              <Input placeholder="(00) 00000-0000" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} className={errors.telefone ? 'border-red-500' : ''} />
              {errors.telefone && <p className="text-xs text-red-500">{errors.telefone}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>WhatsApp *</Label>
              <Input placeholder="(00) 00000-0000" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} className={errors.whatsapp ? 'border-red-500' : ''} />
              {errors.whatsapp && <p className="text-xs text-red-500">{errors.whatsapp}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>CPF/CNPJ</Label>
              <Input value={form.cpf_cnpj} onChange={(e) => setForm({ ...form, cpf_cnpj: e.target.value })} />
            </div>

            <div className="space-y-1.5">
              <Label>Chave Pix</Label>
              <Input value={form.chave_pix} onChange={(e) => setForm({ ...form, chave_pix: e.target.value })} />
            </div>

            <div className="space-y-1.5">
              <Label>Estado *</Label>
              <Select value={form.estado} onValueChange={handleEstadoChange}>
                <SelectTrigger className={errors.estado ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS_BRASIL.map((uf) => (
                    <SelectItem key={uf.sigla} value={uf.sigla}>{uf.sigla} — {uf.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.estado && <p className="text-xs text-red-500">{errors.estado}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Cidade *</Label>
              <Select value={form.cidade} onValueChange={(v) => setForm({ ...form, cidade: v })} disabled={!form.estado}>
                <SelectTrigger className={errors.cidade ? 'border-red-500' : ''}>
                  <SelectValue placeholder={form.estado ? 'Selecione...' : 'Selecione o estado primeiro'} />
                </SelectTrigger>
                <SelectContent>
                  {cidades.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.cidade && <p className="text-xs text-red-500">{errors.cidade}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>CEP *</Label>
              <Input placeholder="00000-000" value={form.cep} onChange={(e) => setForm({ ...form, cep: e.target.value })} className={errors.cep ? 'border-red-500' : ''} />
              {errors.cep && <p className="text-xs text-red-500">{errors.cep}</p>}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="bg-purple-600 hover:bg-purple-700 text-white">
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</> : 'Cadastrar Representante'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}