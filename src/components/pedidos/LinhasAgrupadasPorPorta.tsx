import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ChevronDown, Zap } from "lucide-react";
import { TabelaLinhasEditavel } from "./TabelaLinhasEditavel";
import { AdicionarLinhaModal } from "./AdicionarLinhaModal";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getLabelProdutoExpandido } from "@/utils/tipoProdutoLabels";
import { classificarTamanhoPorta } from "@/utils/classificarTamanhoPorta";
import type { PedidoLinha, PedidoLinhaNova, PedidoLinhaUpdate, CategoriaLinha } from "@/hooks/usePedidoLinhas";

interface LinhasAgrupadasPorPortaProps {
  categoria: CategoriaLinha;
  portas: any[];
  linhas: PedidoLinha[];
  isReadOnly: boolean;
  onAdicionarLinha: (linha: PedidoLinhaNova) => Promise<any>;
  onRemoverLinha: (id: string) => Promise<void>;
  onChange: (linhasEditadas: Map<string, PedidoLinhaUpdate>) => void;
  linhasEditadas: Map<string, PedidoLinhaUpdate>;
  temPortaEnrolar?: boolean;
}

interface ItemPadraoPortaEnrolar {
  id: string;
  nome_produto: string;
  descricao_produto: string | null;
  modulo_calculo: string | null;
  valor_calculo: number | null;
  eixo_calculo: string | null;
  setor_responsavel_producao: string | null;
  quantidade_padrao: number | null;
  qtd_eixo_calculo: string | null;
  qtd_operador: string | null;
  qtd_valor_calculo: number | null;
  qtd_modo_calculo?: string | null;
  qtd_porta_p?: number | null;
  qtd_porta_g?: number | null;
  qtd_porta_gg?: number | null;
}

// Função para calcular o tamanho automático
function calcularTamanhoAutomatico(
  item: ItemPadraoPortaEnrolar,
  portaLargura?: number,
  portaAltura?: number
): string | null {
  if (!item.modulo_calculo || !item.valor_calculo || !item.eixo_calculo) {
    return null;
  }

  const eixoValor = item.eixo_calculo === 'largura' ? portaLargura : portaAltura;
  
  if (!eixoValor) return null;

  let tamanhoCalculado: number;
  if (item.modulo_calculo === 'acrescimo') {
    tamanhoCalculado = eixoValor + item.valor_calculo;
  } else {
    tamanhoCalculado = eixoValor - item.valor_calculo;
  }

  return tamanhoCalculado.toFixed(2);
}

// Função para calcular quantidade automática
function calcularQuantidadeAutomaticaItem(
  item: ItemPadraoPortaEnrolar,
  portaLargura?: number,
  portaAltura?: number
): number | null {
  if (item.qtd_modo_calculo === 'por_tamanho') {
    const tamanho = classificarTamanhoPorta(portaLargura);
    if (!tamanho) return null;
    const qtd = tamanho === 'P' ? item.qtd_porta_p
      : tamanho === 'G' ? item.qtd_porta_g
      : item.qtd_porta_gg;
    return qtd ?? null;
  }

  if (!item.qtd_eixo_calculo || !item.qtd_operador || !item.qtd_valor_calculo) {
    return null;
  }

  let eixoValor: number | undefined;
  if (item.qtd_eixo_calculo === 'largura') {
    eixoValor = portaLargura;
  } else if (item.qtd_eixo_calculo === 'altura') {
    eixoValor = portaAltura;
  } else if (item.qtd_eixo_calculo === 'qtd_meia_cana') {
    eixoValor = portaAltura ? Math.ceil(portaAltura / 0.076) : undefined;
  }
  if (!eixoValor) return null;

  let resultado: number;
  switch (item.qtd_operador) {
    case 'multiplicar': resultado = eixoValor * item.qtd_valor_calculo; break;
    case 'dividir': resultado = eixoValor / item.qtd_valor_calculo; break;
    case 'somar': resultado = eixoValor + item.qtd_valor_calculo; break;
    case 'subtrair': resultado = eixoValor - item.qtd_valor_calculo; break;
    default: return null;
  }

  return Math.ceil(resultado);
}

// Mapeia categoria para setor
const CATEGORIA_TO_SETOR: Record<CategoriaLinha, string> = {
  separacao: 'separacao',
  solda: 'soldagem',
  perfiladeira: 'perfiladeira',
};

export function LinhasAgrupadasPorPorta({
  categoria,
  portas,
  linhas,
  isReadOnly,
  onAdicionarLinha,
  onRemoverLinha,
  onChange,
  linhasEditadas,
  temPortaEnrolar = false,
}: LinhasAgrupadasPorPortaProps) {
  const [modalAberto, setModalAberto] = useState(false);
  const [portaSelecionada, setPortaSelecionada] = useState<string | null>(null);
  const [indicePortaSelecionada, setIndicePortaSelecionada] = useState<number>(0);
  const [itensPadrao, setItensPadrao] = useState<ItemPadraoPortaEnrolar[]>([]);
  const [loadingItensPadrao, setLoadingItensPadrao] = useState(false);

  // Buscar itens padrão de porta de enrolar quando necessário
  useEffect(() => {
    const fetchItensPadrao = async () => {
      if (!temPortaEnrolar) {
        setItensPadrao([]);
        return;
      }

      setLoadingItensPadrao(true);
      try {
        const setorAtual = CATEGORIA_TO_SETOR[categoria];
        const { data, error } = await supabase
          .from('estoque')
          .select('id, nome_produto, descricao_produto, modulo_calculo, valor_calculo, eixo_calculo, setor_responsavel_producao, quantidade_padrao, qtd_eixo_calculo, qtd_operador, qtd_valor_calculo, qtd_modo_calculo, qtd_porta_p, qtd_porta_g, qtd_porta_gg')
          .eq('item_padrao_porta_enrolar', true)
          .eq('ativo', true)
          .eq('setor_responsavel_producao', setorAtual as 'perfiladeira' | 'soldagem' | 'separacao' | 'pintura');

        if (error) throw error;
        setItensPadrao(data || []);
      } catch (error) {
        console.error('Erro ao buscar itens padrão:', error);
      } finally {
        setLoadingItensPadrao(false);
      }
    };

    fetchItensPadrao();
  }, [temPortaEnrolar, categoria]);

  const handleAbrirModal = (portaId: string, indicePorta: number) => {
    setPortaSelecionada(portaId);
    setIndicePortaSelecionada(indicePorta);
    setModalAberto(true);
  };

  // Função para adicionar item padrão rapidamente
  const handleAdicionarItemPadrao = async (porta: any, item: ItemPadraoPortaEnrolar) => {
    const tamanhoAuto = calcularTamanhoAutomatico(item, porta.largura, porta.altura);
    const qtdAuto = calcularQuantidadeAutomaticaItem(item, porta.largura, porta.altura);
    const originalId = porta._originalId || porta.id;
    const indicePorta = porta._indicePorta ?? 0;
    
    try {
      await onAdicionarLinha({
        produto_venda_id: originalId,
        indice_porta: indicePorta,
        nome_produto: item.nome_produto,
        descricao_produto: item.descricao_produto || "",
        quantidade: qtdAuto ?? item.quantidade_padrao ?? 1,
        tamanho: tamanhoAuto || "",
        estoque_id: item.id,
        categoria_linha: categoria,
      });
      toast.success(`${item.nome_produto} adicionado`);
    } catch (error) {
      toast.error('Erro ao adicionar item');
    }
  };

  // Verificar se um item padrão já foi adicionado para uma porta
  const itemJaAdicionado = (portaId: string, indicePorta: number, estoqueId: string) => {
    return linhas.some(
      l => l.produto_venda_id === portaId && 
           (l.indice_porta ?? 0) === indicePorta &&
           l.categoria_linha === categoria && 
           l.estoque_id === estoqueId
    );
  };

  // Obter porta selecionada para passar dimensões ao modal
  const portaParaModal = portaSelecionada 
    ? portas.find(p => p.id === portaSelecionada) 
    : null;

    return (
      <div className="space-y-4">
        {portas.map((porta, idx) => {
          const originalId = porta._originalId || porta.id;
          const indicePorta = porta._indicePorta ?? 0;
          const virtualKey = porta._virtualKey || porta.id;
          
          const linhasDaPorta = linhas.filter(
            l => l.produto_venda_id === originalId && 
                 (l.indice_porta ?? 0) === indicePorta &&
                 l.categoria_linha === categoria
          );

          // Filtrar itens padrão que ainda não foram adicionados
          const itensPadraoDisponiveis = itensPadrao.filter(
            item => !itemJaAdicionado(originalId, indicePorta, item.id)
          );
          
          // Label considerando expansão
          const portaLabel = getLabelProdutoExpandido(idx, porta.tipo_produto, porta.largura, porta.altura, porta._totalNoGrupo, porta._indicePorta);
        
          return (
            <Collapsible key={virtualKey} defaultOpen={false}>
              <div className="border-l-4 border-primary pl-3">
                {/* Header da porta - clicável para expandir/colapsar */}
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between mb-2 hover:bg-muted/50 p-2 rounded-md transition-colors">
                    <div className="flex items-center gap-2 flex-wrap">
                      <ChevronDown className="h-4 w-4 transition-transform duration-200 [&[data-state=open]]:rotate-180" />
                      <Badge variant="outline">{portaLabel}</Badge>
                      <span className="text-sm font-medium">
                        {Number(porta.largura).toFixed(2)}m × {Number(porta.altura).toFixed(2)}m
                      </span>
                      {porta.peso_total && (
                        <Badge variant="secondary" className="text-xs">
                          {porta.peso_total.toFixed(2)} kg
                        </Badge>
                      )}
                      {porta.quantidade_tiras && (
                        <Badge variant="secondary" className="text-xs">
                          {porta.quantidade_tiras} {porta.quantidade_tiras === 1 ? 'tira' : 'tiras'}
                        </Badge>
                      )}
                    {linhasDaPorta.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {linhasDaPorta.length} {linhasDaPorta.length === 1 ? 'linha' : 'linhas'}
                      </Badge>
                    )}
                  </div>
                  
                    {!isReadOnly && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAbrirModal(originalId, indicePorta);
                        }}
                        className="h-7 text-xs"
                      >
                      <Plus className="h-3 w-3 mr-1" />
                      Adicionar
                    </Button>
                  )}
                </div>
              </CollapsibleTrigger>
              
              {/* Tabela de linhas da porta - colapsável */}
              <CollapsibleContent>
                {/* Sugestões de itens padrão para porta de enrolar */}
                {!isReadOnly && temPortaEnrolar && itensPadraoDisponiveis.length > 0 && (
                  <div className="mb-3 p-2.5 rounded-xl backdrop-blur-xl bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="h-4 w-4 text-blue-400" />
                      <span className="text-xs font-medium text-blue-300">Itens sugeridos (porta de enrolar)</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {itensPadraoDisponiveis.map((item) => {
                        const tamanhoPreview = calcularTamanhoAutomatico(item, porta.largura, porta.altura);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            className="inline-flex items-center h-7 px-2.5 text-xs rounded-lg bg-gradient-to-r from-blue-500/80 to-blue-700/80 border border-blue-400/30 text-white hover:from-blue-400/80 hover:to-blue-600/80 transition-all duration-200"
                            onClick={() => handleAdicionarItemPadrao(porta, item)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            {item.nome_produto}
                            {tamanhoPreview && (
                              <span className="ml-1 text-blue-200/70">({tamanhoPreview}m)</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {linhasDaPorta.length > 0 ? (
                  <TabelaLinhasEditavel
                    linhas={linhasDaPorta}
                    isReadOnly={isReadOnly}
                    onRemover={onRemoverLinha}
                    onChange={onChange}
                    linhasEditadas={linhasEditadas}
                  />
                ) : (
                  <div className="text-center py-4 text-sm text-muted-foreground border rounded-md bg-muted/20">
                    Nenhuma linha adicionada para esta porta
                  </div>
                )}
              </CollapsibleContent>
            </div>
          </Collapsible>
        );
      })}

      {portaSelecionada && (
        <AdicionarLinhaModal
          open={modalAberto}
          onOpenChange={setModalAberto}
          categoria={categoria}
          portaId={portaSelecionada}
          indicePorta={indicePortaSelecionada}
          onAdicionar={onAdicionarLinha}
          portaLargura={portaParaModal?.largura}
          portaAltura={portaParaModal?.altura}
        />
      )}
    </div>
  );
}
