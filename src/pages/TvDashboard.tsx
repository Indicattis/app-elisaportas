import { useEffect, useState, useMemo, useCallback } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSalesData, useSellersRanking, useDashboardRealtime, useWhatsAppRoulette, useAutorizadosPorAtendente } from '@/hooks/useDashboardData';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import { Progress } from "@/components/ui/progress";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useInstalacoesCadastradas } from '@/hooks/useInstalacoesCadastradas';
import { useFaturamentoPorProduto } from '@/hooks/useFaturamentoPorProduto';
import { Package, Wrench, Truck, TrendingUp } from "lucide-react";
import elisaLogoSite from "@/assets/elisa-logo-ouro.png";
import { calcularFaturamentoLiquido } from "@/utils/faturamentoCalc";
interface VendedorRanking {
  nome: string;
  total_vendas: number;
  numero_vendas: number;
  posicao: number;
  foto_perfil_url?: string;
}
export default function TvDashboard() {
  const [api, setApi] = useState<CarouselApi>();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [progress, setProgress] = useState(0);

  // Use React Query hooks for data fetching
  const {
    data: vendasData = [],
    isLoading: loadingVendas
  } = useSalesData();
  const {
    data: vendedores = [],
    isLoading: loadingVendedores
  } = useSellersRanking();
  const {
    data: whatsappStats = [],
    isLoading: loadingWhatsapp
  } = useWhatsAppRoulette();
  const {
    data: autorizadosStats = {},
    isLoading: loadingAutorizados
  } = useAutorizadosPorAtendente();

  // Hook for instalacoes data
  const { instalacoes, loading: loadingInstalacoes } = useInstalacoesCadastradas();

  // Hook for faturamento por produto
  const { data: faturamentoPorProduto = [], isLoading: loadingFaturamentoProduto } = useFaturamentoPorProduto();

  // Hook for quarterly sales data (July, August, September)
  const {
    data: vendasTrimestre = [],
    isLoading: loadingVendasTrimestre
  } = useQuery({
    queryKey: ['vendas-trimestre'],
    queryFn: async () => {
      const ano = new Date().getFullYear();
      const inicioJulho = new Date(ano, 6, 1); // Julho é mês 6 (0-indexed)
      const fimSetembro = new Date(ano, 9, 0); // Último dia de setembro

      const {
        data,
        error
      } = await supabase.
      from('vendas').
      select('data_venda, valor_venda, valor_frete, valor_credito').
      eq('is_rascunho', false).
      gte('data_venda', format(inicioJulho, 'yyyy-MM-dd')).
      lte('data_venda', format(fimSetembro, 'yyyy-MM-dd'));

      if (error) {
        console.error('Erro ao buscar vendas do trimestre:', error);
        throw error;
      }

      // Agrupar por data e calcular valor sem frete
      const vendasPorDia = (data || []).reduce((acc: {[key: string]: number;}, venda: any) => {
        const dataKey = venda.data_venda.split('T')[0];
        acc[dataKey] = (acc[dataKey] || 0) + calcularFaturamentoLiquido(venda);
        return acc;
      }, {});

      return Object.entries(vendasPorDia).map(([data, valor]) => ({
        data,
        valor
      }));
    },
    refetchInterval: 120000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true
  });

  // Setup realtime updates
  useDashboardRealtime();
  const loading = loadingVendas || loadingVendedores || loadingWhatsapp || loadingAutorizados || loadingVendasTrimestre || loadingInstalacoes || loadingFaturamentoProduto;
  const today = new Date();

  // Setup autoplay effect
  useEffect(() => {
    if (!api) return;
    const interval = setInterval(() => {
      if (!isHovering) {
        api.scrollNext();
      }
    }, 5000); // 5 seconds

    return () => clearInterval(interval);
  }, [api, isHovering]);

  // Setup progress bar effect
  useEffect(() => {
    if (!api || isHovering) return;

    const progressInterval = setInterval(() => {
      setProgress((prevProgress) => {
        if (prevProgress >= 100) {
          return 0;
        }
        return prevProgress + 2; // Increment by 2% every 100ms (5s total)
      });
    }, 100);

    return () => clearInterval(progressInterval);
  }, [api, isHovering, selectedIndex]);

  // Reset progress when slide changes
  useEffect(() => {
    setProgress(0);
  }, [selectedIndex]);

  // Setup event listeners for carousel
  useEffect(() => {
    if (!api) return;
    const onSelect = () => {
      setSelectedIndex(api.selectedScrollSnap());
    };
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    onSelect();
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api]);
  const handleDotClick = useCallback((index: number) => {
    if (api) {
      api.scrollTo(index);
    }
  }, [api]);
  const totalVendasMes = useMemo(() => {
    return vendasData.reduce((sum, venda) => sum + venda.valor, 0);
  }, [vendasData]);
  const totalVendasTrimestre = useMemo(() => {
    return vendasTrimestre.reduce((sum, venda) => sum + Number(venda.valor), 0);
  }, [vendasTrimestre]);
  const metaTrimestre = 3000000; // 3 milhões
  const faltaParaMeta = Math.max(0, metaTrimestre - totalVendasTrimestre);
  const progressoMeta = Math.min(100, totalVendasTrimestre / metaTrimestre * 100);
  const getVendedorCategory = (valor: number) => {
    if (valor >= 1500000) return {
      name: 'Orion',
      color: 'from-slate-300 to-slate-100',
      border: 'border-slate-300'
    };
    if (valor >= 1000000) return {
      name: 'Ômega',
      color: 'from-red-400 to-red-300',
      border: 'border-red-400'
    };
    if (valor >= 800000) return {
      name: 'Omni',
      color: 'from-purple-400 to-purple-300',
      border: 'border-purple-400'
    };
    if (valor >= 600000) return {
      name: 'Gama',
      color: 'from-emerald-400 to-emerald-300',
      border: 'border-emerald-400'
    };
    if (valor >= 500000) return {
      name: 'Alfa',
      color: 'from-yellow-400 to-yellow-300',
      border: 'border-yellow-400'
    };
    if (valor >= 400000) return {
      name: 'Beta',
      color: 'from-gray-400 to-gray-300',
      border: 'border-gray-400'
    };
    if (valor >= 300000) return {
      name: 'Zeta',
      color: 'from-amber-600 to-amber-500',
      border: 'border-amber-600'
    };
    return {
      name: 'Iniciante',
      color: 'from-slate-500 to-slate-400',
      border: 'border-slate-500'
    };
  };

  // Calculate instalacoes stats
  const instalacoesStats = useMemo(() => {
    const totalInstalacoes = instalacoes.length;
    const totalCorrecoes = 0; // Coluna categoria removida
    const entregasPendentes = instalacoes.filter((i) =>
    i.status !== 'finalizada'
    ).length;

    return {
      totalInstalacoes,
      totalCorrecoes,
      entregasPendentes
    };
  }, [instalacoes]);

  const getAllCategories = () => [{
    name: 'Iniciante',
    minValue: 0,
    maxValue: 300000,
    color: 'from-slate-500 to-slate-400',
    border: 'border-slate-500'
  }, {
    name: 'Zeta',
    minValue: 300000,
    maxValue: 400000,
    color: 'from-amber-600 to-amber-500',
    border: 'border-amber-600'
  }, {
    name: 'Beta',
    minValue: 400000,
    maxValue: 500000,
    color: 'from-gray-400 to-gray-300',
    border: 'border-gray-400'
  }, {
    name: 'Alfa',
    minValue: 500000,
    maxValue: 600000,
    color: 'from-yellow-400 to-yellow-300',
    border: 'border-yellow-400'
  }, {
    name: 'Gama',
    minValue: 600000,
    maxValue: 800000,
    color: 'from-emerald-400 to-emerald-300',
    border: 'border-emerald-400'
  }, {
    name: 'Omni',
    minValue: 800000,
    maxValue: 1000000,
    color: 'from-purple-400 to-purple-300',
    border: 'border-purple-400'
  }, {
    name: 'Ômega',
    minValue: 1000000,
    maxValue: 1500000,
    color: 'from-red-400 to-red-300',
    border: 'border-red-400'
  }, {
    name: 'Orion',
    minValue: 1500000,
    maxValue: Infinity,
    color: 'from-slate-300 to-slate-100',
    border: 'border-slate-300'
  }];
  return <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <Carousel setApi={setApi} className="w-full h-full" opts={{
      align: "center",
      loop: true
    }} onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}>
        <CarouselContent className="h-screen w-[100vw]">
          {/* Slide 1: Faturamento */}
          <CarouselItem className="h-full w-full flex items-center justify-center">
            <div className="h-full flex flex-col items-center justify-center p-6 space-y-6 w-full">
              {/* Título Faturamento */}
              <h1 className="font-anton text-7xl">FATURAMENTO</h1>
              
              {/* Contador das vendas do mês */}
              <div className="w-full flex justify-center">
                <div className="bg-gradient-to-r from-[#6d5e32] to-[#f0e0aa] shadow-2xl border-[3px] border-[#edd99e] p-[10px] w-full flex items-center justify-center" style={{
                height: '250px'
              }}>
                <div className="text-center">
                  {loading ? <div className="text-7xl font-inter font-medium text-white">
                      Carregando...
                    </div> : <div className="font-inter font-bold text-white" style={{
                    fontSize: '12rem'
                  }}>
                      {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    }).format(totalVendasMes)}
                    </div>}
                </div>
                </div>
              </div>

              {/* Logo */}
              <div>
                <img src={elisaLogoSite} alt="Grupo Elisa" className="h-40 w-auto" />
              </div>

            </div>
          </CarouselItem>

          {/* Slide 2: Ranking */}
          <CarouselItem className="h-full w-full flex items-center justify-center">
            <div className="h-full flex flex-col items-center justify-center p-6 space-y-6 w-[100vw]">
              {/* Container principal com ranking */}
              <div className="w-full max-w-4xl">
                {/* Lista de ranking */}
                <div className="space-y-4">
                  {vendedores.slice(0, 10).map((vendedor) => {
                  const category = getVendedorCategory(vendedor.total_vendas);
                  return <div key={`${vendedor.nome}-${vendedor.posicao}`} className="h-full flex items-center justify-between p-6 rounded-lg bg-card border border-border shadow-lg">
                        <div className="flex items-center space-x-4">
                           {/* Foto do vendedor com borda colorida */}
                          <div className="relative">
                            {vendedor.foto_perfil_url ? <img src={vendedor.foto_perfil_url} alt={`Foto de ${vendedor.nome}`} className={`w-32 h-32 rounded-full object-cover border-4 ${category.border} shadow-md`} onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).nextElementSibling!.classList.remove('hidden');
                        }} /> : null}
                            <div className={`w-32 h-32 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white font-bold text-3xl shadow-md border-4 ${category.border} ${vendedor.foto_perfil_url ? 'hidden' : ''}`}>
                              {vendedor.nome.charAt(0).toUpperCase()}
                            </div>
                          </div>
                          
                            <div className="space-y-2">
                            <h3 className="text-3xl font-bold text-foreground">
                              {vendedor.nome}
                            </h3>
                            <div className="inline-block px-4 py-2 rounded-full text-lg font-semibold text-white bg-gradient-to-r from-primary to-primary/70">
                              {autorizadosStats[vendedor.nome] || 0} autorizados
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-6xl font-bold text-foreground">
                            {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0
                        }).format(vendedor.total_vendas)}
                          </div>
                          <div className="text-lg text-muted-foreground mt-2 space-y-1">
                            <div>{vendedor.numero_vendas} vendas realizadas</div>
                            <div>{whatsappStats.find((w) => w.nome === vendedor.nome)?.total_clicks || 0} leads WhatsApp</div>
                            <div>{autorizadosStats[vendedor.nome] || 0} autorizados</div>
                          </div>
                        </div>
                      </div>;
                })}
                  
                   {vendedores.length === 0 && <div className="text-center py-12">
                      <p className="text-xl text-muted-foreground">Nenhuma venda registrada este mês</p>
                    </div>}
                </div>
              </div>
            </div>
          </CarouselItem>

        </CarouselContent>
        
        {/* Navigation arrows with responsive positioning */}
        <CarouselPrevious className="left-2 sm:-left-12" />
        <CarouselNext className="right-2 sm:-right-12" />
      </Carousel>
      
      {/* Progress Bar - Footer */}
      <div className="absolute bottom-0 left-0 w-full">
        <div className="h-1 w-full bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>;
}