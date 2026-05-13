import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useDesempenhoEtapas, DesempenhoColaborador } from "@/hooks/useDesempenhoEtapas";
import { Cog, Flame, Package, Paintbrush, Truck, CalendarIcon } from "lucide-react";
import { format, startOfWeek, startOfMonth, startOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { ColaboradorDesempenhoModal } from "@/components/producao/ColaboradorDesempenhoModal";

type CampoDesempenho = keyof Pick<DesempenhoColaborador, 'perfiladas_metros' | 'soldadas' | 'separadas' | 'pintura_m2' | 'carregamentos'>;

interface MiniRankingProps {
  colaboradores: DesempenhoColaborador[];
  campo: CampoDesempenho;
  unidade?: string;
  isLoading: boolean;
  onColaboradorClick?: (userId: string) => void;
}

function MiniRanking({ colaboradores, campo, unidade = "", isLoading, onColaboradorClick }: MiniRankingProps) {
  if (isLoading) {
    return (
      <div className="mt-2 pt-2 border-t border-border/50 space-y-2 flex flex-col items-center">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-5 w-[180px]" />
        ))}
      </div>
    );
  }

  const top3 = colaboradores
    .filter((c) => c[campo] > 0)
    .sort((a, b) => b[campo] - a[campo])
    .slice(0, 3);

  if (top3.length === 0) {
    return (
      <div className="mt-2 pt-2 border-t border-border/50 flex justify-center">
        <p className="text-[10px] text-muted-foreground italic">Sem produção</p>
      </div>
    );
  }

  return (
    <div className="mt-2 pt-2 border-t border-border/50 space-y-2 flex flex-col items-center">
      {top3.map((c, i) => {
        const valorRaw = c[campo];
        const valor = (campo === 'pintura_m2' || campo === 'perfiladas_metros')
          ? valorRaw.toFixed(1).replace('.', ',')
          : valorRaw;
        const iniciais = c.nome
          .split(" ")
          .map((n) => n[0])
          .slice(0, 2)
          .join("")
          .toUpperCase();
        const primeiroNome = c.nome.split(" ")[0];

        // Renderização especial para soldadas com P/G
        const isSoldadas = campo === 'soldadas';
        const temPG = isSoldadas && (c.soldadas_p > 0 || c.soldadas_g > 0);

        return (
          <div 
            key={c.user_id} 
            className="flex items-center justify-center gap-2 text-[11px] max-w-[200px] w-full bg-blue-500/10 border border-blue-500/30 rounded-lg px-2 py-1.5 cursor-pointer hover:bg-blue-500/20 transition-colors"
            onClick={() => onColaboradorClick?.(c.user_id)}
          >
            <Avatar className="h-6 w-6">
              <AvatarImage src={c.foto_perfil_url || undefined} alt={c.nome} />
              <AvatarFallback className="text-[8px]">{iniciais}</AvatarFallback>
            </Avatar>
            <span className="truncate flex-1 text-foreground">{primeiroNome}</span>
            {isSoldadas && temPG ? (
              <span className="font-semibold text-foreground flex items-center gap-1">
                {c.soldadas_p > 0 && (
                  <Badge className="bg-blue-500 hover:bg-blue-500 text-white text-[9px] px-1.5 py-0 h-4 font-bold">
                    {c.soldadas_p}P
                  </Badge>
                )}
                {c.soldadas_g > 0 && (
                  <Badge className="bg-orange-500 hover:bg-orange-500 text-white text-[9px] px-1.5 py-0 h-4 font-bold">
                    {c.soldadas_g}G
                  </Badge>
                )}
              </span>
            ) : (
              <span className="font-semibold text-foreground">
                {valor}{unidade}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

type Periodo = 'hoje' | 'semana' | 'mes' | 'ano' | 'dia' | 'personalizado';

export function PortasPorEtapa() {
  const [periodo, setPeriodo] = useState<Periodo>('hoje');
  const [dataInicioCustom, setDataInicioCustom] = useState<Date | undefined>();
  const [dataFimCustom, setDataFimCustom] = useState<Date | undefined>();
  const [selectedColaboradorId, setSelectedColaboradorId] = useState<string | null>(null);

  const handleColaboradorClick = (userId: string) => {
    setSelectedColaboradorId(userId);
  };

  const { dataInicio, dataFim } = useMemo(() => {
    const hoje = new Date();
    switch (periodo) {
      case 'hoje':
        return { 
          dataInicio: format(hoje, 'yyyy-MM-dd'), 
          dataFim: format(hoje, 'yyyy-MM-dd') 
        };
      case 'semana':
        return { 
          dataInicio: format(startOfWeek(hoje, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
          dataFim: format(hoje, 'yyyy-MM-dd') 
        };
      case 'mes':
        return { 
          dataInicio: format(startOfMonth(hoje), 'yyyy-MM-dd'),
          dataFim: format(hoje, 'yyyy-MM-dd') 
        };
      case 'ano':
        return { 
          dataInicio: format(startOfYear(hoje), 'yyyy-MM-dd'),
          dataFim: format(hoje, 'yyyy-MM-dd') 
        };
      case 'dia':
        return { 
          dataInicio: dataInicioCustom ? format(dataInicioCustom, 'yyyy-MM-dd') : format(hoje, 'yyyy-MM-dd'),
          dataFim: dataInicioCustom ? format(dataInicioCustom, 'yyyy-MM-dd') : format(hoje, 'yyyy-MM-dd')
        };
      case 'personalizado':
        return {
          dataInicio: dataInicioCustom ? format(dataInicioCustom, 'yyyy-MM-dd') : format(startOfMonth(hoje), 'yyyy-MM-dd'),
          dataFim: dataFimCustom ? format(dataFimCustom, 'yyyy-MM-dd') : format(hoje, 'yyyy-MM-dd')
        };
    }
  }, [periodo, dataInicioCustom, dataFimCustom]);

  const { data: desempenho = [], isLoading: isLoadingDesempenho } = useDesempenhoEtapas(dataInicio, dataFim);

  const totais = useMemo(() => {
    return desempenho.reduce(
      (acc, col) => ({
        metros_perfilados: acc.metros_perfilados + (col.perfiladas_metros || 0),
        portas_soldadas: acc.portas_soldadas + (col.soldadas || 0),
        pedidos_separados: acc.pedidos_separados + (col.separadas || 0),
        pintura_m2: acc.pintura_m2 + (col.pintura_m2 || 0),
        carregamentos: acc.carregamentos + (col.carregamentos || 0),
      }),
      { metros_perfilados: 0, portas_soldadas: 0, pedidos_separados: 0, pintura_m2: 0, carregamentos: 0 }
    );
  }, [desempenho]);

  const getPeriodoLabel = () => {
    switch (periodo) {
      case 'hoje': return 'Hoje';
      case 'semana': return 'Esta Semana';
      case 'mes': return 'Este Mês';
      case 'ano': return 'Este Ano';
      case 'dia': 
        return dataInicioCustom ? format(dataInicioCustom, "dd/MM/yyyy") : 'Dia Específico';
      case 'personalizado':
        if (dataInicioCustom && dataFimCustom) {
          return `${format(dataInicioCustom, "dd/MM")} - ${format(dataFimCustom, "dd/MM")}`;
        }
        return 'Personalizado';
    }
  };

  const metrosFormatados = totais.metros_perfilados 
    ? `${totais.metros_perfilados.toFixed(2).replace('.', ',')}m`
    : "0m";

  const pinturaFormatada = totais.pintura_m2 
    ? `${totais.pintura_m2.toFixed(1).replace('.', ',')} m²`
    : "0 m²";

  const etapas: {
    label: string;
    value: number | string;
    extra: string | null;
    icon: typeof Cog;
    bgColor: string;
    iconColor: string;
    campoRanking: CampoDesempenho;
    unidadeRanking: string;
  }[] = [
    {
      label: "Perfiladas",
      value: metrosFormatados,
      extra: null,
      icon: Cog,
      bgColor: "bg-blue-500/10",
      iconColor: "text-blue-500",
      campoRanking: "perfiladas_metros",
      unidadeRanking: "m",
    },
    {
      label: "Soldadas",
      value: totais.portas_soldadas,
      extra: "portas",
      icon: Flame,
      bgColor: "bg-orange-500/10",
      iconColor: "text-orange-500",
      campoRanking: "soldadas",
      unidadeRanking: "",
    },
    {
      label: "Separadas",
      value: totais.pedidos_separados,
      extra: "pedidos",
      icon: Package,
      bgColor: "bg-green-500/10",
      iconColor: "text-green-500",
      campoRanking: "separadas",
      unidadeRanking: "",
    },
    {
      label: "Pintura",
      value: pinturaFormatada,
      extra: null,
      icon: Paintbrush,
      bgColor: "bg-purple-500/10",
      iconColor: "text-purple-500",
      campoRanking: "pintura_m2",
      unidadeRanking: "m²",
    },
    {
      label: "Carregamentos",
      value: totais.carregamentos,
      extra: null,
      icon: Truck,
      bgColor: "bg-emerald-600/10",
      iconColor: "text-emerald-600",
      campoRanking: "carregamentos",
      unidadeRanking: "",
    },
  ];

  return (
    <Card className="p-4 bg-white/5 border-white/10 backdrop-blur-xl text-white">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <h3 className="text-sm font-medium text-white/70">
          Desempenho por Etapa ({getPeriodoLabel()})
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
            <SelectTrigger className="w-[140px] h-9 text-xs bg-white/5 border-white/10 hover:bg-white/[0.07] hover:border-blue-400/30 backdrop-blur-xl text-white rounded-lg transition-all">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-950/95 border-white/10 backdrop-blur-xl text-white">
              <SelectItem value="hoje">Hoje</SelectItem>
              <SelectItem value="semana">Semana</SelectItem>
              <SelectItem value="mes">Mês</SelectItem>
              <SelectItem value="ano">Ano</SelectItem>
              <SelectItem value="dia">Dia Específico</SelectItem>
              <SelectItem value="personalizado">Personalizado</SelectItem>
            </SelectContent>
          </Select>

          {periodo === 'dia' && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {dataInicioCustom ? format(dataInicioCustom, "dd/MM/yyyy") : "Escolher"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={dataInicioCustom}
                  onSelect={(date) => {
                    setDataInicioCustom(date);
                    setDataFimCustom(date);
                  }}
                  locale={ptBR}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          )}

          {periodo === 'personalizado' && (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {dataInicioCustom ? format(dataInicioCustom, "dd/MM/yy") : "Início"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={dataInicioCustom}
                    onSelect={setDataInicioCustom}
                    locale={ptBR}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {dataFimCustom ? format(dataFimCustom, "dd/MM/yy") : "Fim"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={dataFimCustom}
                    onSelect={setDataFimCustom}
                    locale={ptBR}
                    initialFocus
                    disabled={(date) => dataInicioCustom ? date < dataInicioCustom : false}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {etapas.map((etapa) => {
          const Icon = etapa.icon;
          return (
            <div
              key={etapa.label}
              className="flex flex-col gap-3 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xl hover:bg-white/[0.08] hover:border-blue-400/30 hover:shadow-[0_0_0_1px_rgba(96,165,250,0.15)] transition-all"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-md ${etapa.bgColor}`}>
                  <Icon className={`h-5 w-5 ${etapa.iconColor}`} />
                </div>
                <div>
                  <p className="text-xs text-white/60">{etapa.label}</p>
                  {isLoadingDesempenho ? (
                    <Skeleton className="h-6 w-12 mt-1" />
                  ) : (
                    <p className="text-xl font-bold text-white">
                      {etapa.value}
                      {etapa.extra && (
                        <span className="text-sm font-normal text-white/60 ml-1">
                          {etapa.extra}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>
              <MiniRanking
                colaboradores={desempenho}
                campo={etapa.campoRanking}
                unidade={etapa.unidadeRanking}
                isLoading={isLoadingDesempenho}
                onColaboradorClick={handleColaboradorClick}
              />
            </div>
          );
        })}
      </div>

      <ColaboradorDesempenhoModal
        userId={selectedColaboradorId}
        open={!!selectedColaboradorId}
        onOpenChange={(open) => { if (!open) setSelectedColaboradorId(null); }}
      />
    </Card>
  );
}
