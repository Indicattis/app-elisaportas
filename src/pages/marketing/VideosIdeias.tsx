import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Clapperboard, Loader2 } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const ideiaSchema = z.object({
  titulo: z.string().trim().min(1, "Título obrigatório").max(120, "Máx. 120 caracteres"),
  descricao: z
    .string()
    .trim()
    .min(60, "A descrição deve ter no mínimo 60 caracteres")
    .max(2000, "Máx. 2000 caracteres"),
});

interface Ideia {
  id: string;
  titulo: string;
  descricao: string;
  criado_por_nome: string | null;
  created_at: string;
}

export default function VideosIdeias() {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");

  const { data: ideias, isLoading } = useQuery({
    queryKey: ["marketing-videos-ideias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_videos_ideias")
        .select("id,titulo,descricao,criado_por_nome,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Ideia[];
    },
  });

  const criar = useMutation({
    mutationFn: async () => {
      const parsed = ideiaSchema.parse({ titulo, descricao });
      const { error } = await supabase.from("marketing_videos_ideias").insert({
        titulo: parsed.titulo,
        descricao: parsed.descricao,
        criado_por: user?.id,
        criado_por_nome: userRole?.nome ?? user?.email ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-videos-ideias"] });
      setConfirmOpen(false);
      setFormOpen(false);
      setTitulo("");
      setDescricao("");
      setSuccessOpen(true);
    },
    onError: (e: any) => {
      toast.error(e?.message ?? "Erro ao cadastrar ideia");
    },
  });

  const handleConfirmarForm = () => {
    const result = ideiaSchema.safeParse({ titulo, descricao });
    if (!result.success) {
      toast.error(result.error.errors[0]?.message ?? "Dados inválidos");
      return;
    }
    setConfirmOpen(true);
  };

  const descricaoLen = descricao.trim().length;
  const descricaoOk = descricaoLen >= 60;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/home")}
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="p-2 rounded-lg bg-white/5 border border-white/10">
              <Clapperboard className="w-5 h-5 text-white/80" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold truncate">Vídeos de Marketing</h1>
              <p className="text-xs text-white/50 truncate">Cadastre ideias para o time de marketing</p>
            </div>
          </div>
          <Button
            onClick={() => setFormOpen(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nova ideia</span>
          </Button>
        </div>
      </div>

      {/* Lista */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-white/50">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : !ideias || ideias.length === 0 ? (
          <div className="text-center py-20 text-white/50">
            <Clapperboard className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Nenhuma ideia cadastrada ainda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ideias.map((ideia) => (
              <div
                key={ideia.id}
                className="p-4 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10"
              >
                <h3 className="font-semibold text-white mb-2">{ideia.titulo}</h3>
                <p className="text-sm text-white/70 whitespace-pre-wrap mb-3">{ideia.descricao}</p>
                <div className="flex items-center justify-between text-xs text-white/40">
                  <span>{ideia.criado_por_nome ?? "—"}</span>
                  <span>
                    {new Date(ideia.created_at).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de formulário */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova ideia de vídeo</DialogTitle>
            <DialogDescription>
              Descreva sua ideia para o time de marketing produzir.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="titulo">Título</Label>
              <Input
                id="titulo"
                placeholder="Título do vídeo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                maxLength={120}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="descricao">Descrição</Label>
                <span
                  className={`text-xs ${descricaoOk ? "text-green-500" : "text-muted-foreground"}`}
                >
                  {descricaoLen}/60 mínimos
                </span>
              </div>
              <Textarea
                id="descricao"
                placeholder="Descreva a ideia, contexto, mensagem... (mín. 60 caracteres)"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={6}
                maxLength={2000}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmarForm} disabled={!titulo.trim() || !descricaoOk}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmação bem-humorada */}
      <Dialog open={confirmOpen} onOpenChange={(v) => !criar.isPending && setConfirmOpen(v)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="sr-only">Confirmação</DialogTitle>
          </DialogHeader>
          <div className="text-center py-4 space-y-4">
            <div className="text-6xl">😢</div>
            <p className="text-base text-foreground leading-relaxed">
              Tem certeza que quer dar <strong>MAIS</strong> uma demanda para o time de marketing?
              Os meninos estão cheios de serviço
            </p>
          </div>
          <DialogFooter className="sm:justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={criar.isPending}
            >
              Cancelar
            </Button>
            <Button onClick={() => criar.mutate()} disabled={criar.isPending}>
              {criar.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Sim"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de sucesso */}
      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="sr-only">Cadastrado</DialogTitle>
          </DialogHeader>
          <div className="text-center py-4 space-y-4">
            <div className="text-6xl">🎉</div>
            <p className="text-lg font-semibold text-foreground">sem monstro!</p>
            <p className="text-sm text-muted-foreground">Ideia cadastrada com sucesso.</p>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button onClick={() => setSuccessOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}