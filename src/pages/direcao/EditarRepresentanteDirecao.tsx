import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Camera, User } from 'lucide-react';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
import { AnimatedBreadcrumb } from '@/components/AnimatedBreadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface RepresentanteForm {
  nome: string;
  email: string;
  telefone: string;
  foto_perfil_url: string;
  comissao_pct: string;
  ativo: boolean;
  reprovado: boolean;
}

export default function EditarRepresentanteDirecao() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<RepresentanteForm>({
    nome: '',
    email: '',
    telefone: '',
    foto_perfil_url: '',
    comissao_pct: '',
    ativo: true,
    reprovado: false,
  });

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data, error } = await supabase
        .from('representantes')
        .select('nome, email, telefone, foto_perfil_url, comissao_pct, ativo, reprovado')
        .eq('id', id)
        .maybeSingle();
      if (error) {
        toast.error('Erro ao carregar representante');
      } else if (data) {
        setForm({
          nome: data.nome || '',
          email: data.email || '',
          telefone: data.telefone || '',
          foto_perfil_url: data.foto_perfil_url || '',
          comissao_pct: data.comissao_pct != null ? String(data.comissao_pct) : '',
          ativo: !!data.ativo,
          reprovado: !!data.reprovado,
        });
      }
      setLoading(false);
    })();
  }, [id]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!id || !event.target.files || event.target.files.length === 0) return;
    const file = event.target.files[0];
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `representantes/${id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('autorizados-logos')
        .upload(filePath, file, { upsert: true, cacheControl: '31536000' });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage
        .from('autorizados-logos')
        .getPublicUrl(filePath);
      setForm((f) => ({ ...f, foto_perfil_url: publicUrl }));
      toast.success('Foto atualizada');
    } catch (e: any) {
      toast.error(e.message || 'Erro ao enviar foto');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!id) return;
    if (!form.nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    const comissaoNum = form.comissao_pct === '' ? null : Number(String(form.comissao_pct).replace(',', '.'));
    if (comissaoNum != null && (Number.isNaN(comissaoNum) || comissaoNum < 0 || comissaoNum > 100)) {
      toast.error('Comissão deve estar entre 0 e 100');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('representantes')
      .update({
        nome: form.nome.trim(),
        email: form.email.trim() || null,
        telefone: form.telefone.trim() || null,
        foto_perfil_url: form.foto_perfil_url || null,
        comissao_pct: comissaoNum,
        ativo: form.ativo,
      })
      .eq('id', id);
    setSaving(false);
    if (error) {
      toast.error(error.message || 'Erro ao salvar');
      return;
    }
    toast.success('Representante atualizado');
    queryClient.invalidateQueries({ queryKey: ['parceiros-representantes'] });
    navigate('/direcao/vendas/parceiros');
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="flex items-center justify-between px-6 py-4">
        <button
          onClick={() => navigate('/direcao/vendas/parceiros')}
          className="w-10 h-10 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl hover:bg-white/10 flex items-center justify-center transition-colors"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
        </button>
        <AnimatedBreadcrumb
          items={[
            { label: 'Home', path: '/home' },
            { label: 'Direção', path: '/direcao' },
            { label: 'Vendas', path: '/direcao/vendas' },
            { label: 'Parceiros', path: '/direcao/vendas/parceiros' },
            { label: 'Editar representante' },
          ]}
          mounted={true}
        />
      </div>

      <div className="px-6 py-6">
        <div className="mx-auto max-w-2xl">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-white/50">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando...
            </div>
          ) : (
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-6">
              {/* Foto */}
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full overflow-hidden border border-white/10 bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                  {form.foto_perfil_url ? (
                    <img src={form.foto_perfil_url} alt={form.nome} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-white/70" />
                  )}
                </div>
                <div>
                  <Label htmlFor="foto-upload" className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/80 text-sm hover:bg-white/10 transition-colors">
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                    {uploading ? 'Enviando...' : 'Alterar foto'}
                  </Label>
                  <input
                    id="foto-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleUpload}
                    disabled={uploading}
                  />
                  <p className="text-[11px] text-white/40 mt-1">PNG ou JPG, até 5MB</p>
                </div>
              </div>

              <div className="grid gap-4">
                <div>
                  <Label className="text-white/70 text-xs">Nome</Label>
                  <Input
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    className="mt-1 bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div>
                  <Label className="text-white/70 text-xs">E-mail</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="mt-1 bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div>
                  <Label className="text-white/70 text-xs">Telefone</Label>
                  <Input
                    value={form.telefone}
                    onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                    className="mt-1 bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div>
                  <Label className="text-white/70 text-xs">Comissão (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={form.comissao_pct}
                    onChange={(e) => setForm({ ...form, comissao_pct: e.target.value })}
                    className="mt-1 bg-white/5 border-white/10 text-white"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <div>
                    <div className="text-sm text-white">Ativo</div>
                    <div className="text-[11px] text-white/40">Representante pode operar no sistema</div>
                  </div>
                  <Switch
                    checked={form.ativo}
                    onCheckedChange={(v) => setForm({ ...form, ativo: v })}
                  />
                </div>

                {form.reprovado && (
                  <div className="rounded-lg bg-red-500/10 border border-red-400/20 text-red-300 text-xs px-3 py-2">
                    Este representante foi reprovado no fluxo de aprovação.
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => navigate('/direcao/vendas/parceiros')}
                  className="bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:text-white"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-500 text-white"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Salvar
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}