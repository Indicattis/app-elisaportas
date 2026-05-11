import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Trash2, Plus, Package, Check, X, Zap, Edit, ChevronLeft, ChevronsUpDown, Copy } from "lucide-react";
import { toast } from "sonner";
import { PortaFolderCard, SemProdutoFolderCard } from "./PortaFolderCard";
import { Badge } from "@/components/ui/badge";
import { PedidoLinha, PedidoLinhaNova, CategoriaLinha } from "@/hooks/usePedidoLinhas";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEstoque } from "@/hooks/useEstoque";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { expandirPortasPorQuantidade } from "@/utils/expandirPortas";
import { classificarTamanhoPorta } from "@/utils/classificarTamanhoPorta";
import { getLabelProdutoExpandido } from "@/utils/tipoProdutoLabels";
import { AdicionarLinhaModal } from "./AdicionarLinhaModal";

interface LinhaEditData {
  produto_venda_id?: string | null;
  indice_porta?: number;
  estoque_id?: string;
  nome_produto?: string;
  descricao_produto?: string;
  quantidade?: number;
  tamanho?: string;
  categoria_linha?: CategoriaLinha;
}

interface PedidoLinhasEditorProps {
  linhas: PedidoLinha[];
  isReadOnly: boolean;
  vendaId?: string;
  temPortasEnrolar?: boolean;
  onAdicionarLinha: (linha: PedidoLinhaNova) => Promise<any>;
  onRemoverLinha: (linhaId: string) => Promise<void>;
  onAtualizarLinha?: (linhaId: string, campo: 'quantidade' | 'tamanho', valor: number | string) => void;
  onAtualizarLinhaCompleta?: (linhaId: string, dados: LinhaEditData) => Promise<void>;
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
  // Modo: por tamanho de porta (P/G/GG)
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

// Mapeamento de setor para categoria
const mapearSetorParaCategoria = (setor: string | null): CategoriaLinha => {
  if (!setor) return 'separacao';
  
  const mapeamento: Record<string, CategoriaLinha> = {
    'perfiladeira': 'perfiladeira',
    'soldagem': 'solda',
    'separacao': 'separacao',
    'pintura': 'separacao',
  };
  
  return mapeamento[setor] || 'separacao';
};

export const PedidoLinhasEditor = ({
  linhas,
  isReadOnly,
  vendaId,
  temPortasEnrolar = false,
  onAdicionarLinha,
  onRemoverLinha,
  onAtualizarLinha,
  onAtualizarLinhaCompleta,
}: PedidoLinhasEditorProps) => {
  // Estado local para valores editados (quantidade/tamanho inline)
  const [valoresEditados, setValoresEditados] = useState<Record<string, { quantidade?: number; tamanho?: string }>>({});
  
  // Estado para linha em modo de edição completa
  const [linhaEmEdicao, setLinhaEmEdicao] = useState<string | null>(null);
  const [dadosEdicao, setDadosEdicao] = useState<{
    produto_venda_id: string;
    indice_porta: number;
    estoque_id: string;
  } | null>(null);
  const [buscaEdicao, setBuscaEdicao] = useState("");
  const [popoverEdicaoAberto, setPopoverEdicaoAberto] = useState(false);

  // Estado do modal de adição
  const [modalAdicionarAberto, setModalAdicionarAberto] = useState(false);
  const [portaParaModal, setPortaParaModal] = useState<{
    portaId: string;
    indicePorta: number;
    largura?: number;
    altura?: number;
  } | null>(null);

  const handleLinhaChange = (linhaId: string, campo: 'quantidade' | 'tamanho', valor: number | string) => {
    setValoresEditados(prev => ({
      ...prev,
      [linhaId]: {
        ...prev[linhaId],
        [campo]: valor,
      }
    }));
    
    if (onAtualizarLinha) {
      onAtualizarLinha(linhaId, campo, valor);
    }
  };

  const getValorEditado = (linha: PedidoLinha, campo: 'quantidade' | 'tamanho') => {
    const editado = valoresEditados[linha.id];
    if (editado && editado[campo] !== undefined) {
      return editado[campo];
    }
    return campo === 'quantidade' ? linha.quantidade : linha.tamanho;
  };
  
  // Iniciar modo de edição
  const handleIniciarEdicao = (linha: PedidoLinha) => {
    const portaVirtual = portas.find(p => 
      p._originalId === linha.produto_venda_id && 
      p._indicePorta === (linha.indice_porta ?? 0)
    );
    setLinhaEmEdicao(linha.id);
    setDadosEdicao({
      produto_venda_id: portaVirtual?._virtualKey || '_none',
      indice_porta: linha.indice_porta ?? 0,
      estoque_id: linha.estoque_id || '',
    });
    setBuscaEdicao("");
  };
  
  // Cancelar edição
  const handleCancelarEdicao = () => {
    setLinhaEmEdicao(null);
    setDadosEdicao(null);
    setBuscaEdicao("");
    setPopoverEdicaoAberto(false);
  };
  
  // Salvar edição
  const handleSalvarEdicao = async (linhaId: string) => {
    if (!dadosEdicao || !onAtualizarLinhaCompleta) return;
    
    const produtoEstoque = produtos.find(p => p.id === dadosEdicao.estoque_id);
    if (!produtoEstoque) {
      toast.error("Selecione um produto válido");
      return;
    }
    
    const portaSelecionada = portas.find(p => p._virtualKey === dadosEdicao.produto_venda_id);
    const categoria = mapearSetorParaCategoria(produtoEstoque.setor_responsavel_producao);
    
    try {
      const editados = valoresEditados[linhaId];
      await onAtualizarLinhaCompleta(linhaId, {
        produto_venda_id: portaSelecionada?._originalId || null,
        indice_porta: portaSelecionada?._indicePorta ?? 0,
        estoque_id: dadosEdicao.estoque_id,
        nome_produto: produtoEstoque.nome_produto,
        descricao_produto: produtoEstoque.descricao_produto || '',
        categoria_linha: categoria,
        quantidade: editados?.quantidade,
        tamanho: editados?.tamanho,
      });
      toast.success("Linha atualizada com sucesso");
      handleCancelarEdicao();
    } catch (error) {
      toast.error("Erro ao atualizar linha");
    }
  };

  // Buscar produtos do estoque
  const { produtos } = useEstoque();

  // Buscar portas da venda e expandir por quantidade
  const { data: portasRaw = [] } = useQuery({
    queryKey: ['produtos-venda-portas', vendaId],
    queryFn: async () => {
      if (!vendaId) return [];
      const { data, error } = await supabase
        .from('produtos_vendas')
        .select('*')
        .eq('venda_id', vendaId)
        .order('created_at');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!vendaId,
  });
  
  // Expandir portas por quantidade
  const portasFiltradas = portasRaw.filter(
    (p: any) => p.tipo_produto === 'porta_enrolar' || p.tipo_produto === 'porta_social'
  );
  const portas = expandirPortasPorQuantidade(portasFiltradas);

  // Estado para itens padrão de porta de enrolar
  const [itensPadrao, setItensPadrao] = useState<ItemPadraoPortaEnrolar[]>([]);

  // Buscar itens padrão de porta de enrolar
  useEffect(() => {
    const fetchItensPadrao = async () => {
      if (!temPortasEnrolar || isReadOnly) {
        setItensPadrao([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('estoque')
          .select('id, nome_produto, descricao_produto, modulo_calculo, valor_calculo, eixo_calculo, setor_responsavel_producao, quantidade_padrao, qtd_eixo_calculo, qtd_operador, qtd_valor_calculo')
          .eq('item_padrao_porta_enrolar', true)
          .eq('ativo', true);

        if (error) throw error;
        setItensPadrao(data || []);
      } catch (error) {
        console.error('Erro ao buscar itens padrão:', error);
      }
    };

    fetchItensPadrao();
  }, [temPortasEnrolar, isReadOnly]);

  // Verificar se um item padrão já foi adicionado para uma porta
  const itemJaAdicionado = (portaOriginalId: string, indicePorta: number, estoqueId: string) => {
    return linhas.some(l => 
      l.produto_venda_id === portaOriginalId && 
      (l.indice_porta ?? 0) === indicePorta &&
      l.estoque_id === estoqueId
    );
  };

  // Função para adicionar item padrão rapidamente
  const handleAdicionarItemPadrao = async (porta: any, item: ItemPadraoPortaEnrolar) => {
    const tamanhoAuto = calcularTamanhoAutomatico(item, porta.largura, porta.altura);
    const qtdAuto = calcularQuantidadeAutomaticaItem(item, porta.largura, porta.altura);
    const categoria = mapearSetorParaCategoria(item.setor_responsavel_producao);
    
    try {
      await onAdicionarLinha({
        produto_venda_id: porta._originalId,
        indice_porta: porta._indicePorta,
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

  // Abrir modal para adicionar item a uma porta específica
  const handleAbrirModal = (porta?: any) => {
    if (porta) {
      setPortaParaModal({
        portaId: porta._originalId,
        indicePorta: porta._indicePorta,
        largura: porta.largura,
        altura: porta.altura,
      });
    } else if (portas.length === 1) {
      // Se só tem uma porta, seleciona automaticamente
      const p = portas[0];
      setPortaParaModal({
        portaId: p._originalId,
        indicePorta: p._indicePorta,
        largura: p.largura,
        altura: p.altura,
      });
    } else {
      setPortaParaModal(null);
    }
    setModalAdicionarAberto(true);
  };

  // Estado da pasta aberta
  const [pastaAberta, setPastaAberta] = useState<string | null>(null);

  // Agrupar linhas por porta
  const { gruposOrdenados, semPorta } = useMemo(() => {
    const grupos = new Map<string, { porta: typeof portas[0] | null; portaIndex: number; linhasGrupo: PedidoLinha[] }>();
    const semPortaArr: PedidoLinha[] = [];
    
    for (const linha of linhas) {
      if (linha.produto_venda_id) {
        const key = `${linha.produto_venda_id}_${linha.indice_porta ?? 0}`;
        if (!grupos.has(key)) {
          const portaIdx = portas.findIndex(p => 
            p._originalId === linha.produto_venda_id && 
            p._indicePorta === (linha.indice_porta ?? 0)
          );
          const porta = portaIdx >= 0 ? portas[portaIdx] : null;
          grupos.set(key, { porta, portaIndex: portaIdx, linhasGrupo: [] });
        }
        grupos.get(key)!.linhasGrupo.push(linha);
      } else {
        semPortaArr.push(linha);
      }
    }

    for (let i = 0; i < portas.length; i++) {
      const porta = portas[i];
      const key = `${porta._originalId}_${porta._indicePorta}`;
      if (!grupos.has(key)) {
        grupos.set(key, { porta, portaIndex: i, linhasGrupo: [] });
      }
    }

    return {
      gruposOrdenados: [...grupos.entries()].sort((a, b) => a[1].portaIndex - b[1].portaIndex),
      semPorta: semPortaArr,
    };
  }, [linhas, portas]);

  // Dados da pasta aberta
  const pastaAbertaDados = useMemo(() => {
    if (!pastaAberta) return null;
    if (pastaAberta === '_sem_produto') {
      return { key: '_sem_produto', porta: null, portaIndex: -1, linhasGrupo: semPorta, label: 'Sem produto', dimensoes: '' };
    }
    const grupo = gruposOrdenados.find(([key]) => key === pastaAberta);
    if (!grupo) return null;
    const [key, data] = grupo;
    const p = data.porta;
    const idx = gruposOrdenados.indexOf(grupo);
    const label = p
      ? getLabelProdutoExpandido(data.portaIndex, p.tipo_produto, p.largura, p.altura, p._totalNoGrupo, p._indicePorta)
      : `Item #${idx + 1}`;
    const dimensoes = p?.largura && p?.altura
      ? `${p.largura.toFixed(2)}m × ${p.altura.toFixed(2)}m`
      : '';
    return { key, porta: p, portaIndex: data.portaIndex, linhasGrupo: data.linhasGrupo, label, dimensoes };
  }, [pastaAberta, gruposOrdenados, semPorta]);

  const renderLinha = (linha: PedidoLinha) => {
    const estaEmEdicao = linhaEmEdicao === linha.id;
    return (
      <div key={linha.id} className={cn(
        "flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors",
        estaEmEdicao ? "bg-primary/5 border border-primary/20" : "hover:bg-muted/30"
      )}>
        {/* Produto */}
        <div className="flex-1 min-w-0">
          {estaEmEdicao && dadosEdicao ? (
            <div className="space-y-1">
              <Select
                value={dadosEdicao.produto_venda_id}
                onValueChange={(value) => 
                  setDadosEdicao({...dadosEdicao, produto_venda_id: value})
                }
              >
                <SelectTrigger className="h-7 text-xs w-full">
                  <SelectValue placeholder="Produto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Nenhuma</SelectItem>
                  {portas.map((porta, idx) => (
                    <SelectItem key={porta._virtualKey} value={porta._virtualKey}>
                      {getLabelProdutoExpandido(idx, porta.tipo_produto, porta.largura, porta.altura, porta._totalNoGrupo, porta._indicePorta)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Popover open={popoverEdicaoAberto} onOpenChange={setPopoverEdicaoAberto}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="h-7 w-full justify-between text-xs"
                  >
                    {dadosEdicao.estoque_id
                      ? produtos.find(p => p.id === dadosEdicao.estoque_id)?.nome_produto || "Selecione..."
                      : "Selecione um produto"}
                    <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="start">
                  <Command>
                    <CommandInput 
                      placeholder="Buscar produto..." 
                      value={buscaEdicao}
                      onValueChange={setBuscaEdicao}
                      className="text-xs"
                    />
                    <CommandList>
                      <CommandEmpty className="text-xs p-2">Nenhum produto encontrado.</CommandEmpty>
                      <CommandGroup>
                        <ScrollArea className="h-48">
                          {produtos
                            .filter(p => 
                              p.nome_produto.toLowerCase().includes(buscaEdicao.toLowerCase()) ||
                              (p.sku && p.sku.toLowerCase().includes(buscaEdicao.toLowerCase()))
                            )
                            .map((produto) => (
                              <CommandItem
                                key={produto.id}
                                value={produto.id}
                                onSelect={() => {
                                  setDadosEdicao({...dadosEdicao, estoque_id: produto.id});
                                  setPopoverEdicaoAberto(false);
                                  setBuscaEdicao("");
                                }}
                                className="text-xs"
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-3 w-3",
                                    dadosEdicao.estoque_id === produto.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span>{produto.nome_produto}</span>
                                  {produto.sku && (
                                    <span className="text-muted-foreground text-[10px]">SKU: {produto.sku}</span>
                                  )}
                                </div>
                              </CommandItem>
                            ))}
                        </ScrollArea>
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {/* Quantity and size inputs in edit mode */}
              <div className="flex gap-2 mt-1">
                <Input
                  type="number"
                  min="1"
                  value={getValorEditado(linha, 'quantidade') as number}
                  onChange={(e) => handleLinhaChange(linha.id, 'quantidade', parseInt(e.target.value) || 1)}
                  className="h-7 w-20 text-xs"
                  placeholder="Qtd"
                />
                <Input
                  type="text"
                  placeholder="Tamanho"
                  value={getValorEditado(linha, 'tamanho') as string || ''}
                  onChange={(e) => handleLinhaChange(linha.id, 'tamanho', e.target.value)}
                  className="h-7 w-24 text-xs"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm truncate">{linha.descricao_produto || linha.nome_produto}</span>
              <Badge variant="secondary" className="text-xs px-1.5 py-0 shrink-0">
                {linha.quantidade}x
              </Badge>
              {linha.tamanho && (
                <Badge variant="outline" className="text-xs px-1.5 py-0 shrink-0">
                  {linha.tamanho}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        {!isReadOnly && (
          <div className="flex gap-0.5 shrink-0">
            {estaEmEdicao ? (
              <>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleSalvarEdicao(linha.id)}
                  title="Salvar">
                  <Check className="h-3.5 w-3.5 text-green-600" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleCancelarEdicao}
                  title="Cancelar">
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </>
            ) : (
              <>
                {onAtualizarLinhaCompleta && (
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleIniciarEdicao(linha)}
                    title="Editar">
                    <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => {
                  onAdicionarLinha({
                    produto_venda_id: linha.produto_venda_id,
                    indice_porta: linha.indice_porta,
                    nome_produto: linha.nome_produto,
                    descricao_produto: linha.descricao_produto || undefined,
                    quantidade: linha.quantidade,
                    tamanho: linha.tamanho || undefined,
                    estoque_id: linha.estoque_id || undefined,
                    categoria_linha: linha.categoria_linha,
                  });
                }}
                  title="Duplicar">
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onRemoverLinha(linha.id)}
                  title="Remover">
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  // Itens padrão sugeridos para a pasta aberta
  const renderSugestoesPasta = () => {
    if (isReadOnly || !temPortasEnrolar || !pastaAbertaDados || !pastaAbertaDados.porta || itensPadrao.length === 0) return null;
    
    const porta = pastaAbertaDados.porta;
    const itensPadraoDisponiveis = itensPadrao.filter(
      item => !itemJaAdicionado(porta._originalId, porta._indicePorta, item.id)
    );
    
    if (itensPadraoDisponiveis.length === 0) return null;

    return (
      <div className="p-2.5 rounded-xl backdrop-blur-xl bg-white/5 border border-white/10">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="h-4 w-4 text-blue-400" />
          <span className="text-xs font-medium text-blue-300">Itens sugeridos</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {itensPadraoDisponiveis.map((item) => {
            const tamanhoPreview = calcularTamanhoAutomatico(item, porta.largura, porta.altura);
            const qtdPreview = calcularQuantidadeAutomaticaItem(item, porta.largura, porta.altura) ?? item.quantidade_padrao;
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
                {qtdPreview && qtdPreview > 1 && (
                  <span className="ml-1 text-blue-200/70">×{qtdPreview}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  if (linhas.length === 0 && portas.length === 0) {
    return (
      <div className="space-y-3">
        <Card className="p-6 text-center text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>Nenhum produto adicionado ao pedido</p>
          {!isReadOnly && <p className="text-sm mt-1">Clique no botão abaixo para adicionar produtos</p>}
        </Card>
        {!isReadOnly && (
          <Button variant="outline" className="w-full" onClick={() => handleAbrirModal()}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Produto
          </Button>
        )}
        <AdicionarLinhaModal
          open={modalAdicionarAberto}
          onOpenChange={setModalAdicionarAberto}
          portaId={portaParaModal?.portaId || ''}
          indicePorta={portaParaModal?.indicePorta ?? 0}
          portaLargura={portaParaModal?.largura}
          portaAltura={portaParaModal?.altura}
          onAdicionar={onAdicionarLinha}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Grid de pastas */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {gruposOrdenados.map(([key, grupo]) => {
          const p = grupo.porta;
          const label = p
            ? getLabelProdutoExpandido(grupo.portaIndex, p.tipo_produto, p.largura, p.altura, p._totalNoGrupo, p._indicePorta)
            : `Item`;
          const dimensoes = p?.largura && p?.altura
            ? `${p.largura.toFixed(2)}m × ${p.altura.toFixed(2)}m`
            : undefined;
          const categorias = grupo.linhasGrupo.map(l => l.categoria_linha);

          return (
            <PortaFolderCard
              key={key}
              label={label}
              dimensoes={dimensoes}
              linhasCount={grupo.linhasGrupo.length}
              categorias={categorias}
              isOpen={pastaAberta === key}
              onClick={() => setPastaAberta(prev => prev === key ? null : key)}
            />
          );
        })}
        {semPorta.length > 0 && (
          <SemProdutoFolderCard
            linhasCount={semPorta.length}
            isOpen={pastaAberta === '_sem_produto'}
            onClick={() => setPastaAberta(prev => prev === '_sem_produto' ? null : '_sem_produto')}
          />
        )}
      </div>

      {/* Pasta expandida */}
      {pastaAbertaDados && (
        <div className="border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between bg-muted/50 px-3 py-2 border-b">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setPastaAberta(null)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-semibold">{pastaAbertaDados.label}</span>
              {pastaAbertaDados.dimensoes && (
                <span className="text-xs text-muted-foreground">{pastaAbertaDados.dimensoes}</span>
              )}
            </div>
            {!isReadOnly && (
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleAbrirModal(pastaAbertaDados.porta)}>
                <Plus className="h-3 w-3 mr-1" />
                Adicionar
              </Button>
            )}
          </div>
          <div className="p-2 space-y-1">
            {renderSugestoesPasta()}
            {pastaAbertaDados.linhasGrupo.length > 0 ? (
              pastaAbertaDados.linhasGrupo.map(renderLinha)
            ) : (
              <div className="text-center py-4 text-sm text-muted-foreground">
                Nenhuma linha nesta pasta
              </div>
            )}
          </div>
        </div>
      )}

      {/* Botão global de adicionar (quando nenhuma pasta aberta) */}
      {!isReadOnly && !pastaAberta && (
        <Button variant="outline" className="w-full" onClick={() => handleAbrirModal()}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Produto
        </Button>
      )}

      {/* Modal de adição */}
      <AdicionarLinhaModal
        open={modalAdicionarAberto}
        onOpenChange={setModalAdicionarAberto}
        portaId={portaParaModal?.portaId}
        indicePorta={portaParaModal?.indicePorta}
        portaLargura={portaParaModal?.largura}
        portaAltura={portaParaModal?.altura}
        portas={portas}
        onAdicionar={onAdicionarLinha}
      />
    </div>
  );
};
