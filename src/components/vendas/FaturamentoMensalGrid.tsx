import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useFaturamentoMensal } from "@/hooks/useFaturamentoMensal";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem,
  type CarouselApi 
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

interface FaturamentoMensalGridProps {
  onMonthClick?: (monthIndex: number) => void;
  selectedMonth?: number | null;
  year?: number;
  onYearChange?: (year: number) => void;
}

export function FaturamentoMensalGrid({ onMonthClick, selectedMonth, year, onYearChange }: FaturamentoMensalGridProps) {
  const ano = year ?? new Date().getFullYear();
  const { data: faturamento, isLoading } = useFaturamentoMensal(ano);
  const isAnoAtual = ano === new Date().getFullYear();
  const isMobile = useIsMobile();
  const [api, setApi] = useState<CarouselApi>();
  const [currentSlide, setCurrentSlide] = useState(0);

  const currentMonth = isAnoAtual ? new Date().getMonth() : -1;

  // Scroll para o mês atual quando o carousel estiver pronto
  useEffect(() => {
    if (api && isMobile) {
      api.scrollTo(Math.max(currentMonth, 0));
    }
  }, [api, currentMonth, isMobile]);

  // Atualizar slide atual quando mudar
  useEffect(() => {
    if (!api) return;
    
    const onSelect = () => {
      setCurrentSlide(api.selectedScrollSnap());
    };
    
    api.on("select", onSelect);
    onSelect(); // Chamar imediatamente para sincronizar
    
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-white/60" />
          <h3 className="text-sm font-medium text-white/60">Faturamento</h3>
          {onYearChange ? (
            <div className="flex items-center gap-1">
              <button type="button" aria-label="Ano anterior" onClick={() => onYearChange(ano - 1)} className="p-1 rounded-md text-white/60 hover:text-white hover:bg-white/10"><ChevronLeft className="h-4 w-4" /></button>
              <span className="text-sm font-semibold text-white min-w-[3rem] text-center">{ano}</span>
              <button type="button" aria-label="Próximo ano" onClick={() => onYearChange(ano + 1)} className="p-1 rounded-md text-white/60 hover:text-white hover:bg-white/10"><ChevronRight className="h-4 w-4" /></button>
            </div>
          ) : (
            <span className="text-sm font-medium text-white/60">{ano}</span>
          )}
        </div>
        {isMobile ? (
          <Skeleton className="h-28 w-full bg-blue-500/10 rounded-xl" />
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full bg-blue-500/10" />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Renderiza o card do mês (reutilizável)
  const renderMonthCard = (mes: { mes: string; valor: number; numero_vendas: number }, index: number) => {
    const isCurrentMonth = index === currentMonth;
    const isSelected = selectedMonth === index;

    return (
      <Card 
        key={mes.mes} 
        onClick={() => onMonthClick?.(index)}
        className={cn(
          "cursor-pointer transition-all",
          isCurrentMonth 
            ? "bg-blue-500 border-blue-400 hover:bg-blue-400" 
            : "bg-blue-600/20 border-blue-500/30 hover:bg-blue-500/30 hover:border-blue-400/50",
          isSelected && !isCurrentMonth && "ring-2 ring-blue-400 bg-blue-500/40"
        )}
      >
        <CardContent className={cn(
          "text-center",
          isMobile ? "p-6" : "p-3"
        )}>
          <p className={cn(
            "uppercase font-medium mb-1",
            isMobile ? "text-sm" : "text-xs",
            isCurrentMonth ? "text-white" : "text-blue-400/70"
          )}>
            {mes.mes}
          </p>
          <p className={cn(
            "font-bold leading-tight text-white",
            isMobile ? "text-2xl" : "text-base sm:text-lg"
          )}>
            {formatCurrency(mes.valor)}
          </p>
          <p className={cn(
            "mt-1",
            isMobile ? "text-xs" : "text-[10px]",
            isCurrentMonth ? "text-white/70" : "text-blue-300/50"
          )}>
            {mes.numero_vendas} venda{mes.numero_vendas !== 1 ? "s" : ""}
          </p>
        </CardContent>
      </Card>
    );
  };

  // Mobile: Carousel
  if (isMobile) {
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-white/60" />
          <h3 className="text-sm font-medium text-white/60">Faturamento</h3>
          {onYearChange ? (
            <div className="flex items-center gap-1">
              <button type="button" aria-label="Ano anterior" onClick={() => onYearChange(ano - 1)} className="p-1 rounded-md text-white/60 hover:text-white hover:bg-white/10"><ChevronLeft className="h-4 w-4" /></button>
              <span className="text-sm font-semibold text-white min-w-[3rem] text-center">{ano}</span>
              <button type="button" aria-label="Próximo ano" onClick={() => onYearChange(ano + 1)} className="p-1 rounded-md text-white/60 hover:text-white hover:bg-white/10"><ChevronRight className="h-4 w-4" /></button>
            </div>
          ) : (
            <span className="text-sm font-medium text-white/60">{ano}</span>
          )}
        </div>
        
        <Carousel 
          setApi={setApi}
          opts={{ 
            startIndex: Math.max(currentMonth, 0),
            loop: false,
            align: "center"
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2">
            {faturamento?.map((mes, index) => (
              <CarouselItem key={mes.mes} className="pl-2 basis-[85%]">
                {renderMonthCard(mes, index)}
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        {/* Indicadores (dots) */}
        <div className="flex justify-center gap-1.5 mt-4">
          {faturamento?.map((_, index) => {
            const isActive = currentSlide === index;
            const isCurrentMonthDot = index === currentMonth;
            const isSelectedDot = selectedMonth === index;
            
            return (
              <button
                key={index}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  isActive 
                    ? "w-6 bg-blue-500" 
                    : isSelectedDot
                      ? "w-2 bg-blue-400 ring-1 ring-blue-300"
                      : isCurrentMonthDot
                        ? "w-2 bg-blue-400/60"
                        : "w-2 bg-white/20"
                )}
                onClick={() => api?.scrollTo(index)}
                aria-label={`Ir para mês ${index + 1}`}
              />
            );
          })}
        </div>
      </div>
    );
  }

  // Desktop: Grid original
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="h-4 w-4 text-white/60" />
        <h3 className="text-sm font-medium text-white/60">Faturamento</h3>
          {onYearChange ? (
            <div className="flex items-center gap-1">
              <button type="button" aria-label="Ano anterior" onClick={() => onYearChange(ano - 1)} className="p-1 rounded-md text-white/60 hover:text-white hover:bg-white/10"><ChevronLeft className="h-4 w-4" /></button>
              <span className="text-sm font-semibold text-white min-w-[3rem] text-center">{ano}</span>
              <button type="button" aria-label="Próximo ano" onClick={() => onYearChange(ano + 1)} className="p-1 rounded-md text-white/60 hover:text-white hover:bg-white/10"><ChevronRight className="h-4 w-4" /></button>
            </div>
          ) : (
            <span className="text-sm font-medium text-white/60">{ano}</span>
          )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {faturamento?.map((mes, index) => renderMonthCard(mes, index))}
      </div>
    </div>
  );
}
