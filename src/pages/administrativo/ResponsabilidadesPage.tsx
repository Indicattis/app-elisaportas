import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { ArrowLeft, Plus, Pencil, Trash2, ClipboardList, Briefcase, ShieldCheck } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AnimatedBreadcrumb } from "@/components/AnimatedBreadcrumb";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const TIPOS = [
  { value: "funcao", label: "Função", icon: Briefcase },
  { value: "obrigacao", label: "Obrigação", icon: ShieldCheck },
  { value: "responsabilidade", label: "Responsabilidade", icon: ClipboardList },
] as const;

type Tipo = "funcao" | "obrigacao" | "responsabilidade";

interface Responsabilidade {
  id: string;
  colaborador_id: string;
  titulo: string;
  descricao: string | null;
  tipo: string;
  created_at: string;
  updated_at: string;
}

interface FormData {
  titulo: string;
  descricao: string;
  tipo: Tipo;
}

const emptyForm: FormData = { titulo: "", descricao: "", tipo: "funcao" };

export default function ResponsabilidadesPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const [selectedColaborador, setSelectedColaborador] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Fetch colaboradores
  const { data: colaboradores = [] } = useQuery({
    queryKey: ["colaboradores-responsabilidades"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_users")
        .select("id, nome")
        .eq("ativo", true)
        .eq("eh_colaborador", true)
        .order("nome");
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch responsabilidades
  const { data: responsabilidades = [], isLoading } = useQuery({
    queryKey: ["responsabilidades", selectedColaborador],
    queryFn: async () => {
      if (!selectedColaborador) return [];
      const { data, error } = await supabase
        .from("colaborador_responsabilidades")
        .select("*")
        .eq("colaborador_id", selectedColaborador)
        .order("tipo")
        .order("titulo");
      if (error) throw error;
      return (data || []) as Responsabilidade[];
    },
    enabled: !!selectedColaborador,
  });

  // Upsert mutation
  const upsert = useMutation({
    mutationFn: async (data: FormData & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase
          .from("colaborador_responsabilidades")
          .update({ titulo: data.titulo, descricao: data.descricao || null, tipo: data.tipo })
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("colaborador_responsabilidades")
          .insert({ colaborador_id: selectedColaborador, titulo: data.titulo, descricao: data.descricao || null, tipo: data.tipo });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["responsabilidades", selectedColaborador] });
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      toast({ title: editingId ? "Atualizado" : "Cadastrado", description: "Registro salvo com sucesso." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível salvar.", variant: "destructive" });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("colaborador_responsabilidades").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["responsabilidades", selectedColaborador] });
      setDeleteId(null);
      toast({ title: "Excluído", description: "Registro removido." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível excluir.", variant: "destructive" });
    },
  });

  const openEdit = (item: Responsabilidade) => {
    setEditingId(item.id);
    setForm({ titulo: item.titulo, descricao: item.descricao || "", tipo: item.tipo as Tipo });
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const grouped = TIPOS.map((t) => ({
    ...t,
    items: responsabilidades.filter((r) => r.tipo === t.value),
  }));

  return (
    <div className="min-h-screen bg-black flex flex-col items-center overflow-hidden relative">
      <AnimatedBreadcrumb
        items={[
          { label: "Home", path: "/home" },
          { label: "Administrativo", path: "/administrativo" },
          { label: "RH/DP", path: "/administrativo/rh-dp" },
          { label: "Responsabilidades" },
        ]}
        mounted={mounted}
      />
      {/* Botão Voltar */}
      <button
        onClick={() => navigate("/administrativo/rh-dp")}
        className="fixed top-4 left-4 z-50 p-1.5 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-all duration-300"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateX(0)" : "translateX(-20px)",
          transition: "all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 100ms",
        }}
      >
        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/20">
          <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
        </div>
      </button>

      {/* Content */}
      <div
        className="relative z-10 w-full max-w-3xl px-4 pt-20 pb-10"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(20px)",
          transition: "all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 200ms",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-lg font-semibold text-white">Responsabilidades</h1>
        </div>

        {/* Seletor de Colaborador */}
        <div className="mb-6">
          <Select value={selectedColaborador} onValueChange={setSelectedColaborador}>
            <SelectTrigger className="w-full bg-white/5 border-white/10 text-white">
              <SelectValue placeholder="Selecione um colaborador" />
            </SelectTrigger>
            <SelectContent>
              {colaboradores.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedColaborador && (
          <>
            {/* Botão Adicionar */}
            <div className="flex justify-end mb-4">
              <Button size="sm" onClick={openNew} className="gap-2 bg-blue-600 hover:bg-blue-500 text-white">
                <Plus className="h-4 w-4" />
                Adicionar
              </Button>
            </div>

            {/* Lista agrupada */}
            {isLoading ? (
              <div className="text-white/50 text-center py-10 text-sm">Carregando...</div>
            ) : responsabilidades.length === 0 ? (
              <div className="text-white/40 text-center py-10 text-sm">Nenhum registro cadastrado para este colaborador.</div>
            ) : (
              <div className="space-y-6">
                {grouped.filter((g) => g.items.length > 0).map((group) => {
                  const GroupIcon = group.icon;
                  return (
                    <div key={group.value}>
                      <div className="flex items-center gap-2 mb-3">
                        <GroupIcon className="h-4 w-4 text-blue-400" />
                        <h2 className="text-sm font-medium text-white/70 uppercase tracking-wider">{group.label}s</h2>
                        <span className="text-xs text-white/30">({group.items.length})</span>
                      </div>
                      <div className="space-y-2">
                        {group.items.map((item) => (
                          <div
                            key={item.id}
                            className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xl flex items-start justify-between gap-3"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white">{item.titulo}</p>
                              {item.descricao && <p className="text-xs text-white/50 mt-1 line-clamp-2">{item.descricao}</p>}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors">
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => setDeleteId(item.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/50 hover:text-red-400 transition-colors">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Dialog Cadastro/Edição */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar" : "Nova"} Responsabilidade</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-white/70">Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm((f) => ({ ...f, tipo: v as Tipo }))}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-white/70">Título</Label>
              <Input
                value={form.titulo}
                onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
                className="bg-white/5 border-white/10 text-white mt-1"
                placeholder="Ex: Gerenciar equipe de produção"
              />
            </div>
            <div>
              <Label className="text-white/70">Descrição</Label>
              <Textarea
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                className="bg-white/5 border-white/10 text-white mt-1 min-h-[80px]"
                placeholder="Detalhes opcionais..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-white/50">Cancelar</Button>
            <Button
              onClick={() => upsert.mutate({ ...form, id: editingId || undefined })}
              disabled={!form.titulo.trim() || upsert.isPending}
              className="bg-blue-600 hover:bg-blue-500"
            >
              {upsert.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Delete */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="bg-zinc-900 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro</AlertDialogTitle>
            <AlertDialogDescription className="text-white/50">
              Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-white/50">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); if (deleteId) deleteMutation.mutate(deleteId); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
