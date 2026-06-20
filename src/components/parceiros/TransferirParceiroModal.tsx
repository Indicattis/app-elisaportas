import { useMemo, useState } from "react";
import { Loader2, Search, UserCheck } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface TransferirParceiroModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parceiroId: string;
  parceiroNome: string;
}

interface ColaboradorOpcao {
  admin_id: string;
  user_id: string | null;
  nome: string;
  foto_perfil_url: string | null;
  totalParceiros: number;
}

export const TransferirParceiroModal = ({
  open,
  onOpenChange,
  parceiroId,
  parceiroNome,
}: TransferirParceiroModalProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [busca, setBusca] = useState("");
  const [selecionado, setSelecionado] = useState<string | null>(null);

  const { data: colaboradores, isLoading } = useQuery({
    queryKey: ["colaboradores-transferencia-parceiros"],
    queryFn: async () => {
      const [{ data: usuarios, error: usuariosError }, { data: parceiros, error: parceirosError }] = await Promise.all([
        supabase
          .from("admin_users")
          .select("id, user_id, nome, ativo, foto_perfil_url, tipo_usuario")
          .in("tipo_usuario", ["colaborador", "metamorfo"])
          .eq("ativo", true),
        supabase
          .from("autorizados")
          .select("vendedor_id")
          .eq("ativo", true),
      ]);

      if (usuariosError) throw usuariosError;
      if (parceirosError) throw parceirosError;

      const contagem = new Map<string, number>();
      (parceiros || []).forEach((p: any) => {
        if (p.vendedor_id) contagem.set(p.vendedor_id, (contagem.get(p.vendedor_id) || 0) + 1);
      });

      const lista: ColaboradorOpcao[] = (usuarios || []).map((u: any) => ({
        admin_id: u.id,
        user_id: u.user_id,
        nome: u.nome,
        foto_perfil_url: u.foto_perfil_url,
        totalParceiros: contagem.get(u.id) || 0,
      }));

      return lista.sort((a, b) => a.nome.localeCompare(b.nome));
    },
    enabled: open,
  });

  const colaboradoresFiltrados = useMemo(() => {
    return (colaboradores || [])
      .filter((c) => c.user_id !== user?.id)
      .filter((c) => c.nome.toLowerCase().includes(busca.toLowerCase()));
  }, [colaboradores, busca, user?.id]);

  const { mutate: transferir, isPending } = useMutation({
    mutationFn: async ({ destinoAdminId }: { destinoAdminId: string }) => {
      const { error } = await supabase
        .from("autorizados")
        .update({ vendedor_id: destinoAdminId })
        .eq("id", parceiroId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meus-parceiros"] });
      queryClient.invalidateQueries({ queryKey: ["colaboradores-transferencia-parceiros"] });
      toast.success("Parceiro transferido com sucesso!");
      onOpenChange(false);
      setSelecionado(null);
      setBusca("");
    },
    onError: (error: any) => {
      console.error("Erro ao transferir parceiro:", error);
      toast.error(error?.message || "Erro ao transferir parceiro");
    },
  });

  const handleConfirmar = () => {
    if (!selecionado) return;
    transferir({ destinoAdminId: selecionado });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Transferir Parceiro
          </DialogTitle>
          <DialogDescription>
            Selecione o colaborador que passará a ser responsável por <strong>{parceiroNome}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar colaborador..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10"
            />
          </div>

          <ScrollArea className="h-[300px] rounded-md border border-white/10">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : colaboradoresFiltrados.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                Nenhum colaborador encontrado
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {colaboradoresFiltrados.map((c) => (
                  <button
                    key={c.admin_id}
                    onClick={() => setSelecionado(c.admin_id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                      selecionado === c.admin_id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-white/5"
                    }`}
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={c.foto_perfil_url || undefined} />
                      <AvatarFallback>{c.nome.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{c.nome}</p>
                      <p
                        className={`text-xs truncate ${
                          selecionado === c.admin_id
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground"
                        }`}
                      >
                        {c.totalParceiros} parceiro(s)
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleConfirmar} disabled={!selecionado || isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Transferir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};