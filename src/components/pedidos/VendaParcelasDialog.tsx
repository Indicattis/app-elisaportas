import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { formatarMetodoPagamento } from "@/utils/pagamentoResumo";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface VendaParcelasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendaId: string;
  numeroVenda?: string | number | null;
}

interface ParcelaRow {
  id: string;
  numero_parcela: number | null;
  metodo_pagamento: string | null;
  data_vencimento: string | null;
  valor_parcela: number | null;
  pago_na_instalacao: boolean | null;
  status: string | null;
}

export function VendaParcelasDialog({ open, onOpenChange, vendaId, numeroVenda }: VendaParcelasDialogProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["venda-parcelas", vendaId],
    enabled: open && !!vendaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contas_receber")
        .select("id, numero_parcela, metodo_pagamento, data_vencimento, valor_parcela, pago_na_instalacao, status")
        .eq("venda_id", vendaId)
        .order("numero_parcela", { ascending: true })
        .order("data_vencimento", { ascending: true });
      if (error) throw error;
      return (data || []) as ParcelaRow[];
    },
  });

  const total = (data || []).reduce((sum, p) => sum + Number(p.valor_parcela || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Parcelas da venda{numeroVenda ? ` Nº ${numeroVenda}` : ""}</DialogTitle>
          <DialogDescription>Método de pagamento e valor de cada parcela.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Sem parcelas registradas.</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((p, idx) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.numero_parcela ?? idx + 1}</TableCell>
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-2">
                        <span>{formatarMetodoPagamento(p.metodo_pagamento)}</span>
                        {p.pago_na_instalacao && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-amber-500/10 text-amber-600 border-amber-500/40">
                            Na entrega
                          </Badge>
                        )}
                        {p.status === "pago" && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-emerald-500/10 text-emerald-600 border-emerald-500/40">
                            Pago
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.data_vencimento
                        ? format(new Date(`${p.data_vencimento}T12:00:00`), "dd/MM/yyyy", { locale: ptBR })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatCurrency(Number(p.valor_parcela || 0))}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={3} className="text-right text-xs uppercase tracking-wide text-muted-foreground">
                    Total
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatCurrency(total)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}