import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AutorizadosMapLeaflet from "@/components/AutorizadosMapLeaflet";
import { useInstalacoesCadastradas } from "@/hooks/useInstalacoesCadastradas";
import { MapaFiltrosAvancados, MapaFiltros } from "@/components/MapaFiltrosAvancados";
import { MapaLocalizacaoPesquisa } from "@/components/MapaLocalizacaoPesquisa";
import { Badge } from "@/components/ui/badge";
import { AutorizadoEtapa, RepresentanteEtapa, FranqueadoEtapa } from "@/utils/etapas";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface Autorizado {
  id: string;
  nome: string;
  email?: string;
  telefone?: string;
  whatsapp?: string;
  responsavel?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  regiao?: string;
  ativo: boolean;
  logo_url?: string;
  latitude?: number;
  longitude?: number;
  last_geocoded_at?: string;
  geocode_precision?: string;
  created_at: string;
  updated_at: string;
  vendedor_id?: string;
  tipo_parceiro: 'autorizado' | 'representante' | 'franqueado';
  etapa?: AutorizadoEtapa;
  representante_etapa?: RepresentanteEtapa;
  franqueado_etapa?: FranqueadoEtapa;
  vendedor?: {
    nome: string;
    foto_perfil_url?: string;
  };
}

export default function MapaAutorizados() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [autorizados, setAutorizados] = useState<Autorizado[]>([]);
  const [loading, setLoading] = useState(true);
  const [pontosPesquisa, setPontosPesquisa] = useState<Array<{ lat: number; lng: number }>>([]);
  const [filtros, setFiltros] = useState<MapaFiltros>({
    autorizados: true,
    representantes: true,
    franqueados: true,
    etapasAutorizados: [],
    etapasRepresentantes: [],
    etapasFranqueados: [],
    instalacoes: true,
    statusInstalacoes: [],
    tiposInstalacao: [],
    apenasGeocodificados: false,
    apenasAtivos: false,
    dataInicio: undefined,
    dataFim: undefined,
  });
  const { instalacoes } = useInstalacoesCadastradas();
  const { toast } = useToast();

  // Obter instalação selecionada da URL
  const instalacaoId = searchParams.get('instalacao');
  const instalacaoSelecionada = instalacaoId 
    ? instalacoes.find(i => i.id === instalacaoId)
    : null;

  // Função para limpar seleção
  const clearSelection = () => {
    setSearchParams({});
  };

  // Função para adicionar ponto de pesquisa
  const handlePesquisar = (lat: number, lng: number) => {
    setPontosPesquisa([{ lat, lng }]);
  };

  useEffect(() => {
    fetchAutorizados();
  }, []);

  const fetchAutorizados = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('autorizados')
        .select(`
          id, nome, email, telefone, whatsapp, responsavel, endereco, 
          cidade, estado, cep, regiao, ativo, logo_url, latitude, 
          longitude, last_geocoded_at, geocode_precision, created_at, 
          updated_at, vendedor_id, tipo_parceiro, etapa, 
          representante_etapa, franqueado_etapa,
          vendedor:admin_users!autorizados_vendedor_id_fkey(nome, foto_perfil_url)
        `)
        .order('nome');

      if (error) throw error;
      setAutorizados(data || []);
    } catch (error) {
      console.error('Erro ao buscar autorizados:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Erro ao buscar autorizados.'
      });
    } finally {
      setLoading(false);
    }
  };


  // Filtrar autorizados baseado nas opções selecionadas
  const filteredAutorizados = autorizados.filter(autorizado => {
    // Filtro de tipo de parceiro e etapas
    let passaTipoParceiro = false;
    
    if (autorizado.tipo_parceiro === 'autorizado' && filtros.autorizados) {
      if (filtros.etapasAutorizados.length === 0) {
        passaTipoParceiro = true;
      } else {
        passaTipoParceiro = filtros.etapasAutorizados.includes(autorizado.etapa as AutorizadoEtapa);
      }
    }
    
    if (autorizado.tipo_parceiro === 'representante' && filtros.representantes) {
      if (filtros.etapasRepresentantes.length === 0) {
        passaTipoParceiro = true;
      } else {
        passaTipoParceiro = autorizado.representante_etapa 
          ? filtros.etapasRepresentantes.includes(autorizado.representante_etapa as RepresentanteEtapa)
          : false;
      }
    }
    
    if (autorizado.tipo_parceiro === 'franqueado' && filtros.franqueados) {
      if (filtros.etapasFranqueados.length === 0) {
        passaTipoParceiro = true;
      } else {
        passaTipoParceiro = autorizado.franqueado_etapa
          ? filtros.etapasFranqueados.includes(autorizado.franqueado_etapa as FranqueadoEtapa)
          : false;
      }
    }
    
    if (!passaTipoParceiro) return false;
    
    // Filtros adicionais
    if (filtros.apenasGeocodificados && (!autorizado.latitude || !autorizado.longitude)) {
      return false;
    }
    if (filtros.apenasAtivos && !autorizado.ativo) {
      return false;
    }
    
    return true;
  });

  // Filtrar instalações
  const filteredInstalacoes = instalacoes.filter(instalacao => {
    if (!filtros.instalacoes) return false;
    
    // Filtro de status
    if (filtros.statusInstalacoes.length > 0 && !filtros.statusInstalacoes.includes(instalacao.status)) {
      return false;
    }
    
    // Filtro de categoria/tipo removido - coluna não existe mais
    
    // Filtro de geocodificação
    if (filtros.apenasGeocodificados && (!instalacao.latitude || !instalacao.longitude)) {
      return false;
    }

    // Filtro de data
    if (filtros.dataInicio || filtros.dataFim) {
      const dataInstalacao = instalacao.data_instalacao ? new Date(instalacao.data_instalacao) : null;
      if (!dataInstalacao) return false;
      
      if (filtros.dataInicio && dataInstalacao < filtros.dataInicio) return false;
      if (filtros.dataFim) {
        const dataFimAjustada = new Date(filtros.dataFim);
        dataFimAjustada.setHours(23, 59, 59, 999);
        if (dataInstalacao > dataFimAjustada) return false;
      }
    }
    
    return true;
  });

  // Calcular estatísticas dos parceiros
  const stats = {
    total: autorizados.length,
    ativos: autorizados.filter(a => a.ativo).length,
    inativos: autorizados.filter(a => !a.ativo).length,
    geocodificados: autorizados.filter(a => a.latitude && a.longitude).length,
    naoGeocodificados: autorizados.filter(a => !a.latitude || !a.longitude).length,
    ativosComCoordenadas: autorizados.filter(a => a.ativo && a.latitude && a.longitude).length,
    instalacoesGeocodificadas: instalacoes.filter(i => i.latitude && i.longitude).length
  };

  const statsParaFiltros = {
    totalAutorizados: autorizados.filter(a => a.tipo_parceiro === 'autorizado').length,
    totalRepresentantes: autorizados.filter(a => a.tipo_parceiro === 'representante').length,
    totalFranqueados: autorizados.filter(a => a.tipo_parceiro === 'franqueado').length,
    totalInstalacoes: instalacoes.length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando autorizados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-full h-full">
      {/* Indicador de contagem */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[1000]">
        <Badge variant="secondary" className="text-sm px-4 py-2 shadow-lg">
          Exibindo: {filteredAutorizados.length} parceiros, {filteredInstalacoes.length} instalações
        </Badge>
      </div>

      {/* Botão para limpar seleção quando há uma instalação selecionada */}
      {instalacaoSelecionada && (
        <div className="fixed top-4 right-4 z-[1000]">
          <Button 
            onClick={clearSelection}
            variant="secondary"
            size="sm"
            className="gap-2 shadow-lg"
          >
            <X className="h-4 w-4" />
            Limpar Seleção
          </Button>
        </div>
      )}

      {/* Componente de pesquisa de localização */}
      <MapaLocalizacaoPesquisa onPesquisar={handlePesquisar} />

      {/* Componente de filtros */}
      <MapaFiltrosAvancados
        filtros={filtros}
        onChange={setFiltros}
        stats={statsParaFiltros}
      />

      {/* Mapa em tela cheia */}
      <div className="absolute inset-0 w-full">
        <AutorizadosMapLeaflet 
          autorizados={filteredAutorizados} 
          instalacoes={filteredInstalacoes}
          showOverlays={true}
          stats={stats}
          pontosPesquisa={pontosPesquisa}
          centerOnCoordinates={
            instalacaoSelecionada?.latitude && instalacaoSelecionada?.longitude
              ? {
                  lat: instalacaoSelecionada.latitude,
                  lng: instalacaoSelecionada.longitude,
                  zoom: 15,
                  instalacaoId: instalacaoSelecionada.id
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}