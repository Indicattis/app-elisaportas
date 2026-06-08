import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Fuel, User, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrency } from "@/lib/utils";
import type { PinturaTrocaGas } from "@/hooks/usePinturaTrocasGas";

interface TrocasGasListProps {
  trocas: PinturaTrocaGas[];
  isLoading: boolean;
}

export function TrocasGasList({ trocas, isLoading }: TrocasGasListProps) {
  const total = trocas.reduce((s, t) => s + (Number(t.valor) || 0), 0);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fuel className="h-5 w-5 text-blue-600" />
            Histórico de Trocas de Gás
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (trocas.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fuel className="h-5 w-5 text-blue-600" />
            Histórico de Trocas de Gás
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Fuel className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Nenhuma troca de gás registrada ainda</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <Fuel className="h-5 w-5 text-blue-600" />
            Histórico de Trocas de Gás
          </CardTitle>
          <div className="text-sm">
            <span className="text-muted-foreground">Total: </span>
            <span className="font-semibold">{formatCurrency(total)}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {trocas.map((t) => (
              <div
                key={t.id}
                className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage src={t.admin_users?.foto_perfil_url || undefined} />
                  <AvatarFallback>
                    <User className="h-6 w-6" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{t.admin_users?.nome || "Usuário não encontrado"}</span>
                    <span className="ml-auto text-base font-semibold text-blue-700 dark:text-blue-400">
                      {formatCurrency(Number(t.valor) || 0)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {format(new Date(t.registrado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </div>
                  {t.observacoes && (
                    <p className="text-sm text-muted-foreground mt-1">{t.observacoes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}