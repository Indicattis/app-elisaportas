import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Clapperboard, Loader2, GripVertical, Check, ChevronsUpDown, X, Trash2 } from "lucide-react";
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
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Status = "gravar" | "editar" | "aprovar" | "postado" | "rejeitado";

const STATUS_OPTIONS: { value: Status; label: string; classes: string }[] = [
  { value: "gravar", label: "Gravar", classes: "bg-blue-500/15 text-blue-300 border-blue-500/30 hover:bg-blue-500/25" },
  { value: "editar", label: "Editar", classes: "bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25" },
  { value: "aprovar", label: "Aprovar", classes: "bg-violet-500/15 text-violet-300 border-violet-500/30 hover:bg-violet-500/25" },
  { value: "postado", label: "Postado", classes: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25" },
  { value: "rejeitado", label: "Rejeitado", classes: "bg-rose-500/15 text-rose-300 border-rose-500/30 hover:bg-rose-500/25" },
];
const STATUS_MAP = Object.fromEntries(STATUS_OPTIONS.map(s => [s.value, s])) as Record<Status, typeof STATUS_OPTIONS[number]>;

const ideiaSchema = z.object({
  titulo: z.string().trim().min(1, "Título obrigatório").max(120, "Máx. 120 caracteres"),
  descricao: z
    .string()
    .trim()
    .min(60, "A descrição deve ter no mínimo 60 caracteres")
    .max(2000, "Máx. 2000 caracteres"),
  autores_ids: z.array(z.string().uuid()).min(1, "Selecione ao menos 1 autor"),
});

interface Ideia {
  id: string;
  titulo: string;
  descricao: string;
  criado_por_nome: string | null;
  created_at: string;
  posicao: number | null;
  autores_ids: string[];
  autores_nomes: string[];
  status: Status;
}

interface Colaborador {
  id: string;
  nome: string;
}

function SortableIdeiaCard({ ideia, onChangeStatus, onDelete }: { ideia: Ideia; onChangeStatus: (id: string, s: Status) => void; onDelete: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: ideia.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  const statusInfo = STATUS_MAP[ideia.status] ?? STATUS_MAP.gravar;
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="p-4 rounded-xl bg-white/5 backdrop-blur-xl border border-white/10 relative"
    >
      <div className="absolute top-2 right-2 flex items-center gap-1">
        <button
          {...attributes}
          {...listeners}
          className="p-1.5 rounded-md text-white/40 hover:text-white/80 hover:bg-white/10 cursor-grab active:cursor-grabbing touch-none"
          aria-label="Reordenar"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(ideia.id)}
          className="p-1.5 rounded-md text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          aria-label="Excluir ideia"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="flex items-start gap-2 mb-2 pr-16">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "shrink-0 px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors",
                statusInfo.classes
              )}
            >
              {statusInfo.label}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {STATUS_OPTIONS.filter(s => s.value !== ideia.status).map(s => (
              <DropdownMenuItem key={s.value} onSelect={() => onChangeStatus(ideia.id, s.value)}>
                {s.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <h3 className="font-semibold text-white">{ideia.titulo}</h3>
      </div>
      <p className="text-sm text-white/70 whitespace-pre-wrap mb-3">{ideia.descricao}</p>
      {ideia.autores_nomes && ideia.autores_nomes.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {ideia.autores_nomes.map((n, i) => (
            <Badge key={i} variant="secondary" className="bg-white/10 text-white/80 border-white/10 hover:bg-white/10">
              {n}
            </Badge>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between text-xs text-white/40">
        <span>
          {ideia.autores_nomes && ideia.autores_nomes.length > 0
            ? `por ${ideia.criado_por_nome ?? "—"}`
            : (ideia.criado_por_nome ?? "—")}
        </span>
        <span>
          {new Date(ideia.created_at).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })}
        </span>
      </div>
    </div>
  );
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
  const [autoresIds, setAutoresIds] = useState<string[]>([]);
  const [autoresPopoverOpen, setAutoresPopoverOpen] = useState(false);
  const [statusFiltro, setStatusFiltro] = useState<"todos" | Status>("todos");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [ideiaParaExcluir, setIdeiaParaExcluir] = useState<string | null>(null);

  const { data: colaboradores } = useQuery({
    queryKey: ["marketing-videos-ideias-colaboradores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_users")
        .select("id,nome")
        .eq("ativo", true)
        .eq("eh_colaborador", true)
        .order("nome", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Colaborador[];
    },
  });

  const { data: ideias, isLoading } = useQuery({
    queryKey: ["marketing-videos-ideias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_videos_ideias")
        .select("id,titulo,descricao,criado_por_nome,created_at,posicao,autores_ids,autores_nomes,status")
        .order("posicao", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Ideia[];
    },
  });

  const reordenar = useMutation({
    mutationFn: async (items: Ideia[]) => {
      const updates = items.map((it, i) =>
        supabase.from("marketing_videos_ideias").update({ posicao: i }).eq("id", it.id)
      );
      const results = await Promise.all(updates);
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
    },
    onMutate: async (items) => {
      await queryClient.cancelQueries({ queryKey: ["marketing-videos-ideias"] });
      const prev = queryClient.getQueryData<Ideia[]>(["marketing-videos-ideias"]);
      queryClient.setQueryData(["marketing-videos-ideias"], items);
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["marketing-videos-ideias"], ctx.prev);
      toast.error("Erro ao reordenar");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-videos-ideias"] });
    },
  });

  const excluirIdeia = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("marketing_videos_ideias").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-videos-ideias"] });
      setDeleteModalOpen(false);
      setIdeiaParaExcluir(null);
      toast.success("Ideia excluída com sucesso");
    },
    onError: () => {
      toast.error("Erro ao excluir ideia");
    },
  });

  const atualizarStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      const { error } = await supabase.from("marketing_videos_ideias").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ["marketing-videos-ideias"] });
      const prev = queryClient.getQueryData<Ideia[]>(["marketing-videos-ideias"]);
      if (prev) {
        queryClient.setQueryData<Ideia[]>(
          ["marketing-videos-ideias"],
          prev.map((i) => (i.id === id ? { ...i, status } : i))
        );
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["marketing-videos-ideias"], ctx.prev);
      toast.error("Erro ao atualizar status");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-videos-ideias"] });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !ideias) return;
    const oldIndex = ideias.findIndex((i) => i.id === active.id);
    const newIndex = ideias.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const next = arrayMove(ideias, oldIndex, newIndex);
    reordenar.mutate(next);
  };

  const counts = (ideias ?? []).reduce<Record<string, number>>((acc, i) => {
    acc[i.status] = (acc[i.status] ?? 0) + 1;
    return acc;
  }, {});
  const filteredIdeias = (ideias ?? []).filter((i) => statusFiltro === "todos" || i.status === statusFiltro);

  const criar = useMutation({
    mutationFn: async () => {
      const parsed = ideiaSchema.parse({ titulo, descricao, autores_ids: autoresIds });
      const nomes = (colaboradores ?? [])
        .filter((c) => parsed.autores_ids.includes(c.id))
        .map((c) => c.nome);
      const { error } = await supabase.from("marketing_videos_ideias").insert({
        titulo: parsed.titulo,
        descricao: parsed.descricao,
        criado_por: user?.id,
        criado_por_nome: userRole?.nome ?? user?.email ?? null,
        autores_ids: parsed.autores_ids,
        autores_nomes: nomes,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-videos-ideias"] });
      setConfirmOpen(false);
      setFormOpen(false);
      setTitulo("");
      setDescricao("");
      setAutoresIds([]);
      setSuccessOpen(true);
    },
    onError: (e: any) => {
      toast.error(e?.message ?? "Erro ao cadastrar ideia");
    },
  });

  const handleConfirmarForm = () => {
    const result = ideiaSchema.safeParse({ titulo, descricao, autores_ids: autoresIds });
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
          <>
            <Tabs value={statusFiltro} onValueChange={(v) => setStatusFiltro(v as any)} className="mb-4">
              <TabsList className="bg-white/5 border border-white/10 flex-wrap h-auto">
                <TabsTrigger value="todos">Todos ({ideias.length})</TabsTrigger>
                {STATUS_OPTIONS.map((s) => (
                  <TabsTrigger key={s.value} value={s.value}>
                    {s.label} ({counts[s.value] ?? 0})
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            {filteredIdeias.length === 0 ? (
              <div className="text-center py-12 text-white/40 text-sm">Nenhuma ideia nesse status.</div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={filteredIdeias.map((i) => i.id)} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredIdeias.map((ideia) => (
                      <SortableIdeiaCard
                        key={ideia.id}
                        ideia={ideia}
                        onChangeStatus={(id, status) => atualizarStatus.mutate({ id, status })}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </>
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

            <div className="space-y-2">
              <Label>Autores</Label>
              <Popover open={autoresPopoverOpen} onOpenChange={setAutoresPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between font-normal"
                  >
                    <span className="truncate text-left">
                      {autoresIds.length === 0
                        ? "Selecione os autores"
                        : `${autoresIds.length} selecionado${autoresIds.length > 1 ? "s" : ""}`}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar colaborador..." />
                    <CommandList>
                      <CommandEmpty>Nenhum colaborador encontrado.</CommandEmpty>
                      <CommandGroup>
                        {(colaboradores ?? []).map((c) => {
                          const selected = autoresIds.includes(c.id);
                          return (
                            <CommandItem
                              key={c.id}
                              value={c.nome}
                              onSelect={() => {
                                setAutoresIds((prev) =>
                                  prev.includes(c.id)
                                    ? prev.filter((id) => id !== c.id)
                                    : [...prev, c.id]
                                );
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", selected ? "opacity-100" : "opacity-0")} />
                              {c.nome}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {autoresIds.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {autoresIds.map((id) => {
                    const c = colaboradores?.find((x) => x.id === id);
                    if (!c) return null;
                    return (
                      <Badge key={id} variant="secondary" className="gap-1 pr-1">
                        {c.nome}
                        <button
                          type="button"
                          onClick={() => setAutoresIds((prev) => prev.filter((x) => x !== id))}
                          className="ml-1 rounded-sm hover:bg-foreground/10 p-0.5"
                          aria-label={`Remover ${c.nome}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmarForm}
              disabled={!titulo.trim() || !descricaoOk || autoresIds.length === 0}
            >
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