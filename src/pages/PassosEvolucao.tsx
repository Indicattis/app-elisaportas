import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Pencil, Trash2, Check, X, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Passo {
  id: string;
  numero: number;
  titulo: string;
  descricao: string | null;
  concluido: boolean;
}

export default function PassosEvolucao() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [novo, setNovo] = useState({ titulo: "", descricao: "" });
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ titulo: "", descricao: "" });
  const [delId, setDelId] = useState<string | null>(null);

  const { data: passos = [], isLoading } = useQuery({
    queryKey: ["passos_evolucao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("passos_evolucao")
        .select("*")
        .order("numero", { ascending: true });
      if (error) throw error;
      return data as Passo[];
    },
  });

  const addMut = useMutation({
    mutationFn: async () => {
      const proximoNumero = (passos.at(-1)?.numero ?? 0) + 1;
      const { error } = await supabase.from("passos_evolucao").insert({
        numero: proximoNumero,
        titulo: novo.titulo.trim(),
        descricao: novo.descricao.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Passo adicionado");
      setNovo({ titulo: "", descricao: "" });
      setAdding(false);
      qc.invalidateQueries({ queryKey: ["passos_evolucao"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updMut = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Passo> }) => {
      const { error } = await supabase.from("passos_evolucao").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditId(null);
      qc.invalidateQueries({ queryKey: ["passos_evolucao"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("passos_evolucao").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Passo removido");
      setDelId(null);
      qc.invalidateQueries({ queryKey: ["passos_evolucao"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const startEdit = (p: Passo) => {
    setEditId(p.id);
    setEditData({ titulo: p.titulo, descricao: p.descricao ?? "" });
  };

  const concluidos = passos.filter((p) => p.concluido).length;

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-3xl mx-auto px-6 pt-24 pb-16">
        <button
          onClick={() => navigate("/home")}
          className="flex items-center gap-2 text-white/60 hover:text-white text-sm mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <div className="flex items-start justify-between mb-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/30 to-yellow-500/20 border border-amber-300/30 flex items-center justify-center">
              <Target className="w-6 h-6 text-amber-300" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-2xl font-medium text-white">10 Passos Elisa Portas</h1>
              <p className="text-white/50 text-sm">Processo de evolução da empresa</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-light text-amber-300">{concluidos}<span className="text-white/30 text-lg">/{passos.length}</span></div>
            <div className="text-white/40 text-xs uppercase tracking-wider">concluídos</div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3">
          {isLoading && <p className="text-white/40 text-sm">Carregando…</p>}

          {passos.map((p) => {
            const isEditing = editId === p.id;
            return (
              <div
                key={p.id}
                className={`p-5 rounded-xl backdrop-blur-xl border transition-all ${
                  p.concluido
                    ? "bg-emerald-500/5 border-emerald-400/20"
                    : "bg-white/5 border-white/10"
                }`}
              >
                <div className="flex items-start gap-4">
                  <button
                    onClick={() =>
                      updMut.mutate({ id: p.id, patch: { concluido: !p.concluido } })
                    }
                    className={`shrink-0 w-10 h-10 rounded-full border flex items-center justify-center font-medium transition-all ${
                      p.concluido
                        ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-300"
                        : "bg-white/5 border-white/20 text-white/70 hover:border-amber-300/50"
                    }`}
                    title={p.concluido ? "Marcar como pendente" : "Marcar como concluído"}
                  >
                    {p.concluido ? <Check className="w-5 h-5" /> : p.numero}
                  </button>

                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="flex flex-col gap-2">
                        <input
                          value={editData.titulo}
                          onChange={(e) => setEditData({ ...editData, titulo: e.target.value })}
                          placeholder="Título"
                          className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-300/50"
                        />
                        <textarea
                          value={editData.descricao}
                          onChange={(e) => setEditData({ ...editData, descricao: e.target.value })}
                          placeholder="Descrição"
                          rows={3}
                          className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-300/50 resize-none"
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => setEditId(null)}
                            className="px-3 py-1.5 rounded-md text-white/60 hover:text-white text-xs"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() =>
                              updMut.mutate({
                                id: p.id,
                                patch: {
                                  titulo: editData.titulo.trim(),
                                  descricao: editData.descricao.trim() || null,
                                },
                              })
                            }
                            disabled={!editData.titulo.trim()}
                            className="px-3 py-1.5 rounded-md bg-amber-500/30 border border-amber-300/40 text-amber-100 text-xs hover:bg-amber-500/40 disabled:opacity-40"
                          >
                            Salvar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className={`text-base font-medium ${p.concluido ? "text-white/60 line-through" : "text-white"}`}>
                            {p.titulo}
                          </h3>
                          {p.descricao && (
                            <p className="text-sm text-white/50 mt-1 whitespace-pre-wrap">{p.descricao}</p>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => startEdit(p)}
                            className="w-8 h-8 rounded-md text-white/40 hover:text-white hover:bg-white/10 flex items-center justify-center"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDelId(p.id)}
                            className="w-8 h-8 rounded-md text-white/40 hover:text-red-400 hover:bg-white/10 flex items-center justify-center"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {adding ? (
            <div className="p-5 rounded-xl bg-white/5 border border-amber-300/30 backdrop-blur-xl flex flex-col gap-2">
              <input
                value={novo.titulo}
                onChange={(e) => setNovo({ ...novo, titulo: e.target.value })}
                placeholder="Título do passo"
                autoFocus
                className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-300/50"
              />
              <textarea
                value={novo.descricao}
                onChange={(e) => setNovo({ ...novo, descricao: e.target.value })}
                placeholder="Descrição (opcional)"
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-300/50 resize-none"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setAdding(false);
                    setNovo({ titulo: "", descricao: "" });
                  }}
                  className="px-3 py-1.5 rounded-md text-white/60 hover:text-white text-xs flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Cancelar
                </button>
                <button
                  onClick={() => addMut.mutate()}
                  disabled={!novo.titulo.trim() || addMut.isPending}
                  className="px-3 py-1.5 rounded-md bg-amber-500/30 border border-amber-300/40 text-amber-100 text-xs hover:bg-amber-500/40 disabled:opacity-40"
                >
                  Adicionar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="p-4 rounded-xl border border-dashed border-white/15 text-white/50 hover:text-white hover:border-amber-300/40 transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" /> Adicionar passo
            </button>
          )}
        </div>
      </div>

      <AlertDialog open={!!delId} onOpenChange={(o) => !o && setDelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover passo?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => delId && delMut.mutate(delId)}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}