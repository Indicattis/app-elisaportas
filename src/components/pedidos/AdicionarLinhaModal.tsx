import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEstoque, ProdutoEstoque } from "@/hooks/useEstoque";
import { Search, Package, Calculator, Zap } from "lucide-react";
import { toast } from "sonner";
import type { CategoriaLinha, PedidoLinhaNova } from "@/hooks/usePedidoLinhas";
import { classificarTamanhoPorta } from "@/utils/classificarTamanhoPorta";
import type { PortaExpandida } from "@/utils/expandirPortas";
import { getLabelProdutoExpandido } from "@/utils/tipoProdutoLabels";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AdicionarLinhaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoria?: CategoriaLinha;
  portaId?: string;
  indicePorta?: number;
  onAdicionar: (linha: PedidoLinhaNova) => Promise<any>;
  portas?: PortaExpandida[];
  portaLargura?: number;
  portaAltura?: number;
}

// Mapeamento de categoria para setor de produção
const CATEGORIA_TO_SETOR: Record<CategoriaLinha, 'perfiladeira' | 'soldagem' | 'separacao' | 'pintura'> = {
  separacao: 'separacao',
  solda: 'soldagem',
  perfiladeira: 'perfiladeira',
};

// Mapeamento inverso: setor para categoria
const SETOR_TO_CATEGORIA: Record<string, CategoriaLinha> = {
  perfiladeira: 'perfiladeira',
  soldagem: 'solda',
  separacao: 'separacao',
  pintura: 'separacao',
};

const CATEGORIA_LABELS = {
  separacao: "Separação",
  solda: "Solda",
  perfiladeira: "Perfiladeira",
};

// Função para calcular o tamanho automático
function calcularTamanhoAutomatico(
  produto: ProdutoEstoque,
  portaLargura?: number,
  portaAltura?: number
): string | null {
  if (!produto.modulo_calculo || !produto.valor_calculo || !produto.eixo_calculo) {
    return null;
  }

  const eixoValor = produto.eixo_calculo === 'largura' ? portaLargura : portaAltura;
  
  if (!eixoValor) return null;

  let tamanhoCalculado: number;
  if (produto.modulo_calculo === 'acrescimo') {
    tamanhoCalculado = eixoValor + produto.valor_calculo;
  } else {
    tamanhoCalculado = eixoValor - produto.valor_calculo;
  }

  return tamanhoCalculado.toFixed(2);
}

// Função para calcular a quantidade automática
function calcularQuantidadeAutomatica(
  produto: ProdutoEstoque,
  portaLargura?: number,
  portaAltura?: number
): number | null {
  if ((produto as any).qtd_modo_calculo === 'por_tamanho') {
    const tamanho = classificarTamanhoPorta(portaLargura);
    if (!tamanho) return null;
    const qtd = tamanho === 'P' ? (produto as any).qtd_porta_p
      : tamanho === 'G' ? (produto as any).qtd_porta_g
      : (produto as any).qtd_porta_gg;
    return qtd ?? null;
  }

  if (!produto.qtd_eixo_calculo || !produto.qtd_operador || !produto.qtd_valor_calculo) {
    return null;
  }

  let eixoValor: number | undefined;
  if (produto.qtd_eixo_calculo === 'largura') {
    eixoValor = portaLargura;
  } else if (produto.qtd_eixo_calculo === 'altura') {
    eixoValor = portaAltura;
  } else if (produto.qtd_eixo_calculo === 'qtd_meia_cana') {
    eixoValor = portaAltura ? Math.ceil(portaAltura / 0.076) : undefined;
  }
  if (!eixoValor) return null;

  let resultado: number;
  switch (produto.qtd_operador) {
    case 'multiplicar': resultado = eixoValor * produto.qtd_valor_calculo; break;
    case 'dividir': resultado = eixoValor / produto.qtd_valor_calculo; break;
    case 'somar': resultado = eixoValor + produto.qtd_valor_calculo; break;
    case 'subtrair': resultado = eixoValor - produto.qtd_valor_calculo; break;
    default: return null;
  }

  return Math.ceil(resultado);
}

const NONE_VALUE = '_none';

export function AdicionarLinhaModal({ 
  open, 
  onOpenChange, 
  categoria, 
  portaId,
  indicePorta = 0,
  onAdicionar,
  portas = [],
  portaLargura,
  portaAltura 
}: AdicionarLinhaModalProps) {
  const [busca, setBusca] = useState("");
  const [modoManual, setModoManual] = useState(false);
  const [adicionando, setAdicionando] = useState(false);
  const [portaSelecionadaKey, setPortaSelecionadaKey] = useState<string>(NONE_VALUE);

  // Derivar porta inicial baseado nas props
  const getPortaInicialKey = () => {
    // Se portaId fornecido, encontrar a porta correspondente
    if (portaId) {
      const found = portas.find(p => p._originalId === portaId && p._indicePorta === indicePorta);
      if (found) return found._virtualKey;
    }
    // Se tem portas, pré-selecionar a primeira (porta 01)
    if (portas.length > 0) return portas[0]._virtualKey;
    return NONE_VALUE;
  };

  // Porta atualmente selecionada e suas dimensões
  const portaAtual = useMemo(() => {
    return portas.find(p => p._virtualKey === portaSelecionadaKey) ?? null;
  }, [portas, portaSelecionadaKey]);

  const larguraAtual = portaAtual?.largura ?? portaLargura ?? portas[0]?.largura;
  const alturaAtual = portaAtual?.altura ?? portaAltura ?? portas[0]?.altura;

  const [formData, setFormData] = useState<PedidoLinhaNova>({
    produto_venda_id: portaId || '',
    indice_porta: indicePorta,
    nome_produto: "",
    descricao_produto: "",
    quantidade: 1,
    tamanho: "",
    categoria_linha: categoria || 'separacao',
  });

  // Filtrar produtos pelo setor responsável pela categoria (ou todos se categoria não fornecida)
  const setorFiltro = categoria ? CATEGORIA_TO_SETOR[categoria] : null;
  const { produtos, buscarProdutos } = useEstoque(busca, setorFiltro);

  const handleBuscar = (termo: string) => {
    setBusca(termo);
    buscarProdutos(termo);
  };

  const handleSelecionarProduto = async (produto: ProdutoEstoque) => {
    const tamanhoAuto = calcularTamanhoAutomatico(produto, larguraAtual, alturaAtual);
    const qtdAuto = calcularQuantidadeAutomatica(produto, larguraAtual, alturaAtual);
    
    // Determinar categoria: usar a fornecida ou derivar do setor do produto
    const categoriaLinha = categoria || SETOR_TO_CATEGORIA[produto.setor_responsavel_producao || ''] || 'separacao';
    
    const linha: PedidoLinhaNova = {
      produto_venda_id: portaAtual?._originalId || portaId || '',
      indice_porta: portaAtual?._indicePorta ?? indicePorta,
      nome_produto: produto.nome_produto,
      descricao_produto: produto.descricao_produto || "",
      quantidade: qtdAuto ?? produto.quantidade_padrao ?? 1,
      tamanho: tamanhoAuto || "",
      estoque_id: produto.id,
      categoria_linha: categoriaLinha,
    };

    setAdicionando(true);
    try {
      await onAdicionar(linha);
      const detalhes = [
        tamanhoAuto ? `${tamanhoAuto}m` : null,
        `Qtd: ${linha.quantidade}`,
      ].filter(Boolean).join(' · ');
      toast.success(`${produto.nome_produto} adicionado`, { description: detalhes });
    } catch {
      toast.error("Erro ao adicionar item");
    } finally {
      setAdicionando(false);
    }
  };

  const handleSubmitManual = async () => {
    if (!formData.nome_produto || formData.quantidade <= 0) return;

    const linhaManual: PedidoLinhaNova = {
      ...formData,
      produto_venda_id: portaAtual?._originalId || '',
      indice_porta: portaAtual?._indicePorta ?? 0,
    };

    await onAdicionar(linhaManual);
    
    setFormData({
      produto_venda_id: '',
      indice_porta: 0,
      nome_produto: "",
      descricao_produto: "",
      quantidade: 1,
      tamanho: "",
      categoria_linha: categoria,
    });
    setModoManual(false);
    setBusca("");
    onOpenChange(false);
  };

  // Resetar estado quando abrir/fechar o modal
  useEffect(() => {
    if (open) {
      setPortaSelecionadaKey(getPortaInicialKey());
    } else {
      setModoManual(false);
      setBusca("");
      setFormData({
        produto_venda_id: '',
        indice_porta: 0,
        nome_produto: "",
        descricao_produto: "",
        quantidade: 1,
        tamanho: "",
        categoria_linha: categoria || 'separacao',
      });
    }
  }, [open, portaId, indicePorta, categoria, portas]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-base">
            Adicionar Item{categoria ? ` - ${CATEGORIA_LABELS[categoria]}` : ''}
          </DialogTitle>
        </DialogHeader>

        {!modoManual ? (
          <div className="space-y-3">
            {/* Seletor de porta/produto para agrupamento */}
            {portas.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs">Agrupar em</Label>
                <Select value={portaSelecionadaKey} onValueChange={setPortaSelecionadaKey}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>Nenhum (grupo próprio)</SelectItem>
                    {portas.map((porta, idx) => (
                      <SelectItem key={porta._virtualKey} value={porta._virtualKey}>
                        {getLabelProdutoExpandido(idx, porta.tipo_produto, porta.largura, porta.altura, porta._totalNoGrupo, porta._indicePorta)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produto no estoque..."
                value={busca}
                onChange={(e) => handleBuscar(e.target.value)}
                className="pl-8 h-9 text-sm"
                disabled={adicionando}
              />
            </div>

            {/* Product list */}
            <ScrollArea className="h-[300px]">
              <div className="space-y-1">
                {produtos.map((produto) => {
                  const temCalculoAuto = produto.modulo_calculo && produto.valor_calculo && produto.eixo_calculo;
                  const tamanhoPreview = temCalculoAuto 
                    ? calcularTamanhoAutomatico(produto, larguraAtual, alturaAtual)
                    : null;
                  const qtdPreview = calcularQuantidadeAutomatica(produto, larguraAtual, alturaAtual);
                    
                  return (
                    <button
                      key={produto.id}
                      type="button"
                      disabled={adicionando}
                      onClick={() => handleSelecionarProduto(produto)}
                      className="w-full text-left px-3 py-2 rounded-md border border-border bg-card hover:bg-accent transition-colors disabled:opacity-50"
                    >
                      <div className="flex items-start gap-2">
                        <Package className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm truncate">{produto.nome_produto}</span>
                            {temCalculoAuto && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground flex items-center gap-1">
                                <Calculator className="h-3 w-3" />
                                Auto
                              </span>
                            )}
                            {produto.item_padrao_porta_enrolar && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground flex items-center gap-1">
                                <Zap className="h-3 w-3" />
                                Padrão
                              </span>
                            )}
                          </div>
                          {produto.descricao_produto && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{produto.descricao_produto}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11px] text-muted-foreground">
                              Disponível: {produto.quantidade} {produto.unidade || 'UN'}
                            </span>
                            {tamanhoPreview && (
                              <span className="text-[11px] text-primary font-medium">
                                → {tamanhoPreview}m
                              </span>
                            )}
                            {qtdPreview && (
                              <span className="text-[11px] text-primary font-medium">
                                → Qtd: {qtdPreview}
                              </span>
                            )}
                            {!tamanhoPreview && !qtdPreview && produto.quantidade_padrao && (
                              <span className="text-[11px] text-muted-foreground">
                                Qtd padrão: {produto.quantidade_padrao}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Manual add button */}
            <Button
              variant="outline"
              size="sm"
              disabled={adicionando}
              onClick={() => {
                setModoManual(true);
                setFormData(prev => ({ ...prev, nome_produto: busca }));
              }}
              className="w-full h-8 text-xs"
            >
              Adicionar Produto Manualmente
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Seletor de porta também no modo manual */}
            {portas.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs">Agrupar em</Label>
                <Select value={portaSelecionadaKey} onValueChange={setPortaSelecionadaKey}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>Nenhum (grupo próprio)</SelectItem>
                    {portas.map((porta, idx) => (
                      <SelectItem key={porta._virtualKey} value={porta._virtualKey}>
                        {getLabelProdutoExpandido(idx, porta.tipo_produto, porta.largura, porta.altura, porta._totalNoGrupo, porta._indicePorta)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="nome" className="text-xs">Nome do Produto</Label>
              <Input
                id="nome"
                value={formData.nome_produto}
                onChange={(e) => setFormData({ ...formData, nome_produto: e.target.value })}
                className="h-8 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="descricao" className="text-xs">Descrição (opcional)</Label>
              <Input
                id="descricao"
                value={formData.descricao_produto}
                onChange={(e) => setFormData({ ...formData, descricao_produto: e.target.value })}
                className="h-8 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="quantidade" className="text-xs">Quantidade</Label>
                <Input
                  id="quantidade"
                  type="number"
                  min="1"
                  value={formData.quantidade}
                  onChange={(e) => setFormData({ ...formData, quantidade: parseInt(e.target.value) || 1 })}
                  className="h-8 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="tamanho" className="text-xs">Tamanho (opcional)</Label>
                <Input
                  id="tamanho"
                  value={formData.tamanho}
                  onChange={(e) => setFormData({ ...formData, tamanho: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {modoManual && (
            <Button variant="ghost" size="sm" onClick={() => setModoManual(false)}>
              Voltar
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {modoManual ? 'Cancelar' : 'Fechar'}
          </Button>
          {modoManual && (
            <Button size="sm" onClick={handleSubmitManual}>
              Adicionar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
