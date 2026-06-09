import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Flame, Clock, User, Droplet, Check, CheckCircle2, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface PinturaInicio {
  id: string;
  iniciado_em: string;
  observacoes?: string | null;
  recarga_realizada: boolean;
  recarga_realizada_em?: string | null;
  recarga_admin_users?: {
    nome: string;
    foto_perfil_url?: string | null;
  } | null;
  admin_users: {
    id: string;
    nome: string;
    foto_perfil_url?: string | null;
  } | null;
}

interface PinturaIniciosListProps {
  inicios: PinturaInicio[];
  isLoading: boolean;
  onToggleRecarga: (inicioId: string) => void;
  isTogglingRecarga?: boolean;
  onExcluir?: (inicioId: string) => void;
  isExcluindo?: boolean;
}

export function PinturaIniciosList({ inicios, isLoading, onToggleRecarga, isTogglingRecarga, onExcluir, isExcluindo }: PinturaIniciosListProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-600" />
            Histórico de Fornadas
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

  if (inicios.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-600" />
            Histórico de Fornadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Flame className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              Nenhum início de pintura registrado ainda
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-600" />
            Histórico de Fornadas
          </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {inicios.map((inicio) => (
              <div
                key={inicio.id}
                className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                  inicio.recarga_realizada 
                    ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800" 
                    : "bg-card hover:bg-accent/50"
                }`}
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage src={inicio.admin_users?.foto_perfil_url || undefined} />
                  <AvatarFallback>
                    <User className="h-6 w-6" />
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">
                      {inicio.admin_users?.nome || "Usuário não encontrado"}
                    </span>
                    {inicio.recarga_realizada && (
                      <Badge variant="outline" className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Recarga Realizada
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span className="font-medium">Início:</span>
                      {format(new Date(inicio.iniciado_em), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </div>
                  </div>

                  {inicio.recarga_realizada && inicio.recarga_realizada_em && (
                    <div className="flex items-center gap-4 text-sm text-green-700 dark:text-green-400">
                      <div className="flex items-center gap-1">
                        <Droplet className="h-3.5 w-3.5" />
                        <span className="font-medium">Recarga:</span>
                        {format(new Date(inicio.recarga_realizada_em), "dd/MM/yyyy 'às' HH:mm", {
                          locale: ptBR,
                        })}
                        {inicio.recarga_admin_users && (
                          <span className="ml-1">
                            por {inicio.recarga_admin_users.nome}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {inicio.observacoes && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {inicio.observacoes}
                    </p>
                  )}
                </div>

                <Button
                  size="sm"
                  variant={inicio.recarga_realizada ? "secondary" : "outline"}
                  onClick={() => onToggleRecarga(inicio.id)}
                  disabled={isTogglingRecarga || inicio.recarga_realizada}
                  className={`min-h-[85px] w-[30%] ${
                    inicio.recarga_realizada 
                      ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30 cursor-not-allowed opacity-60" 
                      : "hover:bg-primary/10 hover:text-primary hover:border-primary"
                  }`}
                  title={inicio.recarga_realizada ? "Recarga já realizada" : "Marcar recarga"}
                >
                  <div className="flex flex-col items-center gap-1">
                    {inicio.recarga_realizada ? (
                      <>
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="text-xs">Recargado</span>
                      </>
                    ) : (
                      <>
                        <Droplet className="h-5 w-5" />
                        <span className="text-xs">Recarregar</span>
                      </>
                    )}
                  </div>
                </Button>
                {onExcluir && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={isExcluindo}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Excluir fornada"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir fornada?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. O registro será removido permanentemente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onExcluir(inicio.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
