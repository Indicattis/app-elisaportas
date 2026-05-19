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
    return ativos
      .filter(v => v.user_id !== user?.id)
      .filter(v => v.nome.toLowerCase().includes(busca.toLowerCase()));
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Delegar Cliente
          </DialogTitle>
          <DialogDescription>
            Selecione o vendedor que passará a ser responsável por <strong>{clienteNome}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar vendedor..."
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
            ) : vendedores.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                Nenhum vendedor encontrado
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {vendedores.map((v) => (
                  <button
                    key={v.user_id}
                    onClick={() => setSelecionado(v.user_id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                      selecionado === v.user_id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-white/5"
                    }`}
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={v.foto_perfil_url || undefined} />
                      <AvatarFallback>{v.nome.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{v.nome}</p>
                      <p className={`text-xs truncate ${selecionado === v.user_id ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {v.totalClientes} cliente(s)
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
            Delegar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};