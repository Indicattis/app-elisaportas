import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Clock, RefreshCw, Truck, PackageCheck, Calendar, MapPin, Phone, Wrench, FileText, ExternalLink, ClipboardList } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { OrdemCarregamentoUnificada } from "@/hooks/useOrdensCarregamentoUnificadas";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CoresPortasEnrolar } from "@/components/shared/CoresPortasEnrolar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  OPCOES_TUBO, OPCOES_INTERNA_EXTERNA, OPCOES_POSICAO_GUIA,
  OPCOES_GUIA, OPCOES_ROLO, OPCOES_TUBO_TIRAS_FRONTAIS,
  OPCOES_LADO_MOTOR, OPCOES_APARENCIA_TESTEIRA,
} from "@/types/pedidoObservacoes";

interface OrdemCardProps {
  ordem: OrdemCarregamentoUnificada;
  onIniciarColeta: (ordem: OrdemCarregamentoUnificada) => void;
  podeIniciar: boolean;
}

function OrdemCard({ ordem, onIniciarColeta, podeIniciar }: OrdemCardProps) {
  const isInstalacao = ordem.fonte === 'instalacoes';
  const isCorrecao = ordem.fonte === 'correcoes';
  const Icon = isCorrecao ? Wrench : isInstalacao ? Wrench : ordem.tipo_carregamento === 'elisa' ? Truck : PackageCheck;

  const { data: observacoesVisita } = useQuery({
    queryKey: ['observacoes-visita-carregamento-card', ordem.pedido_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pedido_porta_observacoes')
        .select('*')
        .eq('pedido_id', ordem.pedido_id!)
        .order('indice_porta', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!ordem.pedido_id,
    staleTime: 60_000,
  });

  return (
    <Card 
      className={cn(
        "hover:shadow-md transition-all overflow-hidden",
        !podeIniciar && "opacity-60"
      )}
    >
      {/* HEADER - Mobile First */}
      <CardHeader className="min-h-[40px] py-2 px-3 sm:px-4 border-b bg-muted/30">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-1 sm:gap-4">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 text-[10px] sm:text-xs">
            <span className="text-foreground font-bold text-xs sm:text-sm truncate max-w-[140px] sm:max-w-none">
              {ordem.nome_cliente}
            </span>
            {ordem.venda?.cidade && ordem.venda?.estado && (
              <span className="text-muted-foreground hidden sm:inline">
                {ordem.venda.cidade} - {ordem.venda.estado}
              </span>
            )}
            {ordem.responsavel_carregamento_nome ? (
              <span className="font-medium text-foreground hidden sm:inline">
                • {ordem.responsavel_carregamento_nome}
              </span>
            ) : (
              <span className="text-muted-foreground italic hidden sm:inline">
                • Sem responsável
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 mt-1 sm:mt-0">
            {isCorrecao && (
              <Badge variant="outline" className="flex items-center gap-1 text-[10px] sm:text-xs h-4 sm:h-5 px-1.5 sm:px-2 bg-purple-500/10 text-purple-600 border-purple-300">
                Correção
              </Badge>
            )}
            {isInstalacao && !isCorrecao && (
              <Badge variant="outline" className="flex items-center gap-1 text-[10px] sm:text-xs h-4 sm:h-5 px-1.5 sm:px-2 bg-orange-500/10 text-orange-600 border-orange-300">
                {ordem.tipo_entrega === 'manutencao' ? 'Manutenção' : 'Instalação'}
              </Badge>
            )}
            <Badge 
              variant={ordem.tipo_carregamento === 'elisa' ? 'default' : 'outline'} 
              className="flex items-center gap-1 text-[10px] sm:text-xs h-4 sm:h-5 px-1.5 sm:px-2"
            >
              <Icon className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              {ordem.tipo_carregamento === 'elisa' ? 'Elisa' : ordem.tipo_carregamento === 'autorizados' ? 'Autorizado' : ordem.tipo_carregamento || 'N/A'}
            </Badge>
            <Badge variant={podeIniciar ? 'default' : 'secondary'} className="text-[10px] sm:text-xs h-4 sm:h-5 px-1.5 sm:px-2">
              {ordem.status === 'agendada' ? 'Agendada' : ordem.status}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      {/* BODY - Mobile First */}
      <CardContent className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-4">
          {/* LATERAL ESQUERDA - Ícone (oculto em mobile pequeno) */}
          <div 
            className="hidden sm:flex flex-shrink-0 cursor-pointer"
            onClick={() => podeIniciar && onIniciarColeta(ordem)}
          >
            <div className="h-16 w-16 md:h-20 md:w-20 lg:h-[100px] lg:w-[100px] rounded-full bg-muted/50 flex items-center justify-center">
              <Icon className="h-8 w-8 md:h-10 md:w-10 lg:h-12 lg:w-12 text-muted-foreground/70" />
            </div>
          </div>

          {/* CENTRO - Informações */}
          <div 
            className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 cursor-pointer min-w-0 w-full"
            onClick={() => podeIniciar && onIniciarColeta(ordem)}
          >
            {/* Info mobile only */}
            <div className="sm:hidden">
              {ordem.venda?.cidade && ordem.venda?.estado && (
                <p className="text-[10px] text-muted-foreground">
                  {ordem.venda.cidade} - {ordem.venda.estado}
                </p>
              )}
              {ordem.responsavel_carregamento_nome && (
                <p className="text-xs font-medium">{ordem.responsavel_carregamento_nome}</p>
              )}
            </div>

            {ordem.data_carregamento ? (
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  Data Agendada
                </p>
                <p className="text-xs sm:text-sm font-semibold">
                  {format(new Date(ordem.data_carregamento + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })}
                  {ordem.hora && ` às ${ordem.hora}`}
                </p>
              </div>
            ) : (
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  Data de Carregamento
                </p>
                <p className="text-xs sm:text-sm font-semibold text-orange-500">
                  Aguardando agendamento
                </p>
              </div>
            )}
            
            {ordem.responsavel_carregamento_nome && (
              <div className="hidden sm:block">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Responsável</p>
                <p className="text-xs sm:text-sm font-semibold truncate">{ordem.responsavel_carregamento_nome}</p>
              </div>
            )}

            {ordem.venda?.cidade && ordem.venda?.estado && (
              <div className="hidden sm:block">
                <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  Localização
                </p>
                <p className="text-xs sm:text-sm truncate">
                  {ordem.venda.cidade} - {ordem.venda.estado}
                </p>
              </div>
            )}

            {ordem.venda?.cliente_telefone && (
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
                  <Phone className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  Telefone
                </p>
                <p className="text-xs sm:text-sm">{ordem.venda.cliente_telefone}</p>
              </div>
            )}

            <div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">Cores das Portas</p>
              <CoresPortasEnrolar produtos={ordem.venda?.produtos} />
            </div>

            {ordem.observacoes && (
              <div className="col-span-1 sm:col-span-2">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Observações</p>
                <p className="text-[10px] sm:text-xs line-clamp-2">{ordem.observacoes}</p>
              </div>
            )}

            <div className="col-span-1 sm:col-span-2">
              <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 mb-1">
                <FileText className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                Visita Técnica
              </p>
              {ordem.pedido?.ficha_visita_url ? (
                <a
                  href={ordem.pedido.ficha_visita_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors bg-blue-500/10 hover:bg-blue-500/20 px-2 py-1 rounded-md max-w-full"
                >
                  <FileText className="h-3 w-3 shrink-0" />
                  <span className="truncate">{ordem.pedido.ficha_visita_nome || 'Ver ficha de visita'}</span>
                  <ExternalLink className="h-2.5 w-2.5 opacity-60 shrink-0" />
                </a>
              ) : (
                <p className="text-[10px] sm:text-xs text-muted-foreground italic">Sem ficha de visita anexada</p>
              )}
            </div>

            {observacoesVisita && observacoesVisita.length > 0 && (
              <div className="col-span-1 sm:col-span-2">
                <p className="text-[10px] sm:text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium mb-1">
                  <ClipboardList className="h-3 w-3" />
                  Observações da Visita ({observacoesVisita.length} {observacoesVisita.length === 1 ? 'porta' : 'portas'})
                </p>
                <div className="space-y-1.5">
                  {observacoesVisita.map((obs: any, idx: number) => {
                    const items = [
                      obs.opcao_tubo && OPCOES_TUBO[obs.opcao_tubo as keyof typeof OPCOES_TUBO],
                      obs.interna_externa && OPCOES_INTERNA_EXTERNA[obs.interna_externa as keyof typeof OPCOES_INTERNA_EXTERNA],
                      obs.posicao_guia && OPCOES_POSICAO_GUIA[obs.posicao_guia as keyof typeof OPCOES_POSICAO_GUIA],
                      obs.opcao_guia && OPCOES_GUIA[obs.opcao_guia as keyof typeof OPCOES_GUIA],
                      obs.opcao_rolo && OPCOES_ROLO[obs.opcao_rolo as keyof typeof OPCOES_ROLO],
                      obs.tubo_tiras_frontais && OPCOES_TUBO_TIRAS_FRONTAIS[obs.tubo_tiras_frontais as keyof typeof OPCOES_TUBO_TIRAS_FRONTAIS],
                      obs.lado_motor && `Motor: ${OPCOES_LADO_MOTOR[obs.lado_motor as keyof typeof OPCOES_LADO_MOTOR]}`,
                      obs.aparencia_testeira && `Testeira: ${OPCOES_APARENCIA_TESTEIRA[obs.aparencia_testeira as keyof typeof OPCOES_APARENCIA_TESTEIRA]}`,
                    ].filter(Boolean);

                    if (items.length === 0) return null;

                    return (
                      <div key={obs.id || idx} className="text-[10px] sm:text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 rounded px-2 py-1 border border-amber-200 dark:border-amber-800">
                        {observacoesVisita.length > 1 && (
                          <span className="font-semibold">Porta {(obs.indice_porta ?? idx) + 1}: </span>
                        )}
                        {items.join(' · ')}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* LATERAL DIREITA - Botão Iniciar */}
          <div className="w-full sm:w-auto flex-shrink-0">
            <Button
              size="lg"
              variant="default"
              onClick={(e) => {
                e.stopPropagation();
                onIniciarColeta(ordem);
              }}
              disabled={!podeIniciar}
              className="h-12 w-full sm:h-16 sm:w-16 md:h-20 md:w-20 lg:h-[100px] lg:w-[100px] sm:rounded-full rounded-lg flex flex-row sm:flex-col gap-2 p-2"
            >
              <PackageCheck className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8" />
              <span className="text-[10px] sm:text-xs font-semibold text-center">
                {!ordem.data_carregamento 
                  ? 'Sem Data' 
                  : !ordem.responsavel_carregamento_nome 
                    ? 'Sem Responsável' 
                    : 'Iniciar Coleta'}
              </span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface CarregamentoKanbanProps {
  ordens: OrdemCarregamentoUnificada[];
  isLoading: boolean;
  onIniciarColeta: (ordem: OrdemCarregamentoUnificada) => void;
  onRefresh?: () => void;
}

export function CarregamentoKanban({
  ordens,
  isLoading,
  onIniciarColeta,
  onRefresh,
}: CarregamentoKanbanProps) {
  const podeIniciarColeta = (ordem: OrdemCarregamentoUnificada) => {
    // Só pode iniciar se tiver data de carregamento agendada E responsável definido
    return !ordem.carregamento_concluido && 
           !!ordem.data_carregamento && 
           !!ordem.responsavel_carregamento_nome;
  };

  const renderSkeletons = () => (
    <>
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader className="pb-3">
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-4 w-24" />
          </CardContent>
        </Card>
      ))}
    </>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
            Ordens Pendentes
          </h2>
          <Badge variant="secondary" className="text-xs">{isLoading ? '...' : ordens.length}</Badge>
        </div>
        {onRefresh && (
          <Button onClick={onRefresh} variant="outline" size="sm" className="h-8 text-xs sm:text-sm">
            <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
        )}
      </div>

      {/* Lista de Ordens */}
      <div className="space-y-2 sm:space-y-3">
        {isLoading ? (
          renderSkeletons()
        ) : ordens.length > 0 ? (
          ordens.map(ordem => (
            <OrdemCard
              key={ordem.id}
              ordem={ordem}
              onIniciarColeta={onIniciarColeta}
              podeIniciar={podeIniciarColeta(ordem)}
            />
          ))
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
              <Truck className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/50 mb-3 sm:mb-4" />
              <p className="text-xs sm:text-sm text-muted-foreground">
                Nenhuma ordem de carregamento pendente
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
