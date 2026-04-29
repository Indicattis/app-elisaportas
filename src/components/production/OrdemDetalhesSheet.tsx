import { useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CheckCircle2, Circle, Package, UserCheck, Download, Clock, Archive, Printer, Tags, RotateCcw, AlertTriangle, PauseCircle, Wrench, ChevronDown, Check, FileText, Image as ImageIcon, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { useProducaoAuth } from "@/hooks/useProducaoAuth";
import {
  OPCOES_INTERNA_EXTERNA,
  OPCOES_LADO_MOTOR,
  OPCOES_POSICAO_GUIA,
  OPCOES_GUIA,
  OPCOES_APARENCIA_TESTEIRA,
} from "@/types/pedidoObservacoes";
import { useOrdemPDFData } from "@/hooks/useOrdemPDFData";
import { baixarOrdemProducaoPDF } from "@/utils/ordemProducaoPDFGenerator";
import { toast } from "sonner";
import { OrigemBadges } from "@/components/shared/OrigemBadges";
import { useCronometroOrdem } from "@/hooks/useCronometroOrdem";
import { useEtiquetasProducao } from "@/hooks/useEtiquetasProducao";
import { useRegrasEtiquetas } from "@/hooks/useRegrasEtiquetas";
import { gerarPDFEtiquetaProducao, gerarPDFEtiquetasProducaoMultiplas } from "@/utils/etiquetasPDFGenerator";
import { RetornarProducaoModal } from "./RetornarProducaoModal";
import { CoresPortasEnrolar } from "@/components/shared/CoresPortasEnrolar";
import { AvisoFaltaModal } from "./AvisoFaltaModal";
import { InformarFaltaLinhaModal } from "./InformarFaltaLinhaModal";
import { ImprimirEtiquetasModal } from "@/components/ordens/ImprimirEtiquetasModal";
import { formatarTamanho, formatarDimensoes } from "@/utils/formatters";
import { getLabelTipoProduto } from "@/utils/tipoProdutoLabels";
import { usePedidoPortaSocialStatus } from "@/hooks/usePedidoPortaSocialStatus";
import { DoorOpen } from "lucide-react";

type TipoOrdem = 'soldagem' | 'perfiladeira' | 'separacao' | 'qualidade' | 'pintura' | 'embalagem';

interface LinhaOrdem {
  id: string;
  item: string;
  quantidade: number;
  tamanho?: string;
  concluida: boolean;
  produto_venda_id?: string;
  indice_porta?: number | null;
  cor_nome?: string;
  tipo_pintura?: string;
  largura?: number;
  altura?: number;
  estoque_id?: string;
  requer_pintura?: boolean;
  com_problema?: boolean;
  problema_descricao?: string;
}

interface ObservacaoVisita {
  id: string;
  produto_venda_id: string;
  indice_porta: number;
  interna_externa: string;
  lado_motor: string;
  posicao_guia: string;
  opcao_guia: string;
  aparencia_testeira: string;
}

interface Ordem {
  id: string;
  numero_ordem: string;
  pedido_id: string;
  status: string;
  observacoes?: string;
  responsavel_id?: string;
  capturada_em?: string;
  tempo_conclusao_segundos?: number;
  pausada?: boolean;
  pausada_em?: string;
  justificativa_pausa?: string;
  tempo_acumulado_segundos?: number;
  projeto_alterado?: boolean;
  projeto_alterado_em?: string;
  projeto_alterado_descricao?: string;
  linhas?: LinhaOrdem[];
  observacoesVisita?: ObservacaoVisita[];
  pedido?: {
    id: string;
    numero_pedido: string;
    cliente_nome: string;
    venda_id?: string;
    observacoes?: string;
    updated_at?: string;
    ficha_visita_url?: string;
    ficha_visita_nome?: string;
    vendas?: {
      observacoes_venda?: string;
    };
    produtos?: Array<{
      id?: string;
      tipo_produto?: string;
      largura?: number;
      altura?: number;
      catalogo_cores?: { nome: string; codigo_hex: string } | null;
    }>;
  };
  admin_users?: {
    nome: string;
    foto_perfil_url?: string;
  };
}

interface OrdemDetalhesSheetProps {
  ordem: Ordem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipoOrdem: TipoOrdem;
  onMarcarLinha: (linhaId: string, concluida: boolean) => void;
  onConcluirOrdem: (ordemId: string) => void;
  onCapturarOrdem?: (ordemId: string) => void;
  isUpdating?: boolean;
  isCapturing?: boolean;
  onIniciarPintura?: () => void;
  onFinalizarPintura?: () => void;
  isIniciando?: boolean;
  isFinalizando?: boolean;
  onRetornarProducao?: () => void;
  onPausarOrdem?: (ordemId: string, justificativa: string, linhasProblemaIds?: string[], comentarioPedido?: string) => Promise<void>;
  isPausing?: boolean;
  onMarcarLinhaProblema?: (linhaId: string, ordemId: string, descricao: string) => void;
  isMarkingProblem?: boolean;
  onMarcarCienteAlteracao?: (ordemId: string, tipoOrdem: string) => Promise<void>;
  onResolverProblemaLinha?: (linhaId: string) => void;
  isResolvingProblem?: boolean;
}

const TIPO_LABELS: Record<TipoOrdem, string> = {
  soldagem: 'Soldagem',
  perfiladeira: 'Perfiladeira',
  separacao: 'Separação',
  qualidade: 'Qualidade',
  pintura: 'Pintura',
  embalagem: 'Embalagem',
};

const TIPO_ORDEM_ETIQUETA: Record<TipoOrdem, string> = {
  soldagem: 'Ordem de Soldagem',
  perfiladeira: 'Ordem de Perfiladeira',
  separacao: 'Ordem de Separação',
  qualidade: 'Ordem de Qualidade',
  pintura: 'Ordem de Pintura',
  embalagem: 'Ordem de Embalagem',
};

export function OrdemDetalhesSheet({
  ordem,
  open,
  onOpenChange,
  tipoOrdem,
  onMarcarLinha,
  onConcluirOrdem,
  onCapturarOrdem,
  isUpdating = false,
  isCapturing = false,
  onIniciarPintura,
  onFinalizarPintura,
  isIniciando = false,
  isFinalizando = false,
  onRetornarProducao,
  onPausarOrdem,
  isPausing = false,
  onMarcarLinhaProblema,
  isMarkingProblem = false,
  onMarcarCienteAlteracao,
  onResolverProblemaLinha,
  isResolvingProblem = false,
}: OrdemDetalhesSheetProps) {
  const { user: authUser } = useAuth();
  const { user: producaoUser } = useProducaoAuth();
  // Em rotas /producao/* o usuário está logado via useProducaoAuth (CPF).
  // Priorizamos esse contexto para evitar que o AuthProvider global deixe as linhas bloqueadas.
  const currentUserId = producaoUser?.user_id || authUser?.id;
  const user = currentUserId ? { id: currentUserId } : null;
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
  const [retornarModalOpen, setRetornarModalOpen] = useState(false);
  const [avisoFaltaModalOpen, setAvisoFaltaModalOpen] = useState(false);
  const [linhaProblemaModalOpen, setLinhaProblemaModalOpen] = useState(false);
  const [imprimirEtiquetasOpen, setImprimirEtiquetasOpen] = useState(false);
  const [isMarcandoCiente, setIsMarcandoCiente] = useState(false);
  const [linhaSelecionada, setLinhaSelecionada] = useState<LinhaOrdem | null>(null);
  const [checklistExtraQualidade, setChecklistExtraQualidade] = useState(false);
  const { buscarDadosOrdem } = useOrdemPDFData();
  const { calcularEtiquetasLinha } = useEtiquetasProducao();
  const { encontrarRegraAplicavel, encontrarRegraPorNome } = useRegrasEtiquetas();
  
  const linhas = ordem?.linhas || [];
  const linhasConcluidas = linhas.filter(l => l.concluida).length;
  const linhasComProblema = linhas.filter(l => l.com_problema).length;
  const todasConcluidas = linhas.length === 0 || linhas.every(l => l.concluida);
  const temLinhaComProblema = linhasComProblema > 0;
  const progresso = linhas.length > 0 ? Math.round((linhasConcluidas / linhas.length) * 100) : 0;

  const { data: portaSocialStatus } = usePedidoPortaSocialStatus(ordem?.pedido_id, open);
  
  const { tempoDecorrido, deveAnimar } = useCronometroOrdem({
    capturada_em: ordem?.capturada_em,
    tempo_conclusao_segundos: ordem?.tempo_conclusao_segundos,
    todas_linhas_concluidas: todasConcluidas && ordem?.status === 'concluido',
    responsavel_id: ordem?.responsavel_id,
    pausada: ordem?.pausada,
    tempo_acumulado_segundos: ordem?.tempo_acumulado_segundos,
  });
  
  if (!ordem) return null;
  
  const isResponsavel = ordem.responsavel_id === user?.id;
  const temResponsavel = !!ordem.responsavel_id;
  const podeMarcarLinhas = temResponsavel && isResponsavel;

  const origemOrdemLabel = TIPO_ORDEM_ETIQUETA[tipoOrdem];

  const handleImprimirEtiqueta = (linha: LinhaOrdem) => {
    try {
      const calculo = calcularEtiquetasLinha(linha);
      
      // Montar portaLabel a partir dos dados da linha
      let portaLabel: string | undefined;
      if (linha.produto_venda_id && ordem?.pedido?.produtos) {
        const portaKey = `${linha.produto_venda_id}_${linha.indice_porta ?? 0}`;
        const todosProdutos = ordem.pedido.produtos || [];
        // Recalcular numeração de portas
        const linhasAgrupadas = linhas || [];
        const portaKeys = new Set<string>();
        const portaKeysOrdenadas: string[] = [];
        linhasAgrupadas.forEach((l: LinhaOrdem) => {
          const key = l.produto_venda_id ? `${l.produto_venda_id}_${l.indice_porta ?? 0}` : 'sem_porta';
          if (key !== 'sem_porta' && !portaKeys.has(key)) {
            portaKeys.add(key);
            portaKeysOrdenadas.push(key);
          }
        });
        const portaNum = portaKeysOrdenadas.indexOf(portaKey);
        if (portaNum >= 0) {
          const baseProdutoId = linha.produto_venda_id;
          const prod = baseProdutoId ? todosProdutos.find((p: any) => p.id === baseProdutoId) : null;
          const tipoLabel = getLabelTipoProduto(prod?.tipo_produto);
          const num = String(portaNum + 1).padStart(2, '0');
          const larguraPorta = linha.largura || prod?.largura;
          const alturaPorta = linha.altura || prod?.altura;
          const dimTexto = larguraPorta && alturaPorta ? ` — ${formatarDimensoes(larguraPorta, alturaPorta)}` : '';
          portaLabel = `${tipoLabel} #${num}${dimTexto}`;
        }
      }
      
      // Aplicar lógica de quebra de etiquetas (divisor)
      const divisor = calculo.divisor || 1;
      const quantidadeTotal = calculo.quantidade;
      let doc;

      if (calculo.etiquetasNecessarias > 1) {
        const tags: any[] = [];
        for (let i = 1; i <= calculo.etiquetasNecessarias; i++) {
          const isUltimaEtiqueta = i === calculo.etiquetasNecessarias;
          const resto = quantidadeTotal % divisor;
          let quantidadeParcial: number;
          if (divisor > 1) {
            quantidadeParcial = isUltimaEtiqueta && resto > 0 ? resto : divisor;
          } else {
            quantidadeParcial = quantidadeTotal;
          }
          tags.push({
            tagNumero: i,
            totalTags: calculo.etiquetasNecessarias,
            nomeProduto: calculo.nomeProduto,
            numeroPedido: ordem?.pedido?.numero_pedido || ordem?.numero_ordem || '',
            quantidade: quantidadeParcial,
            quantidadeParcial,
            quantidadeTotal,
            divisor,
            largura: calculo.largura,
            altura: calculo.altura,
            clienteNome: ordem?.pedido?.cliente_nome,
            tamanho: linha.tamanho,
            corNome: linha.cor_nome,
            tipoPintura: linha.tipo_pintura,
            origemOrdem: origemOrdemLabel,
            responsavelNome: ordem?.admin_users?.nome,
            portaLabel,
          });
        }
        doc = gerarPDFEtiquetasProducaoMultiplas(tags);
      } else {
        const tag = {
          tagNumero: 1,
          totalTags: 1,
          nomeProduto: calculo.nomeProduto,
          numeroPedido: ordem?.pedido?.numero_pedido || ordem?.numero_ordem || '',
          quantidade: quantidadeTotal,
          largura: calculo.largura,
          altura: calculo.altura,
          clienteNome: ordem?.pedido?.cliente_nome,
          tamanho: linha.tamanho,
          corNome: linha.cor_nome,
          tipoPintura: linha.tipo_pintura,
          origemOrdem: origemOrdemLabel,
          responsavelNome: ordem?.admin_users?.nome,
          portaLabel,
        };
        doc = gerarPDFEtiquetaProducao(tag);
      }
      
      // Criar iframe oculto para impressão na aba atual
      const blobUrl = String(doc.output('bloburl'));
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '1px';
      iframe.style.height = '1px';
      iframe.style.border = 'none';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';
      document.body.appendChild(iframe);
      
      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.print();
            
            window.addEventListener('focus', () => {
              setTimeout(() => {
                if (document.body.contains(iframe)) {
                  document.body.removeChild(iframe);
                }
              }, 100);
            }, { once: true });
            
            setTimeout(() => {
              if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
              }
            }, 10000);
          } catch (error) {
            console.error('Erro ao imprimir:', error);
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }
        }, 500);
      };
      
      iframe.src = blobUrl;
      
      const totalGeradas = calculo.etiquetasNecessarias;
      toast.success(`${totalGeradas} etiqueta${totalGeradas > 1 ? 's' : ''} pronta${totalGeradas > 1 ? 's' : ''} para impressão`);
    } catch (error) {
      console.error('Erro ao gerar etiqueta:', error);
      toast.error('Erro ao gerar etiqueta');
    }
  };

  // Função auxiliar para obter recomendação de etiquetas (só retorna valor se existir regra)
  const getEtiquetasRecomendadas = (linha: LinhaOrdem): number | null => {
    const dimensoes = { tamanho: linha.largura || 0 };
    
    // Primeiro tenta encontrar regra pelo estoque_id
    let regra = linha.estoque_id 
      ? encontrarRegraAplicavel(linha.estoque_id, dimensoes) 
      : null;
    
    // Se não encontrou por estoque_id, tenta pelo nome do produto
    if (!regra && linha.item) {
      regra = encontrarRegraPorNome(linha.item, dimensoes);
    }
    
    if (!regra) return null;
    
    try {
      const calculo = calcularEtiquetasLinha(linha);
      return calculo.etiquetasNecessarias;
    } catch {
      return null;
    }
  };

  const handleDownloadPDF = async () => {
    if (!ordem) return;
    
    setIsDownloadingPDF(true);
    try {
      const dadosCompletos = await buscarDadosOrdem(ordem.id, tipoOrdem);
      baixarOrdemProducaoPDF(dadosCompletos);
      toast.success("PDF baixado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar PDF da ordem");
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  const handleImprimirTodasEtiquetas = () => {
    try {
      if (linhas.length === 0) {
        toast.error("Nenhum item para imprimir");
        return;
      }

      // Criar todas as tags de todas as linhas
      const todasTags: any[] = [];
      
      linhas.forEach((linha) => {
        const calculo = calcularEtiquetasLinha(linha);
        const divisor = calculo.divisor || 1;
        const quantidadeTotal = calculo.quantidade;
        
        for (let i = 1; i <= calculo.etiquetasNecessarias; i++) {
          const isUltimaEtiqueta = i === calculo.etiquetasNecessarias;
          const resto = quantidadeTotal % divisor;
          
          // Se tem divisor > 1, calcular a quantidade parcial
          let quantidadeParcial: number;
          if (divisor > 1) {
            quantidadeParcial = isUltimaEtiqueta && resto > 0 ? resto : divisor;
          } else {
            quantidadeParcial = quantidadeTotal;
          }
          
          todasTags.push({
            tagNumero: i,
            totalTags: calculo.etiquetasNecessarias,
            nomeProduto: calculo.nomeProduto,
            numeroPedido: ordem?.pedido?.numero_pedido || ordem?.numero_ordem || '',
            quantidade: quantidadeParcial,
            quantidadeParcial,
            quantidadeTotal,
            divisor,
            largura: calculo.largura,
            altura: calculo.altura,
            clienteNome: ordem?.pedido?.cliente_nome,
            tamanho: linha.tamanho,
            corNome: linha.cor_nome,
            tipoPintura: linha.tipo_pintura,
            origemOrdem: origemOrdemLabel,
            responsavelNome: ordem?.admin_users?.nome,
          });
        }
      });

      if (todasTags.length === 0) {
        toast.error("Nenhuma etiqueta para gerar");
        return;
      }

      // Gerar PDF com todas as etiquetas
      const doc = gerarPDFEtiquetasProducaoMultiplas(todasTags);
      
      // Criar iframe oculto para impressão
      const blobUrl = String(doc.output('bloburl'));
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '1px';
      iframe.style.height = '1px';
      iframe.style.border = 'none';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';
      document.body.appendChild(iframe);
      
      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.print();
            window.addEventListener('focus', () => {
              setTimeout(() => {
                if (document.body.contains(iframe)) {
                  document.body.removeChild(iframe);
                }
              }, 100);
            }, { once: true });
            setTimeout(() => {
              if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
              }
            }, 10000);
          } catch (error) {
            console.error('Erro ao imprimir:', error);
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }
        }, 500);
      };
      
      iframe.src = blobUrl;
      
      toast.success(`${todasTags.length} etiqueta(s) pronta(s) para impressão`);
    } catch (error) {
      console.error('Erro ao gerar etiquetas:', error);
      toast.error('Erro ao gerar etiquetas');
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="h-[80vh] max-w-[700px] mx-auto rounded-t-xl overflow-y-auto flex flex-col p-0"
      >
        {/* Header fixo */}
        <div className="sticky top-0 z-10 bg-background border-b px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {temResponsavel && (
                <Avatar className="h-9 w-9 border-2 border-primary/20">
                  <AvatarImage src={ordem.admin_users?.foto_perfil_url} alt={ordem.admin_users?.nome} />
                  <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                    {ordem.admin_users?.nome?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold truncate">{ordem.numero_ordem}</span>
                <span className="text-xs text-muted-foreground truncate">{ordem.pedido?.cliente_nome}</span>
              </div>
            </div>
            
            {/* Centro: Cores das Portas de Enrolar */}
            <div className="flex-1 flex justify-center">
              <CoresPortasEnrolar produtos={ordem.pedido?.produtos} />
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-muted-foreground">Ped. {ordem.pedido?.numero_pedido}</span>
              {ordem.capturada_em && (
                <div className="flex items-center gap-1">
                  <Clock className={`h-3.5 w-3.5 text-orange-500 ${deveAnimar ? 'animate-pulse' : ''}`} />
                  <span className="text-xs font-mono text-orange-600 dark:text-orange-400">
                    {tempoDecorrido}
                  </span>
                </div>
              )}
              <Badge variant={
                ordem.status === 'concluido' || ordem.status === 'pronta' ? 'default' : 'secondary'
              } className="text-xs">
                {tipoOrdem === 'pintura' ? (
                  ordem.status === 'pendente' ? 'Para Pintar' :
                  ordem.status === 'pintando' ? 'Pintando' :
                  ordem.status === 'pronta' ? 'Pronta' : ordem.status
                ) : (
                  ordem.status === 'concluido' ? 'Concluído' : 'Pendente'
                )}
              </Badge>
            </div>
          </div>
          
          {/* Checklist extra de verificação para qualidade */}
          {tipoOrdem === 'qualidade' && todasConcluidas && linhas.length > 0 && podeMarcarLinhas && ordem.status !== 'concluido' && !temLinhaComProblema && (
            <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-2">
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400">Verificações obrigatórias</p>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={checklistExtraQualidade}
                  onCheckedChange={(v) => setChecklistExtraQualidade(!!v)}
                  className="border-amber-500/50 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                />
                <span className="text-sm text-foreground">Verifiquei que a testeira é compatível com motor</span>
              </label>
            </div>
          )}

          {/* Botão de concluir no header quando todos os itens estão marcados */}
          {todasConcluidas && linhas.length > 0 && podeMarcarLinhas && ordem.status !== 'concluido' && ordem.status !== 'pronta' && !temLinhaComProblema && (
            <div className="mt-4">
              {tipoOrdem === 'pintura' || tipoOrdem === 'embalagem' ? (
                <Button
                  className="w-full"
                  disabled={isFinalizando}
                  onClick={onFinalizarPintura}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {isFinalizando ? "Concluindo..." : (tipoOrdem === 'embalagem' ? "Concluir Embalagem" : "Concluir Pintura")}
                </Button>
              ) : (
                <Button
                  className="w-full"
                  disabled={isUpdating || (tipoOrdem === 'qualidade' && !checklistExtraQualidade)}
                  onClick={() => onConcluirOrdem(ordem.id)}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {isUpdating ? "Concluindo..." : "Concluir Ordem"}
                </Button>
              )}
            </div>
          )}

          {/* Alerta quando há linha com problema */}
          {temLinhaComProblema && podeMarcarLinhas && ordem.status !== 'concluido' && ordem.status !== 'pronta' && (
            <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-300 text-sm font-medium">
                <AlertTriangle className="h-4 w-4" />
                {linhasComProblema} {linhasComProblema === 1 ? 'item com problema' : 'itens com problema'} - não é possível concluir
              </div>
            </div>
          )}
        </div>

        {/* Conteúdo scrollável */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Destaque: Pedido com Porta Social (terceirizada) */}
          {portaSocialStatus && (() => {
            const status = portaSocialStatus.status;
            const statusMap: Record<string, { label: string; classes: string }> = {
              pendente: {
                label: 'Aguardando produção',
                classes: 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300',
              },
              capturada: {
                label: 'Em produção pelo fornecedor',
                classes: 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300',
              },
              em_producao: {
                label: 'Em produção pelo fornecedor',
                classes: 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300',
              },
              concluido: {
                label: 'Concluída',
                classes: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
              },
              concluida: {
                label: 'Concluída',
                classes: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
              },
            };
            const meta = statusMap[status] ?? {
              label: status,
              classes: 'bg-muted/40 border-border text-muted-foreground',
            };
            return (
              <div className={`p-4 rounded-lg border-2 ${meta.classes}`}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <DoorOpen className="h-5 w-5 flex-shrink-0" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-semibold truncate">
                        Pedido com Porta Social (Terceirizada)
                      </span>
                      <span className="text-xs opacity-80 truncate">
                        Ordem {portaSocialStatus.numero_ordem}
                        {portaSocialStatus.admin_users?.nome && ` • ${portaSocialStatus.admin_users.nome}`}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {portaSocialStatus.em_backlog && (
                      <Badge variant="destructive" className="text-[10px]">Em backlog</Badge>
                    )}
                    <Badge variant="secondary" className="text-xs">
                      {meta.label}
                    </Badge>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Banner: ordem disponível para captura (inclui ordens recém retrocedidas) */}
          {!temResponsavel && ordem.status !== 'concluido' && ordem.status !== 'pronta' && onCapturarOrdem && (
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                <span className="text-sm font-semibold">Ordem disponível</span>
                <Badge variant="secondary" className="ml-auto">Sem responsável</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Para marcar as linhas desta ordem você precisa capturá-la primeiro.
                {(ordem as any).em_backlog && " Esta ordem voltou ao backlog (pode ter sido retrocedida) e precisa ser recapturada."}
              </p>
              <Button
                className="w-full"
                disabled={isCapturing}
                onClick={() => onCapturarOrdem(ordem.id)}
              >
                <UserCheck className="h-4 w-4 mr-2" />
                {isCapturing ? "Capturando..." : "Capturar Ordem"}
              </Button>
            </div>
          )}

          {/* Responsável não atribuído (quando já concluída/pronta) */}
          {!temResponsavel && (ordem.status === 'concluido' || ordem.status === 'pronta') && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <span className="text-sm text-muted-foreground">Responsável</span>
              <Badge variant="secondary">Não atribuído</Badge>
            </div>
          )}

          {/* Alerta quando não pode marcar */}
          {temResponsavel && !isResponsavel && ordem.status !== 'concluido' && ordem.status !== 'pronta' && (
            <>
              <Separator />
              <div className="p-3 rounded-lg bg-muted/50 border border-muted">
                <p className="text-xs text-muted-foreground text-center">
                  Esta ordem está sendo executada por <span className="font-medium">{ordem.admin_users?.nome}</span>. Apenas o responsável pode marcar as linhas.
                </p>
              </div>
            </>
          )}

          {/* Alerta de ordem pausada */}
          {ordem.pausada && ordem.justificativa_pausa && (
            <>
              <Separator />
              <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300 font-medium mb-1">
                  <PauseCircle className="h-4 w-4" />
                  Ordem Pausada - Aviso de Falta
                </div>
                <p className="text-sm text-yellow-700 dark:text-yellow-200">
                  {ordem.justificativa_pausa}
                </p>
              </div>
            </>
          )}

          {/* Alerta de Projeto Alterado */}
          {ordem.projeto_alterado && (
            <>
              <Separator />
              <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 animate-pulse">
                <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300 font-medium mb-1">
                  <AlertTriangle className="h-4 w-4" />
                  ⚠️ Projeto Alterado
                </div>
                <p className="text-sm text-orange-700 dark:text-orange-200">
                  {ordem.projeto_alterado_descricao || 'O pedido foi alterado após a geração desta ordem.'}
                </p>
                {ordem.projeto_alterado_em && (
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                    Alterado em: {format(new Date(ordem.projeto_alterado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                )}
                {podeMarcarLinhas && onMarcarCienteAlteracao && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isMarcandoCiente}
                    onClick={async () => {
                      setIsMarcandoCiente(true);
                      try {
                        await onMarcarCienteAlteracao(ordem.id, tipoOrdem);
                        toast.success('Ciência registrada com sucesso');
                      } catch (error) {
                        toast.error('Erro ao registrar ciência');
                      } finally {
                        setIsMarcandoCiente(false);
                      }
                    }}
                    className="w-full mt-3 border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-900/50"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    {isMarcandoCiente ? 'Registrando...' : 'Ciente da Alteração'}
                  </Button>
                )}
              </div>
            </>
          )}

          {ordem.observacoesVisita && ordem.observacoesVisita.length > 0 && (
            <>
              <Separator />
              <Collapsible>
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors cursor-pointer">
                    <span className="text-sm font-medium flex items-center gap-2 text-amber-700 dark:text-amber-300">
                      <Wrench className="h-4 w-4" />
                      Especificações da Visita Técnica
                      <Badge variant="secondary" className="text-xs">
                        {ordem.observacoesVisita.length} {ordem.observacoesVisita.length === 1 ? 'porta' : 'portas'}
                      </Badge>
                    </span>
                    <ChevronDown className="h-4 w-4 text-amber-600 dark:text-amber-400 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-3 p-3 rounded-b-lg bg-amber-50/50 dark:bg-amber-950/20 border-x border-b border-amber-200 dark:border-amber-800 -mt-1">
                    {ordem.observacoesVisita.map((obs, idx) => (
                      <div key={obs.id || idx} className="space-y-2">
                        {idx > 0 && <Separator className="my-2" />}
                        <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                          Porta {idx + 1}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="outline" className="text-xs bg-amber-50 dark:bg-amber-950 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300">
                            {OPCOES_INTERNA_EXTERNA[obs.interna_externa as keyof typeof OPCOES_INTERNA_EXTERNA] || obs.interna_externa}
                          </Badge>
                          <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300">
                            Motor: {OPCOES_LADO_MOTOR[obs.lado_motor as keyof typeof OPCOES_LADO_MOTOR] || obs.lado_motor}
                          </Badge>
                          <Badge variant="outline" className="text-xs bg-purple-50 dark:bg-purple-950 border-purple-300 dark:border-purple-700 text-purple-700 dark:text-purple-300">
                            {OPCOES_POSICAO_GUIA[obs.posicao_guia as keyof typeof OPCOES_POSICAO_GUIA] || obs.posicao_guia}
                          </Badge>
                          <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-950 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300">
                            {OPCOES_GUIA[obs.opcao_guia as keyof typeof OPCOES_GUIA] || obs.opcao_guia}
                          </Badge>
                          <Badge variant="outline" className="text-xs bg-orange-50 dark:bg-orange-950 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300">
                            Testeira: {OPCOES_APARENCIA_TESTEIRA[obs.aparencia_testeira as keyof typeof OPCOES_APARENCIA_TESTEIRA] || obs.aparencia_testeira}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </>
          )}

          {/* Ficha de Visita Técnica */}
          {ordem.pedido?.ficha_visita_url && (
            <>
              <Separator />
              <div className="space-y-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <span className="text-sm font-medium flex items-center gap-2 text-amber-700 dark:text-amber-300">
                  <FileText className="h-4 w-4" />
                  Ficha de Visita Técnica
                </span>
                {(() => {
                  const url = ordem.pedido.ficha_visita_url!;
                  const nome = ordem.pedido.ficha_visita_nome || 'Ficha de visita';
                  const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(url);
                  
                  if (isImage) {
                    return (
                      <a href={url} target="_blank" rel="noopener noreferrer" className="block">
                        <img 
                          src={url} 
                          alt={nome}
                          className="w-full max-h-48 object-cover rounded-md border cursor-pointer hover:opacity-90 transition-opacity"
                        />
                        <span className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" />
                          {nome}
                        </span>
                      </a>
                    );
                  }
                  
                  return (
                    <a 
                      href={url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 rounded-md border hover:bg-accent/50 transition-colors"
                    >
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm truncate flex-1">{nome}</span>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </a>
                  );
                })()}
              </div>
            </>
          )}

          {ordem.pedido?.observacoes && (
            <>
              <Separator />
              <div className="space-y-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-2 text-amber-700 dark:text-amber-400">
                    <Package className="h-4 w-4" />
                    Observações Gerais do Pedido
                  </span>
                  {ordem.pedido?.updated_at && (
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(ordem.pedido.updated_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {ordem.pedido.observacoes}
                </p>
              </div>
            </>
          )}

          {ordem.pedido?.vendas?.observacoes_venda && (
            <>
              <Separator />
              <div className="space-y-2 p-3 rounded-lg bg-muted/50 border">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Observações Gerais da Venda
                </span>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {ordem.pedido.vendas.observacoes_venda}
                </p>
              </div>
            </>
          )}

          {ordem.observacoes && (
            <>
              <Separator />
              <div className="space-y-2">
                <span className="text-sm font-medium">Observações da Ordem</span>
                <p className="text-sm text-muted-foreground">{ordem.observacoes}</p>
              </div>
            </>
          )}

          <Separator />

          {/* Lista de linhas */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Itens de Produção</span>
              </div>
              <div className="flex items-center gap-2">
                {(tipoOrdem === 'perfiladeira' || tipoOrdem === 'embalagem') && ordem.pedido && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={handleImprimirTodasEtiquetas}
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Imprimir Todas Etiquetas</span>
                  </Button>
                )}
                {tipoOrdem !== 'perfiladeira' && tipoOrdem !== 'embalagem' && ordem.pedido && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={() => setImprimirEtiquetasOpen(true)}
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Imprimir Etiquetas</span>
                  </Button>
                )}
              {todasConcluidas && (
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Todas concluídas
                </Badge>
              )}
              </div>
            </div>

            <div className="space-y-4">
              {(() => {
                  // Filtrar linhas: pintura filtra por requer_pintura, demais usam todas
                  const linhasAgrupadas = tipoOrdem === 'pintura' 
                    ? linhas.filter(l => l.requer_pintura !== false)
                    : linhas;
                  
                  // Obter produtos do tipo porta_enrolar do pedido para buscar dimensões
                  // Obter todos os produtos do pedido para buscar dimensões e tipos
                  const todosProdutos = ordem.pedido?.produtos || [];
                  
                  // Agrupar linhas por produto_venda_id (com fallback do hook que recupera via pedido_linhas)
                  const linhasPorPorta = linhasAgrupadas.reduce((grupos, linha) => {
                    const key = linha.produto_venda_id 
                      ? `${linha.produto_venda_id}_${linha.indice_porta ?? 0}` 
                      : 'sem_porta';
                    if (!grupos[key]) {
                      grupos[key] = [];
                    }
                    grupos[key].push(linha);
                    return grupos;
                  }, {} as Record<string, LinhaOrdem[]>);

                  // Criar mapa de numeração baseado na ordem de aparição das chaves únicas
                  const uniquePortaKeys = Object.keys(linhasPorPorta).filter(k => k !== 'sem_porta');
                  const portasNumeracaoMap = new Map<string, number>();
                  uniquePortaKeys.forEach((key, idx) => {
                    portasNumeracaoMap.set(key, idx + 1);
                  });

                  return Object.entries(linhasPorPorta).map(([portaId, linhasPortaRaw], index) => {
                    const linhasPorta = linhasPortaRaw as LinhaOrdem[];
                    const primeiraLinha = linhasPorta[0];
                    const todasConcluidasPorta = linhasPorta.every(l => l.concluida);
                    
                    // Buscar dimensões da linha ou do produto correspondente no pedido
                    let larguraPorta = primeiraLinha.largura;
                    let alturaPorta = primeiraLinha.altura;
                    
                    // Se não tem dimensões na linha, buscar no produto correspondente
                    if (!larguraPorta || !alturaPorta) {
                      // Extrair o produto_venda_id base (sem o sufixo _indice)
                      const baseProdutoId = portaId !== 'sem_porta' ? portaId.split('_').slice(0, -1).join('_') : null;
                      const produtoCorrespondente = baseProdutoId
                        ? todosProdutos.find((p: any) => p.id === baseProdutoId)
                        : todosProdutos[index];
                      
                      if (produtoCorrespondente) {
                        larguraPorta = larguraPorta || produtoCorrespondente.largura;
                        alturaPorta = alturaPorta || produtoCorrespondente.altura;
                      }
                    }
                    
                    return (
                      <div key={portaId} className="space-y-2 p-3 rounded-lg border bg-card">
                        {/* Cabeçalho do grupo de porta */}
                        <div className="flex items-center justify-between mb-2 pb-2 border-b">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-primary" />
                              <span className="font-semibold text-sm">
                                {(() => {
                                  const baseProdutoId2 = portaId !== 'sem_porta' ? portaId.split('_').slice(0, -1).join('_') : null;
                                  const prod = baseProdutoId2 ? todosProdutos.find((p: any) => p.id === baseProdutoId2) : null;
                                  const tipoLabel = getLabelTipoProduto(prod?.tipo_produto);
                                  const num = String(portasNumeracaoMap.get(portaId) || 1).padStart(2, '0');
                                  return `${tipoLabel} #${num}`;
                                })()}
                                {larguraPorta && alturaPorta && (
                                   <span className="font-normal text-muted-foreground ml-2">
                                    — {formatarDimensoes(larguraPorta, alturaPorta)}
                                  </span>
                                )}
                              </span>
                              {todasConcluidasPorta && (
                                <Badge variant="outline" className="bg-green-50">
                                  <CheckCircle2 className="h-3 w-3" />
                                </Badge>
                              )}
                            </div>
                            {tipoOrdem === 'pintura' && primeiraLinha.cor_nome && (
                              <div className="text-xs text-muted-foreground">
                                <span className="font-medium">Pintura:</span> {primeiraLinha.cor_nome}
                                {primeiraLinha.tipo_pintura && ` (${primeiraLinha.tipo_pintura})`}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Itens da porta */}
                        <div className="space-y-2">
                          {linhasPorta.map((linha, indexLinha) => {
                            const linhaAnteriorConcluida = indexLinha === 0 || linhasPorta[indexLinha - 1].concluida;
                            return (
                            <div
                              key={linha.id}
                              className={`flex items-start gap-3 p-3 rounded-md transition-colors ${
                                linha.com_problema 
                                  ? 'border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/20' 
                                  : 'hover:bg-accent/50'
                              }`}
                            >
                            <Label
                              htmlFor={`checkbox-${linha.id}`}
                              className="flex items-start gap-3 flex-1 cursor-pointer"
                            >
                              <Checkbox
                                id={`checkbox-${linha.id}`}
                                checked={linha.concluida}
                                onCheckedChange={(checked) => onMarcarLinha(linha.id, checked as boolean)}
                                disabled={ordem.status === 'concluido' || ordem.status === 'pronta' || isUpdating || !podeMarcarLinhas || (tipoOrdem === 'qualidade' && linha.com_problema) || !linhaAnteriorConcluida}
                                className="mt-1"
                                title={
                                  !podeMarcarLinhas && !temResponsavel
                                    ? 'Capture a ordem para marcar as linhas'
                                    : !podeMarcarLinhas
                                      ? 'Apenas o responsável pode marcar as linhas'
                                      : !linhaAnteriorConcluida
                                        ? 'Conclua a linha anterior primeiro'
                                        : undefined
                                }
                              />
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  {linha.com_problema ? (
                                    <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
                                  ) : linha.concluida ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                                  ) : (
                                    <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  )}
                                  <span className={`text-base font-medium ${
                                    linha.com_problema 
                                      ? 'text-red-700 dark:text-red-300' 
                                      : linha.concluida 
                                        ? 'line-through text-muted-foreground' 
                                        : ''
                                  }`}>
                                    {linha.item}
                                  </span>
                                </div>
                                
                                {/* Mostrar descrição do problema se houver */}
                                {linha.com_problema && linha.problema_descricao && (
                                  <div className="mt-1 p-1.5 rounded bg-red-100 dark:bg-red-900/30 text-xs text-red-700 dark:text-red-300">
                                    <strong>Problema:</strong> {linha.problema_descricao}
                                  </div>
                                )}
                                
                                <div className="mt-1.5 flex items-center gap-3 text-sm text-muted-foreground">
                                  <span>Qtd: {linha.quantidade}x</span>
                                  {linha.tamanho && (
                                    <span className="before:content-['·'] before:mx-1 before:text-muted-foreground/50">{formatarTamanho(linha.tamanho)}</span>
                                  )}
                                  {getEtiquetasRecomendadas(linha) !== null && (
                                    <Badge variant="outline" className="text-xs px-2 py-0.5 bg-primary/10 text-primary border-primary/30">
                                      <Tags className="h-3 w-3 mr-1" />
                                      {getEtiquetasRecomendadas(linha)} etiq.
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </Label>
                              
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {/* Botão de resolver problema */}
                              {linha.com_problema && isResponsavel && onResolverProblemaLinha && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-10 w-10 p-0 text-green-600 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900/30"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    onResolverProblemaLinha(linha.id);
                                  }}
                                  disabled={isResolvingProblem}
                                  title="Problema resolvido - liberar linha"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                              )}
                              
                              {/* Botão de informar falta/problema */}
                              {isResponsavel && !linha.concluida && !linha.com_problema && onMarcarLinhaProblema && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-10 w-10 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setLinhaSelecionada(linha);
                                    setLinhaProblemaModalOpen(true);
                                  }}
                                  title="Informar falta/problema"
                                >
                                  <AlertTriangle className="h-4 w-4" />
                                </Button>
                              )}
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-10 w-10 p-0 flex-shrink-0"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleImprimirEtiqueta(linha);
                                }}
                                title="Imprimir etiqueta"
                              >
                                <Printer className="h-5 w-5" />
                              </Button>
                            </div>
                            </div>
                          );
                          })}
                        </div>
                      </div>
                    );
                  });
                })()
              }

              {linhas.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Nenhum item de produção cadastrado
                </div>
              )}
            </div>
          </div>

          {/* Mensagens informativas para pintura */}
          {tipoOrdem === 'pintura' && ordem.status !== 'pronta' && (
            <>
              <Separator />
              {!podeMarcarLinhas && (
                <p className="text-xs text-center text-muted-foreground text-orange-600">
                  Apenas o responsável pode gerenciar esta ordem
                </p>
              )}
              {podeMarcarLinhas && !todasConcluidas && linhas.length > 0 && (
                <p className="text-xs text-center text-muted-foreground">
                  Marque todos os itens como concluídos para concluir a pintura
                </p>
              )}
            </>
          )}

          {/* Botões auxiliares e mensagens (para outras ordens) */}
          {tipoOrdem !== 'pintura' && ordem.status !== 'concluido' && (
            <>
              <Separator />
              
              {/* Botão Retornar para Produção - apenas para qualidade */}
              {tipoOrdem === 'qualidade' && podeMarcarLinhas && (
                <Button
                  variant="outline"
                  className="w-full text-destructive border-destructive/50 hover:bg-destructive/10"
                  onClick={() => setRetornarModalOpen(true)}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Retornar para Produção
                </Button>
              )}

              {/* Botão Aviso de Falta - para separação, perfiladeira, soldagem e qualidade */}
              {(tipoOrdem === 'separacao' || tipoOrdem === 'perfiladeira' || tipoOrdem === 'soldagem' || tipoOrdem === 'embalagem') && podeMarcarLinhas && !ordem.pausada && onPausarOrdem && (
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => setAvisoFaltaModalOpen(true)}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Aviso de Falta
                </Button>
              )}

              {!podeMarcarLinhas && (
                <p className="text-xs text-center text-muted-foreground text-orange-600">
                  Apenas o responsável pode concluir esta ordem
                </p>
              )}
              {!todasConcluidas && linhas.length > 0 && podeMarcarLinhas && (
                <p className="text-xs text-center text-muted-foreground">
                  Marque todos os itens como concluídos para finalizar a ordem
                </p>
              )}
            </>
          )}
        </div>

        {/* Modal de Retornar para Produção */}
        {tipoOrdem === 'qualidade' && ordem && (
          <RetornarProducaoModal
            open={retornarModalOpen}
            onOpenChange={setRetornarModalOpen}
            pedidoId={ordem.pedido_id}
            ordemQualidadeId={ordem.id}
            clienteNome={ordem.pedido?.cliente_nome}
            numeroPedido={ordem.pedido?.numero_pedido}
            onSuccess={() => {
              onOpenChange(false);
              onRetornarProducao?.();
            }}
          />
        )}

        {/* Modal de Aviso de Falta (ordem inteira) */}
      {(tipoOrdem === 'separacao' || tipoOrdem === 'perfiladeira' || tipoOrdem === 'soldagem' || tipoOrdem === 'embalagem') && ordem && onPausarOrdem && (
        <AvisoFaltaModal
          open={avisoFaltaModalOpen}
          onOpenChange={setAvisoFaltaModalOpen}
          numeroOrdem={ordem.numero_ordem}
          linhas={linhas.map(l => ({
            id: l.id,
            item: l.item,
            quantidade: l.quantidade,
            tamanho: l.tamanho || null,
          }))}
          onConfirm={async (justificativa, linhaProblemaId, comentarioPedido) => {
            await onPausarOrdem(ordem.id, justificativa, linhaProblemaId, comentarioPedido);
            onOpenChange(false);
          }}
          isPausing={isPausing}
        />
      )}

      {/* Modal de Informar Falta por Linha */}
      {linhaSelecionada && onMarcarLinhaProblema && (
        <InformarFaltaLinhaModal
          open={linhaProblemaModalOpen}
          onOpenChange={(open) => {
            setLinhaProblemaModalOpen(open);
            if (!open) setLinhaSelecionada(null);
          }}
          nomeItem={linhaSelecionada.item}
          onConfirm={async (descricao) => {
            onMarcarLinhaProblema(linhaSelecionada.id, ordem.id, descricao);
            setLinhaProblemaModalOpen(false);
            setLinhaSelecionada(null);
            onOpenChange(false);
          }}
          isSubmitting={isMarkingProblem}
        />
      )}

      {/* Modal de Imprimir Etiquetas */}
      {tipoOrdem !== 'perfiladeira' && tipoOrdem !== 'embalagem' && ordem?.pedido && (
        <ImprimirEtiquetasModal
          open={imprimirEtiquetasOpen}
          onOpenChange={setImprimirEtiquetasOpen}
          pedidoId={ordem.pedido_id}
          numeroPedido={ordem.pedido.numero_pedido}
          clienteNome={ordem.pedido.cliente_nome}
          tipoOrdem={tipoOrdem}
          responsavelNome={undefined}
          ordemId={ordem.id}
        />
      )}
      </SheetContent>
    </Sheet>
  );
}
