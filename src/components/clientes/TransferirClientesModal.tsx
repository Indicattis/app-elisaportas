import { useState, useMemo } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
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
import { useVendedoresParaTransferencia, useTransferirClientes } from "@/hooks/useClientes";

interface TransferirClientesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const TransferirClientesModal = ({ open, onOpenChange }: TransferirClientesModalProps) => {
  const { data, isLoading } = useVendedoresParaTransferencia();
  const { mutate: transferir, isPending } = useTransferirClientes();
  const [origem, setOrigem] = useState<string>("");
  const [destino, setDestino] = useState<string>("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const origemSelecionado = useMemo(
    () => data?.inativosComClientes.find(v => v.user_id === origem),
    [data, origem]
  );
  const destinoSelecionado = useMemo(
    () => data?.ativos.find(v => v.user_id === destino),
    [data, destino]
  );

  const handleConfirmar = () => {
    transferir(
      { origemUserId: origem, destinoUserId: destino },
      {
        onSuccess: () => {
          setConfirmOpen(false);
          onOpenChange(false);
          setOrigem("");
          setDestino("");
        },
      }
    );
  };

  const podeTransferir = origem && destino && origem !== destino;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Transferir Clientes</DialogTitle>
            <DialogDescription>
              Reatribua os clientes de um vendedor desativado para outro vendedor ativo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm text-white/70">Vendedor de origem (desativado)</label>
              <Select value={origem} onValueChange={setOrigem} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={isLoading ? "Carregando..." : "Selecione um vendedor"} />
                </SelectTrigger>
                <SelectContent>
                  {data?.inativosComClientes.length === 0 && (
                    <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                      Nenhum vendedor desativado com clientes.
                    </div>
                  )}
                  {data?.inativosComClientes.map(v => (
                    <SelectItem key={v.user_id} value={v.user_id}>
                      {v.nome} ({v.totalClientes} clientes)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-white/70">Vendedor de destino</label>
              <Select value={destino} onValueChange={setDestino} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um vendedor ativo" />
                </SelectTrigger>
                <SelectContent>
                  {data?.ativos
                    .filter(v => v.user_id !== origem)
                    .map(v => (
                      <SelectItem key={v.user_id} value={v.user_id}>
                        {v.nome}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {origemSelecionado && destinoSelecionado && (
              <div className="rounded-lg border border-white/10 bg-white/5 p-3 flex items-center gap-2 text-sm">
                <span className="text-white/80">{origemSelecionado.nome}</span>
                <ArrowRight className="h-4 w-4 text-white/50" />
                <span className="text-white/80">{destinoSelecionado.nome}</span>
                <span className="ml-auto text-white/60">
                  {origemSelecionado.totalClientes} cliente(s)
                </span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={!podeTransferir || isPending}
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Transferir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar transferência</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a transferir {origemSelecionado?.totalClientes} cliente(s) de{" "}
              <strong>{origemSelecionado?.nome}</strong> para{" "}
              <strong>{destinoSelecionado?.nome}</strong>. Esta ação não pode ser desfeita
              automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmar} disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
