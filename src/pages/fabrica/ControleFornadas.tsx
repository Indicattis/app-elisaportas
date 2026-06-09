import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, Flame, Fuel } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePinturaInicios } from "@/hooks/usePinturaInicios";
import { usePinturaTrocasGas } from "@/hooks/usePinturaTrocasGas";
import { PinturaIniciosList } from "@/components/production/PinturaIniciosList";
import { TrocasGasList } from "@/components/production/TrocasGasList";

export default function ControleFornadas() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { inicios, isLoading: isLoadingInicios, toggleRecarga } = usePinturaInicios();
  const { trocas, isLoading: isLoadingTrocas } = usePinturaTrocasGas();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["pintura-inicios"] });
    queryClient.invalidateQueries({ queryKey: ["pintura-trocas-gas"] });
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/fabrica')}
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Controle de Fornadas</h1>
              <p className="text-sm text-white/50">Fornadas e trocas de gás da pintura</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="bg-white/5 border-white/10 text-white hover:bg-white/10"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>

        <Tabs defaultValue="fornadas" className="w-full">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="fornadas" className="gap-2 data-[state=active]:bg-orange-600 data-[state=active]:text-white">
              <Flame className="h-4 w-4" />
              Fornadas
            </TabsTrigger>
            <TabsTrigger value="trocas" className="gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Fuel className="h-4 w-4" />
              Trocas de Gás
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fornadas" className="mt-4">
            <PinturaIniciosList
              inicios={inicios}
              isLoading={isLoadingInicios}
              onToggleRecarga={toggleRecarga.mutate}
              isTogglingRecarga={toggleRecarga.isPending}
            />
          </TabsContent>

          <TabsContent value="trocas" className="mt-4">
            <TrocasGasList trocas={trocas} isLoading={isLoadingTrocas} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}