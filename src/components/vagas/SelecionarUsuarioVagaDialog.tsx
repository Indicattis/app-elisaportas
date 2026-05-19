import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { type User } from "@/hooks/useAllUsers";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, UserPlus } from "lucide-react";
import { ROLE_LABELS } from "@/types/permissions";
import { SETOR_LABELS } from "@/utils/setorMapping";

interface SelecionarUsuarioVagaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vagaCargo: string;
  vagaId?: string;
  onSelectExisting: (user: User) => void;
  onCreateNew: () => void;
}

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

export function SelecionarUsuarioVagaDialog({
  open, onOpenChange, vagaCargo, vagaId, onSelectExisting, onCreateNew,
}: SelecionarUsuarioVagaDialogProps) {
  const [search, setSearch] = useState("");
  const [selecting, setSelecting] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Inclui usuários ativos mesmo que estejam fora do organograma,
  // para permitir reanexá-los a uma vaga.
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["all-users-including-hidden"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_users")
        .select("*")
        .eq("ativo", true)
        .in("tipo_usuario", ["colaborador", "metamorfo"])
        .order("nome");
      if (error) throw error;
      return (data || []) as unknown as (User & { visivel_organograma?: boolean })[];
    },
    enabled: open,
  });

  const filtered = users.filter(u =>
    u.nome.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = async (user: User) => {
    setSelecting(user.id);
    try {
      if (!vagaId) {
        throw new Error("Vaga não informada");
      }
      const { error } = await supabase.rpc("preencher_vaga_com_usuario" as any, {
        p_vaga_id: vagaId,
        p_admin_user_id: user.id,
      });
      if (error) throw error;

      toast.success(`${user.nome} foi atribuído à vaga`);
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      queryClient.invalidateQueries({ queryKey: ["all-users-including-hidden"] });
      queryClient.invalidateQueries({ queryKey: ["vagas"] });
      onSelectExisting(user);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao atribuir usuário à vaga");
      console.error(err);
    } finally {
      setSelecting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Preencher Vaga</DialogTitle>
          <DialogDescription>
            Selecione um colaborador existente ou crie um novo.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 min-h-0 max-h-[400px]">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum colaborador encontrado.
            </p>
          ) : (
            filtered.map(user => (
              <div
                key={user.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer group"
                onClick={() => !selecting && handleSelect(user)}
              >
                <Avatar className="h-8 w-8">
                  {user.foto_perfil_url && <AvatarImage src={user.foto_perfil_url} />}
                  <AvatarFallback className="text-xs">{getInitials(user.nome)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="text-sm font-medium truncate">{user.nome}</p>
                    {(user as any).visivel_organograma === false && (
                      <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-500">
                        Fora do organograma
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {(ROLE_LABELS as any)[user.role] || user.role}
                  </p>
                </div>
                {selecting === user.id ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity">
                    Selecionar
                  </Button>
                )}
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={onCreateNew}>
            <UserPlus className="h-4 w-4 mr-2" />
            Criar Novo Colaborador
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
