import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, User, Loader2, UserMinus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  etapaLabel: string;
  responsavelAtualId?: string | null;
  onConfirm: (userId: string) => void;
  onRemover?: () => void;
  isLoading?: boolean;
}

export function SelecionarResponsavelMultaModal({
  open,
  onOpenChange,
  etapaLabel,
  responsavelAtualId,
  onConfirm,
  onRemover,
  isLoading = false,
}: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const { data: usuarios = [], isLoading: isLoadingUsuarios } = useQuery({
    queryKey: ["usuarios-responsavel-multa"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_users")
        .select("user_id, nome, email, foto_perfil_url, setor")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const usuariosFiltrados = usuarios.filter(
    (u: any) =>
      u.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleClose = () => {
    setSelectedUserId(null);
    setSearchTerm("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Responsável da etapa
          </DialogTitle>
          <DialogDescription>
            Selecione o colaborador responsável pela etapa{" "}
            <span className="font-semibold">{etapaLabel}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar colaborador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <ScrollArea className="h-[300px] rounded-md border">
            {isLoadingUsuarios ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : usuariosFiltrados.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Nenhum colaborador encontrado
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {usuariosFiltrados.map((usuario: any) => {
                  const isAtual = usuario.user_id === responsavelAtualId;
                  const isSelected = selectedUserId === usuario.user_id;
                  return (
                    <button
                      key={usuario.user_id}
                      onClick={() => setSelectedUserId(usuario.user_id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : isAtual
                          ? "bg-muted/50 border border-primary/30"
                          : "hover:bg-muted"
                      }`}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={usuario.foto_perfil_url || undefined} />
                        <AvatarFallback>
                          {usuario.nome?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{usuario.nome}</p>
                          {isAtual && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                              Atual
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {usuario.setor || usuario.email}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          <div className="flex justify-between gap-2">
            <div>
              {responsavelAtualId && onRemover && (
                <Button
                  variant="outline"
                  onClick={() => {
                    onRemover();
                    handleClose();
                  }}
                  disabled={isLoading}
                  className="text-destructive hover:text-destructive"
                >
                  <UserMinus className="h-4 w-4 mr-2" />
                  Remover
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose} disabled={isLoading}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (selectedUserId) {
                    onConfirm(selectedUserId);
                    handleClose();
                  }
                }}
                disabled={!selectedUserId || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Confirmar"
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}