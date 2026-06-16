import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, ExternalLink, Activity } from "lucide-react";
import { MinimalistLayout } from "@/components/MinimalistLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type TipoAtividade = "stories" | "post" | "video";

interface Atividade {
  id: string;
  tipo: TipoAtividade;
  descricao: string;
  link: string | null;
  duracao_minutos: number;
  data: string;
  created_at: string;
}

const TIPO_LABEL: Record<TipoAtividade, string> = {
  stories: "Stories",
  post: "Post",
  video: "Vídeo",
};

const TIPO_COLOR: Record<TipoAtividade, string> = {
  stories: "bg-pink-500/15 text-pink-300 border-pink-500/30",
  post: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  video: "bg-amber-500/15 text-amber-300 border-amber-500/30",
};

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function AtividadesMarketing() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Atividade | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [tipo, setTipo] = useState<TipoAtividade>("stories");
  const [descricao, setDescricao] = useState("");
  const [link, setLink] = useState("");
  const [duracao, setDuracao] = useState<string>("");
  const [data, setData] = useState<string>(todayISO());

  const { data: atividades = [], isLoading } = useQuery({
    queryKey: ["marketing-atividades"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_atividades")
        .select("*")
        .order("data", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Atividade[];
    },
  });

  const resetForm = () => {
    setEditing(null);
    setTipo("stories");
    setDescricao("");
    setLink("");
    setDuracao("");
    setData(todayISO());
  };

  const openNew = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (a: Atividade) => {
    setEditing(a);
    setTipo(a.tipo);
    setDescricao(a.descricao);
    setLink(a.link ?? "");
    setDuracao(String(a.duracao_minutos));
    setData(a.data);
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const duracaoNum = parseInt(duracao, 10);
      if (!descricao.trim()) throw new Error("Descrição é obrigatória");
      if (!Number.isFinite(duracaoNum) || duracaoNum < 0) throw new Error("Duração inválida");

      const payload = {
        tipo,
        descricao: descricao.trim(),
        link: link.trim() || null,
        duracao_minutos: duracaoNum,
        data: `${data}T12:00:00.000Z`,
      };

      if (editing) {
        const { error } = await supabase
          .from("marketing_atividades")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("marketing_atividades")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Atividade atualizada" : "Atividade cadastrada");
      queryClient.invalidateQueries({ queryKey: ["marketing-atividades"] });
      setDialogOpen(false);
      resetForm();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("marketing_atividades").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Atividade excluída");
      queryClient.invalidateQueries({ queryKey: ["marketing-atividades"] });
      setDeleteId(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalMin = atividades.reduce((s, a) => s + (a.duracao_minutos || 0), 0);

  return (
    <MinimalistLayout
      title="Atividades de Marketing"
      subtitle="Registre Stories, Posts e Vídeos realizados"
      backPath="/marketing"
      breadcrumbItems={[
        { label: "Home", path: "/home" },
        { label: "Marketing", path: "/marketing" },
        { label: "Atividades" },
      ]}
      headerActions={
        <Button
          onClick={openNew}
          className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 text-white border-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Atividade
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
            <CardContent className="p-4">
              <div className="text-xs text-white/50">Total</div>
              <div className="text-2xl font-semibold text-white">{atividades.length}</div>
            </CardContent>
          </Card>
          {(["stories", "post", "video"] as TipoAtividade[]).map((t) => (
            <Card key={t} className="bg-white/5 border-white/10 backdrop-blur-xl">
              <CardContent className="p-4">
                <div className="text-xs text-white/50">{TIPO_LABEL[t]}</div>
                <div className="text-2xl font-semibold text-white">
                  {atividades.filter((a) => a.tipo === t).length}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-white/60">Data</TableHead>
                  <TableHead className="text-white/60">Tipo</TableHead>
                  <TableHead className="text-white/60">Descrição</TableHead>
                  <TableHead className="text-white/60">Link</TableHead>
                  <TableHead className="text-white/60 text-right">Duração</TableHead>
                  <TableHead className="text-white/60 w-24 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-white/50 py-8">Carregando...</TableCell></TableRow>
                ) : atividades.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-white/50 py-12">
                      <Activity className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      Nenhuma atividade registrada
                    </TableCell>
                  </TableRow>
                ) : (
                  atividades.map((a) => (
                    <TableRow key={a.id} className="border-white/5 hover:bg-white/[0.03]">
                      <TableCell className="text-white/80 whitespace-nowrap">
                        {new Date(`${a.data}T12:00:00`).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={TIPO_COLOR[a.tipo]}>
                          {TIPO_LABEL[a.tipo]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-white/80 max-w-md">
                        <div className="line-clamp-2">{a.descricao}</div>
                      </TableCell>
                      <TableCell>
                        {a.link ? (
                          <a href={a.link} target="_blank" rel="noopener noreferrer"
                             className="text-blue-300 hover:text-blue-200 inline-flex items-center gap-1">
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span className="text-xs">Abrir</span>
                          </a>
                        ) : <span className="text-white/30 text-xs">—</span>}
                      </TableCell>
                      <TableCell className="text-white/80 text-right whitespace-nowrap">
                        {a.duracao_minutos} min
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-white/60 hover:text-white"
                            onClick={() => openEdit(a)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-white/60 hover:text-red-400"
                            onClick={() => setDeleteId(a.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {atividades.length > 0 && (
              <div className="border-t border-white/10 px-4 py-2 text-xs text-white/50 flex justify-end">
                Total de duração: <span className="text-white/80 ml-2 font-medium">{totalMin} min</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Atividade" : "Nova Atividade"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-white/70">Tipo</Label>
                <Select value={tipo} onValueChange={(v) => setTipo(v as TipoAtividade)}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10 text-white">
                    <SelectItem value="stories">Stories</SelectItem>
                    <SelectItem value="post">Post</SelectItem>
                    <SelectItem value="video">Vídeo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white/70">Data</Label>
                <Input type="date" value={data} onChange={(e) => setData(e.target.value)}
                  className="bg-white/5 border-white/10 text-white" />
              </div>
            </div>
            <div>
              <Label className="text-white/70">Descrição</Label>
              <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)}
                rows={3} className="bg-white/5 border-white/10 text-white"
                placeholder="Descreva a atividade realizada" />
            </div>
            <div>
              <Label className="text-white/70">Link (opcional)</Label>
              <Input type="url" value={link} onChange={(e) => setLink(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
                placeholder="https://..." />
            </div>
            <div>
              <Label className="text-white/70">Duração (minutos)</Label>
              <Input type="number" min={0} value={duracao}
                onChange={(e) => setDuracao(e.target.value)}
                className="bg-white/5 border-white/10 text-white" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}
              className="text-white/70 hover:text-white hover:bg-white/5">Cancelar</Button>
            <Button onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-400 hover:to-blue-600 text-white">
              {editing ? "Salvar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent className="bg-zinc-900 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir atividade?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-red-500/80 hover:bg-red-500 text-white">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MinimalistLayout>
  );
}