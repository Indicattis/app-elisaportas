import { useState, useMemo } from "react";
import { Loader2, Search, UserCheck } from "lucide-react";
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
import { useVendedoresParaTransferencia, useDelegarCliente } from "@/hooks/useClientes";
import { useAuth } from "@/hooks/useAuth";

interface DelegarClienteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteId: string;
  clienteNome: string;
}

export const DelegarClienteModal = ({ open, onOpenChange, clienteId, clienteNome }: DelegarClienteModalProps) => {
  const { user } = useAuth();
  const { data, isLoading } = useVendedoresParaTransferencia();
  const { mutate: delegar, isPending } = useDelegarCliente();
  const [busca, setBusca] = useState("");
  const [selecionado, setSelecionado] = useState<string | null>(null);

  const vendedores = useMemo(() => {
    const ativos = data?.ativos ?? [];
    const inativosComClientes = data?.inativosComClientes ?? [];
    return [...ativos, ...inativosComClientes]
      .filter(v => v.user_id !== user?.id)
      .filter(v => v.nome.toLowerCase().includes(busca.toLowerCase()))
      .sort((a, b) => (b.totalClientes - a.totalClientes) || a.nome.localeCompare(b.nome));
  }, [data, busca, user?.id]);

  const handleConfirmar = () => {
    if (!selecionado) return;
    delegar(
      { clienteId, destinoUserId: selecionado },
      {
        onSuccess: () => {
          onOpenChange(false);
          setSelecionado(null);
          setBusca("");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-background/80 backdrop-blur-xl border-white/10">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center">
              <UserCheck className="h-4 w-4 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base">Delegar cliente</DialogTitle>
              <DialogDescription className="text-xs">
                Novo responsável por <strong className="text-foreground/90">{clienteNome}</strong>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar colaborador..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10 h-10 bg-white/5 border-white/10"
            />
          </div>

          <ScrollArea className="h-[320px] rounded-xl border border-white/10 bg-white/[0.02]">
            {isLoading ? (
              <div className="flex items-center justify-center h-[320px]">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : vendedores.length === 0 ? (
              <div className="flex items-center justify-center h-[320px] text-sm text-muted-foreground">
                Nenhum colaborador encontrado
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {vendedores.map((v) => {
                  const ativo = selecionado === v.user_id;
                  return (
                    <button
                      key={v.user_id}
                      onClick={() => setSelecionado(v.user_id)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left border transition-all ${
                        ativo
                          ? "bg-primary/15 border-primary/40 ring-1 ring-primary/30"
                          : "border-transparent hover:bg-white/5 hover:border-white/10"
                      }`}
                    >
                      <Avatar className="h-9 w-9 border border-white/10">
                        <AvatarImage src={v.foto_perfil_url || undefined} />
                        <AvatarFallback className="text-xs bg-white/10">
                          {v.nome.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate flex items-center gap-2">
                          {v.nome}
                          {!v.ativo && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/20">
                              inativo
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {v.totalClientes === 0
                            ? "Sem clientes na cartela"
                            : `${v.totalClientes} cliente${v.totalClientes > 1 ? "s" : ""} na cartela`}
                        </p>
                      </div>
                      {ativo && <Check className="h-4 w-4 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          <p className="text-[11px] text-muted-foreground">
            Sua própria conta não é listada, pois o cliente já está sob sua responsabilidade.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleConfirmar} disabled={!selecionado || isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Delegar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};