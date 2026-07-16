import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Loader2, ExternalLink } from "lucide-react";
import { ESTADOS_BRASIL, getCidadesPorEstado } from "@/utils/estadosCidades";

interface Vendedor {
  id: string;
  nome: string;
  foto_perfil_url?: string | null;
}

interface FormState {
  nome: string;
  email: string;
  telefone: string;
  whatsapp: string;
  responsavel: string;
  estado: string;
  cidade: string;
  cep: string;
  ativo: boolean;
  logo_url: string;
  vendedor_id: string;
  vendedor_responsavel_id: string;
}

const emptyForm: FormState = {
  nome: "",
  email: "",
  telefone: "",
  whatsapp: "",
  responsavel: "",
  estado: "",
  cidade: "",
  cep: "",
  ativo: true,
  logo_url: "",
  vendedor_id: "",
  vendedor_responsavel_id: "",
};

interface EditarAutorizadoModalProps {
  autorizadoId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function EditarAutorizadoModal({ autorizadoId, open, onOpenChange, onSaved }: EditarAutorizadoModalProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [cidadesDisponiveis, setCidadesDisponiveis] = useState<string[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open || !autorizadoId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setErrors({});
      try {
        const [{ data: autorizado, error: autErr }, { data: usersData, error: usersErr }] = await Promise.all([
          supabase
            .from("autorizados")
            .select("nome, email, telefone, whatsapp, responsavel, estado, cidade, cep, ativo, logo_url, vendedor_id, vendedor_responsavel_id")
            .eq("id", autorizadoId)
            .maybeSingle(),
          supabase.rpc("get_active_users_basic"),
        ]);

        if (autErr) throw autErr;
        if (usersErr) throw usersErr;
        if (cancelled) return;

        if (autorizado) {
          setForm({
            nome: autorizado.nome || "",
            email: autorizado.email || "",
            telefone: autorizado.telefone || "",
            whatsapp: autorizado.whatsapp || "",
            responsavel: autorizado.responsavel || "",
            estado: autorizado.estado || "",
            cidade: autorizado.cidade || "",
            cep: autorizado.cep || "",
            ativo: autorizado.ativo ?? true,
            logo_url: autorizado.logo_url || "",
            vendedor_id: autorizado.vendedor_id || "",
            vendedor_responsavel_id: (autorizado as any).vendedor_responsavel_id || "",
          });
          setCidadesDisponiveis(autorizado.estado ? getCidadesPorEstado(autorizado.estado) : []);
        }
        setVendedores((usersData as Vendedor[]) || []);
      } catch (err) {
        console.error("Erro ao carregar autorizado:", err);
        toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar o autorizado." });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [open, autorizadoId, toast]);

  const handleEstadoChange = (sigla: string) => {
    setForm((prev) => ({ ...prev, estado: sigla, cidade: "" }));
    setCidadesDisponiveis(getCidadesPorEstado(sigla));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.nome.trim()) next.nome = "Nome é obrigatório";
    if (!form.responsavel.trim()) next.responsavel = "Responsável é obrigatório";
    if (!form.vendedor_id) next.vendedor_id = "Atendente é obrigatório";
    if (!form.estado) next.estado = "Estado é obrigatório";
    if (!form.cidade) next.cidade = "Cidade é obrigatória";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!autorizadoId) return;
    if (!validate()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("autorizados")
        .update({
          nome: form.nome,
          email: form.email || null,
          telefone: form.telefone || null,
          whatsapp: form.whatsapp || null,
          responsavel: form.responsavel,
          estado: form.estado,
          cidade: form.cidade,
          cep: form.cep || null,
          ativo: form.ativo,
          logo_url: form.logo_url || null,
          vendedor_id: form.vendedor_id,
          vendedor_responsavel_id: form.vendedor_responsavel_id || null,
        })
        .eq("id", autorizadoId);

      if (error) throw error;
      toast({ title: "Sucesso", description: "Autorizado atualizado." });
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Erro ao salvar autorizado:", err);
      toast({ variant: "destructive", title: "Erro", description: err.message || "Erro ao salvar." });
    } finally {
      setSaving(false);
    }
  };

  const openFullEdit = () => {
    if (!autorizadoId) return;
    onOpenChange(false);
    navigate(`/direcao/autorizados/${autorizadoId}/editar`, {
      state: { from: "/direcao/vendas/parceiros" },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-black/95 backdrop-blur-xl border-white/10 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Editar Autorizado</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6 py-2">
            {/* Identificação */}
            <section className="space-y-3">
              <h3 className="text-xs uppercase tracking-wide text-white/50">Identificação</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-white/70 text-xs">Nome *</Label>
                  <Input
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    className={`bg-white/5 border-white/10 text-white ${errors.nome ? "border-red-500" : ""}`}
                  />
                  {errors.nome && <p className="text-xs text-red-400">{errors.nome}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-white/70 text-xs">Responsável *</Label>
                  <Input
                    value={form.responsavel}
                    onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
                    className={`bg-white/5 border-white/10 text-white ${errors.responsavel ? "border-red-500" : ""}`}
                  />
                  {errors.responsavel && <p className="text-xs text-red-400">{errors.responsavel}</p>}
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
                  <Label className="text-white/70 text-xs">WhatsApp</Label>
                  <Input
                    value={form.whatsapp}
                    onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-white/70 text-xs">Logo (URL)</Label>
                  <Input
                    value={form.logo_url}
                    onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                    placeholder="https://..."
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
              </div>
            </section>

            {/* Localização */}
            <section className="space-y-3">
              <h3 className="text-xs uppercase tracking-wide text-white/50">Localização</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-white/70 text-xs">Estado *</Label>
                  <Select value={form.estado} onValueChange={handleEstadoChange}>
                    <SelectTrigger className={`bg-white/5 border-white/10 text-white ${errors.estado ? "border-red-500" : ""}`}>
                      <SelectValue placeholder="UF" />
                    </SelectTrigger>
                    <SelectContent>
                      {ESTADOS_BRASIL.map((e) => (
                        <SelectItem key={e.sigla} value={e.sigla}>{e.sigla} - {e.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.estado && <p className="text-xs text-red-400">{errors.estado}</p>}
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-white/70 text-xs">Cidade *</Label>
                  <Select
                    value={form.cidade}
                    onValueChange={(v) => setForm({ ...form, cidade: v })}
                    disabled={!form.estado}
                  >
                    <SelectTrigger className={`bg-white/5 border-white/10 text-white ${errors.cidade ? "border-red-500" : ""}`}>
                      <SelectValue placeholder="Selecione a cidade" />
                    </SelectTrigger>
                    <SelectContent>
                      {cidadesDisponiveis.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.cidade && <p className="text-xs text-red-400">{errors.cidade}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-white/70 text-xs">CEP</Label>
                  <Input
                    value={form.cep}
                    onChange={(e) => setForm({ ...form, cep: e.target.value })}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
              </div>
            </section>

            {/* Equipe */}
            <section className="space-y-3">
              <h3 className="text-xs uppercase tracking-wide text-white/50">Equipe</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-white/70 text-xs">Atendente *</Label>
                  <Select
                    value={form.vendedor_id}
                    onValueChange={(v) => setForm({ ...form, vendedor_id: v })}
                  >
                    <SelectTrigger className={`bg-white/5 border-white/10 text-white ${errors.vendedor_id ? "border-red-500" : ""}`}>
                      <SelectValue placeholder="Selecione um atendente" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendedores.map((v) => (
                        <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.vendedor_id && <p className="text-xs text-red-400">{errors.vendedor_id}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-white/70 text-xs">Vendedor Responsável</Label>
                  <Select
                    value={form.vendedor_responsavel_id}
                    onValueChange={(v) => setForm({ ...form, vendedor_responsavel_id: v })}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="Selecione o vendedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendedores.map((v) => (
                        <SelectItem key={v.id} value={v.id}>{v.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            {/* Status */}
            <section className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3">
              <div>
                <p className="text-sm text-white">Ativo</p>
                <p className="text-xs text-white/50">Autorizados inativos não aparecem nas listas operacionais.</p>
              </div>
              <Switch
                checked={form.ativo}
                onCheckedChange={(v) => setForm({ ...form, ativo: v })}
              />
            </section>

            <button
              type="button"
              onClick={openFullEdit}
              className="text-xs text-blue-300 hover:text-blue-200 inline-flex items-center gap-1.5"
            >
              <ExternalLink className="w-3 h-3" />
              Abrir edição completa (cidades secundárias, negociação, preços, contratos)
            </button>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
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