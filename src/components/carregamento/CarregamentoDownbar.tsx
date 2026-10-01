import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PackageCheck, Loader2, Truck, Tags, Wrench, FileText, CheckSquare, Paperclip, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { usePedidoLinhas } from "@/hooks/usePedidoLinhas";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { OrdemCarregamentoUnificada } from "@/hooks/useOrdensCarregamentoUnificadas";
import { useEtiquetasProducao } from "@/hooks/useEtiquetasProducao";
import { gerarPDFEtiquetasProducaoMultiplas, gerarPDFEtiquetaProducao } from "@/utils/etiquetasPDFGenerator";
import { CarregamentoLoadingModal } from "./CarregamentoLoadingModal";
import { CoresPortasEnrolar } from "@/components/shared/CoresPortasEnrolar";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import {
  OPCOES_INTERNA_EXTERNA,
  OPCOES_LADO_MOTOR,
  OPCOES_POSICAO_GUIA,
  OPCOES_GUIA,
  OPCOES_APARENCIA_TESTEIRA,
} from "@/types/pedidoObservacoes";

interface CarregamentoDownbarProps {
  ordem: OrdemCarregamentoUnificada | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConcluir: (params: { observacoes?: string; fotoFile?: File }) => Promise<any>;
  onSuccess: () => void;
}

export function CarregamentoDownbar({
  ordem,
  open,
  onOpenChange,
  onConcluir,
  onSuccess,
}: CarregamentoDownbarProps) {
  const { linhas, isLoading } = usePedidoLinhas(ordem?.pedido_id || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [loadingSuccess, setLoadingSuccess] = useState(false);
  const [itensMarcados, setItensMarcados] = useState<Set<string>>(new Set());
  const [checkTesteiraMotor, setCheckTesteiraMotor] = useState(false);
  const [checkPlacaSoleira, setCheckPlacaSoleira] = useState(false);
  const { calcularEtiquetasLinha } = useEtiquetasProducao();

  const { data: contratos } = useQuery({
    queryKey: ['contratos-venda-carregamento', ordem?.venda_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contratos_vendas')
        .select('id, arquivo_url, nome_arquivo')
        .eq('venda_id', ordem!.venda_id!);
      if (error) throw error;
      return data;
    },
    enabled: open && !!ordem?.venda_id,
  });

  const { data: observacoesVisita } = useQuery({
    queryKey: ['observacoes-visita-carregamento', ordem?.pedido_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pedido_porta_observacoes')
        .select(`
          *,
          produto:produtos_vendas!produto_venda_id(largura, altura, tamanho)
        `)
        .eq('pedido_id', ordem!.pedido_id!)
        .order('indice_porta', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: open && !!ordem?.pedido_id,
  });

  const toggleItem = (id: string) => {
    setItensMarcados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const marcarTodos = () => {
    if (!linhas) return;
    setItensMarcados(new Set(linhas.map(l => l.id)));
  };

  const todosItensMarcados = linhas && linhas.length > 0 && itensMarcados.size === linhas.length;
  const todosMarcados = todosItensMarcados && checkTesteiraMotor && checkPlacaSoleira;

  const handleImprimirEtiquetas = () => {
    try {
      if (!linhas || linhas.length === 0) {
        toast.error("Nenhum item para imprimir");
        return;
      }

      const todasTags: any[] = [];
      linhas.forEach((linha) => {
        const linhaParaCalculo = {
          id: linha.id,
          item: linha.nome_produto || linha.descricao_produto || 'Item',
          quantidade: linha.quantidade || 1,
          tamanho: linha.tamanho,
          largura: linha.largura,
          altura: linha.altura,
          estoque_id: linha.estoque_id || undefined,
        };
        const calculo = calcularEtiquetasLinha(linhaParaCalculo);
        for (let i = 1; i <= calculo.etiquetasNecessarias; i++) {
          todasTags.push({
            tagNumero: i,
            totalTags: calculo.etiquetasNecessarias,
            nomeProduto: calculo.nomeProduto,
            numeroPedido: ordem?.pedido?.numero_pedido || '',
            quantidade: calculo.quantidade,
            largura: calculo.largura,
            altura: calculo.altura,
            clienteNome: ordem?.nome_cliente,
            tamanho: linha.tamanho,
            origemOrdem: 'Carregamento',
            responsavelNome: ordem?.responsavel_carregamento_nome || undefined,
          });
        }
      });

      if (todasTags.length === 0) {
        toast.error("Nenhuma etiqueta para gerar");
        return;
      }

      const doc = todasTags.length > 1
        ? gerarPDFEtiquetasProducaoMultiplas(todasTags)
        : gerarPDFEtiquetaProducao(todasTags[0]);

      const blobUrl = String(doc.output('bloburl'));
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:none;opacity:0;pointer-events:none';
      document.body.appendChild(iframe);
      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.print();
            window.addEventListener('focus', () => {
              setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 100);
            }, { once: true });
            setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 10000);
          } catch (error) {
            console.error('Erro ao imprimir:', error);
            if (document.body.contains(iframe)) document.body.removeChild(iframe);
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

  const handleConcluir = async () => {
    if (!todosMarcados) {
      toast.error("Marque todos os itens antes de concluir");
      return;
    }
    if (!ordem?.id) return;

    setIsSubmitting(true);
    setShowLoadingModal(true);
    setLoadingSuccess(false);

    try {
      await onConcluir({
        observacoes: "Carregamento concluído via interface de produção",
      });
      setLoadingSuccess(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      setShowLoadingModal(false);
      setItensMarcados(new Set());
      setCheckTesteiraMotor(false);
      setCheckPlacaSoleira(false);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('[Carregamento] Erro:', error);
      toast.error(error.message || "Erro ao concluir carregamento");
      setShowLoadingModal(false);
      setIsSubmitting(false);
    }
  };

  if (!ordem) return null;

  const isInstalacao = ordem.fonte === 'instalacoes';
  const Icon = isInstalacao ? Wrench : ordem.tipo_carregamento === 'elisa' ? Truck : PackageCheck;
  const tipoLabel = isInstalacao
    ? (ordem.tipo_entrega === 'manutencao' ? 'Manutenção' : 'Instalação')
    : ordem.tipo_entrega === 'autorizado'
      ? `Autorizado${ordem.autorizado_nome ? ` — ${ordem.autorizado_nome}` : ''}`
      : (ordem.tipo_carregamento === 'elisa' ? 'Elisa' : 'Autorizado');

  return (
    <Sheet open={open} onOpenChange={(o) => {
      if (!o) { setItensMarcados(new Set()); setCheckTesteiraMotor(false); setCheckPlacaSoleira(false); setIsSubmitting(false); }
      onOpenChange(o);
    }}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl max-w-[700px] mx-auto bg-zinc-900 border-t border-white/10 p-0">
        {/* Header gradiente */}
        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-sm px-6 py-4 rounded-t-2xl border-b border-white/10">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-white/10">
                  <Icon className="h-4 w-4 text-blue-300" />
                </div>
                Carregamento — {tipoLabel}
              </div>
              <div className="flex items-center gap-2">
                {ordem.pedido?.ficha_visita_url && (
                  <a
                    href={ordem.pedido.ficha_visita_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs font-medium text-blue-300 hover:text-blue-200 transition-colors bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-lg"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Visita Técnica
                    <ExternalLink className="h-3 w-3 opacity-60" />
                  </a>
                )}
                {/* Botão de Contratos/Anexos */}
                <TooltipProvider>
                  {contratos && contratos.length > 0 ? (
                    contratos.length === 1 ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => window.open(contratos[0].arquivo_url, '_blank')}
                            className="flex items-center gap-1.5 text-xs font-medium text-purple-300 hover:text-purple-200 transition-colors bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-lg"
                          >
                            <Paperclip className="h-3.5 w-3.5" />
                            Contrato
                            <ExternalLink className="h-3 w-3 opacity-60" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{contratos[0].nome_arquivo}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="flex items-center gap-1.5 text-xs font-medium text-purple-300 hover:text-purple-200 transition-colors bg-white/5 hover:bg-white/10 px-2.5 py-1.5 rounded-lg">
                            <Paperclip className="h-3.5 w-3.5" />
                            Contratos ({contratos.length})
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {contratos.map((c) => (
                            <DropdownMenuItem
                              key={c.id}
                              onClick={() => window.open(c.arquivo_url, '_blank')}
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              {c.nome_arquivo}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )
                  ) : null}
                </TooltipProvider>
              </div>
            </SheetTitle>
          </SheetHeader>
        </div>

        <ScrollArea className="h-[calc(85vh-80px)] px-6 py-4">
          <div className="space-y-4 pb-4">
            {/* Hero card */}
            <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-white/10 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-semibold text-base">{ordem.nome_cliente}</p>
                  <p className="text-white/50 text-xs">Pedido {ordem.pedido?.numero_pedido || "N/A"}</p>
                </div>
                {ordem.data_carregamento && (
                  <div className="text-right">
                    <p className="text-white/50 text-xs">Agendado</p>
                    <p className="text-white/80 text-sm font-medium">
                      {format(new Date(ordem.data_carregamento + 'T12:00:00'), "dd/MM/yy", { locale: ptBR })}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex justify-center">
                <CoresPortasEnrolar produtos={ordem.venda?.produtos} />
              </div>
              {(() => {
                const p = ordem.pedido;
                const v = ordem.venda;
                const rua = p?.endereco_rua;
                const numero = p?.endereco_numero;
                const bairro = p?.endereco_bairro || v?.bairro;
                const cidade = p?.endereco_cidade || v?.cidade;
                const estado = p?.endereco_estado || v?.estado;
                const cep = p?.endereco_cep || v?.cep;
                const partes: string[] = [];
                if (rua) partes.push(numero ? `${rua}, Nº ${numero}` : rua);
                if (bairro) partes.push(bairro);
                if (cidade && estado) partes.push(`${cidade}/${estado}`);
                else if (cidade) partes.push(cidade);
                if (cep) partes.push(`CEP ${cep}`);
                return partes.length > 0 ? (
                  <p className="text-white/40 text-xs">{partes.join(' - ')}</p>
                ) : null;
              })()}
            </div>

            {/* Observações do Pedido */}
            {ordem.pedido?.observacoes && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-amber-400 flex items-center gap-1.5">
                    <FileText className="h-3 w-3" />
                    Observações do Pedido
                  </span>
                  {ordem.pedido?.updated_at && (
                    <span className="text-xs text-amber-400/50">
                      {format(new Date(ordem.pedido.updated_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </span>
                  )}
                </div>
                <p className="text-xs text-amber-200/80 whitespace-pre-line">{ordem.pedido.observacoes}</p>
              </div>
            )}

            {/* Observações da Visita Técnica */}
            {observacoesVisita && observacoesVisita.length > 0 && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-2">
                <div className="flex items-center gap-1.5">
                  <Wrench className="h-3 w-3 text-amber-400" />
                  <span className="text-xs font-medium text-amber-400">
                    Especificações da Visita Técnica
                  </span>
                  <span className="text-xs text-amber-400/60">
                    ({observacoesVisita.length} {observacoesVisita.length === 1 ? 'porta' : 'portas'})
                  </span>
                </div>
                <div className="space-y-2">
                  {observacoesVisita.map((obs: any, idx: number) => (
                    <div key={obs.id || idx} className="p-2 rounded-md bg-amber-500/5 border border-amber-500/10">
                      <span className="text-[11px] font-medium text-amber-400 mb-1.5 block">
                        Porta {idx + 1}
                        {obs.produto && (
                          <span className="text-amber-300/70 ml-2">
                            - {obs.produto.largura && obs.produto.altura
                                ? `${Number(obs.produto.largura).toFixed(2)}m × ${Number(obs.produto.altura).toFixed(2)}m`
                                : obs.produto.tamanho || ''}
                          </span>
                        )}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {obs.interna_externa && (
                          <Badge variant="outline" className="text-[10px] py-0 h-5 bg-amber-500/10 border-amber-500/30 text-amber-300">
                            {OPCOES_INTERNA_EXTERNA[obs.interna_externa as keyof typeof OPCOES_INTERNA_EXTERNA] || obs.interna_externa}
                          </Badge>
                        )}
                        {obs.lado_motor && (
                          <Badge variant="outline" className="text-[10px] py-0 h-5 bg-blue-500/10 border-blue-500/30 text-blue-300">
                            Motor: {OPCOES_LADO_MOTOR[obs.lado_motor as keyof typeof OPCOES_LADO_MOTOR] || obs.lado_motor}
                          </Badge>
                        )}
                        {obs.posicao_guia && (
                          <Badge variant="outline" className="text-[10px] py-0 h-5 bg-purple-500/10 border-purple-500/30 text-purple-300">
                            {OPCOES_POSICAO_GUIA[obs.posicao_guia as keyof typeof OPCOES_POSICAO_GUIA] || obs.posicao_guia}
                          </Badge>
                        )}
                        {obs.opcao_guia && (
                          <Badge variant="outline" className="text-[10px] py-0 h-5 bg-green-500/10 border-green-500/30 text-green-300">
                            {OPCOES_GUIA[obs.opcao_guia as keyof typeof OPCOES_GUIA] || obs.opcao_guia}
                          </Badge>
                        )}
                        {obs.aparencia_testeira && (
                          <Badge variant="outline" className="text-[10px] py-0 h-5 bg-orange-500/10 border-orange-500/30 text-orange-300">
                            Testeira: {OPCOES_APARENCIA_TESTEIRA[obs.aparencia_testeira as keyof typeof OPCOES_APARENCIA_TESTEIRA] || obs.aparencia_testeira}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Itens do Carregamento - checklist interativo */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-white/70">
                  Itens do Carregamento
                  {linhas && linhas.length > 0 && (
                    <span className="ml-2 text-xs text-white/40">
                      ({itensMarcados.size}/{linhas.length})
                    </span>
                  )}
                </h3>
                <div className="flex items-center gap-1">
                  {linhas && linhas.length > 0 && !todosMarcados && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1 text-blue-400/70 hover:text-blue-300 hover:bg-blue-500/10"
                      onClick={marcarTodos}
                    >
                      <CheckSquare className="h-3 w-3" />
                      Marcar Todos
                    </Button>
                  )}
                  {linhas && linhas.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1 text-white/50 hover:text-white hover:bg-white/10"
                      onClick={handleImprimirEtiquetas}
                    >
                      <Tags className="h-3 w-3" />
                      Etiquetas
                    </Button>
                  )}
                </div>
              </div>

              {isLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-white/30" />
                </div>
              ) : linhas && linhas.length > 0 ? (
                <div className="space-y-1.5">
                  {linhas.map((linha, index) => {
                    const marcado = itensMarcados.has(linha.id);
                    return (
                      <button
                        key={linha.id}
                        type="button"
                        onClick={() => toggleItem(linha.id)}
                        className={`w-full rounded-lg border px-3 py-2 flex items-center gap-3 transition-all ${
                          marcado
                            ? 'bg-emerald-500/10 border-emerald-500/30'
                            : 'bg-white/5 border-white/5 hover:border-white/15'
                        }`}
                      >
                        <Checkbox
                          checked={marcado}
                          onCheckedChange={() => toggleItem(linha.id)}
                          className="border-white/30 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                        />
                        <span className={`text-sm flex-1 text-left ${marcado ? 'text-emerald-300 line-through' : 'text-white/80'}`}>
                          {index + 1}. {linha.nome_produto || linha.descricao_produto || "Item"}
                        </span>
                        <div className="flex gap-3 text-xs text-white/40">
                          <span>{linha.quantidade || 1}x</span>
                          {linha.tamanho && <span>{linha.tamanho}</span>}
                          {(linha.largura || linha.altura) && (
                            <span>{linha.largura}x{linha.altura}</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-white/30 text-center py-6">
                  Nenhum item encontrado
                </p>
              )}
            </div>

            {/* Verificações obrigatórias */}
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-2">
              <p className="text-xs font-medium text-amber-400">Verificações obrigatórias</p>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={checkTesteiraMotor}
                  onCheckedChange={(v) => setCheckTesteiraMotor(!!v)}
                  className="border-amber-500/50 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                />
                <span className="text-sm text-white/80">Verifiquei que a testeira é compatível com motor</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={checkPlacaSoleira}
                  onCheckedChange={(v) => setCheckPlacaSoleira(!!v)}
                  className="border-amber-500/50 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                />
                <span className="text-sm text-white/80">Placa Soleira Elisa</span>
              </label>
            </div>

            {/* Botões */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1 border-white/10 text-white/70 hover:bg-white/5 hover:text-white bg-transparent"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-30"
                onClick={handleConcluir}
                disabled={!todosMarcados || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Concluindo...
                  </>
                ) : (
                  <>
                    <Icon className="mr-2 h-4 w-4" />
                    Concluir Carregamento
                  </>
                )}
              </Button>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>

      <CarregamentoLoadingModal open={showLoadingModal} success={loadingSuccess} />
    </Sheet>
  );
}
