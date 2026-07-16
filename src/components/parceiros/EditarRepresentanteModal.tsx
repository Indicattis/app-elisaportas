import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Camera, User } from "lucide-react";

interface FormState {
  nome: string;
  email: string;
  telefone: string;
  foto_perfil_url: string;
  comissao_pct: string;
  ativo: boolean;
}

const emptyForm: FormState = {
  nome: "",
  email: "",
  telefone: "",
  foto_perfil_url: "",
  comissao_pct: "",
  ativo: true,
};

interface EditarRepresentanteModalProps {
  representanteId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function EditarRepresentanteModal({ representanteId, open, onOpenChange, onSaved }: EditarRepresentanteModalProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !representanteId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("representantes")
        .select("nome, email, telefone, foto_perfil_url, comissao_pct, ativo")
        .eq("id", representanteId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        toast.error("Erro ao carregar representante");
      } else if (data) {
        setForm({
          nome: data.nome || "",
          email: data.email || "",
          telefone: data.telefone || "",
          foto_perfil_url: data.foto_perfil_url || "",
          comissao_pct: data.comissao_pct != null ? String(data.comissao_pct) : "",
          ativo: !!data.ativo,
        });
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, representanteId]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!representanteId || !event.target.files || event.target.files.length === 0) return;
    const file = event.target.files[0];
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }
    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `representantes/${representanteId}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("autorizados-logos")
        .upload(filePath, file, { upsert: true, cacheControl: "31536000" });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage
        .from("autorizados-logos")
        .getPublicUrl(filePath);
      setForm((f) => ({ ...f, foto_perfil_url: publicUrl }));
      toast.success("Foto atualizada");
    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar foto");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!representanteId) return;
    if (!form.nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    const comissaoNum = form.comissao_pct === "" ? null : Number(String(form.comissao_pct).replace(",", "."));
    if (comissaoNum != null && (Number.isNaN(comissaoNum) || comissaoNum < 0 || comissaoNum > 100)) {
      toast.error("Comissão deve estar entre 0 e 100");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("representantes")
      .update({
        nome: form.nome.trim(),
        email: form.email.trim() || null,
        telefone: form.telefone.trim() || null,
        foto_perfil_url: form.foto_perfil_url || null,
        comissao_pct: comissaoNum,
        ativo: form.ativo,
      })
      .eq("id", representanteId);
    setSaving(false);
    if (error) {
      toast.error(error.message || "Erro ao salvar");
      return;
    }
    toast.success("Representante atualizado");
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-black/95 backdrop-blur-xl border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Editar Representante</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-5 py-2">
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="w-20 h-20 rounded-full overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center">
                  {form.foto_perfil_url ? (
                    <img src={form.foto_perfil_url} alt={form.nome} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-white/40" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-blue-500 hover:bg-blue-400 flex items-center justify-center transition-colors disabled:opacity-50"
                >
                  {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-white/70 text-xs">Nome *</Label>
                <Input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/70 text-xs">Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/70 text-xs">Telefone</Label>
                <Input
                  value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/70 text-xs">Comissão (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={form.comissao_pct}
                  onChange={(e) => setForm({ ...form, comissao_pct: e.target.value })}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3">
              <div>
                <p className="text-sm text-white">Ativo</p>
                <p className="text-xs text-white/50">Representantes inativos não aparecem em novas vendas.</p>
              </div>
              <Switch
                checked={form.ativo}
                onCheckedChange={(v) => setForm({ ...form, ativo: v })}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</>) : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}