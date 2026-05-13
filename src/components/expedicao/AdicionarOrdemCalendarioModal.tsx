import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { OrdemCarregamentoUnificada } from "@/types/ordemCarregamentoUnificada";
import { useOrdensCarregamentoUnificadas } from "@/hooks/useOrdensCarregamentoUnificadas";

import { supabase } from "@/integrations/supabase/client";
import { Loader2, Search, Package, MapPin, Check, Ruler, Truck, Wrench } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface AdicionarOrdemCalendarioModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataSelecionada: Date;
  onConfirm: (params: {
    ordemId: string;
    fonte: 'ordens_carregamento' | 'instalacoes' | 'correcoes';
    data_carregamento: string;
    hora: string;
    tipo_carregamento: 'elisa' | 'autorizados' | 'terceiro';
    responsavel_carregamento_id: string | null;
    responsavel_carregamento_nome: string;
  }) => Promise<void>;
  ordemPreSelecionada?: OrdemCarregamentoUnificada | null;
}

interface Responsavel {
  id: string;
  nome: string;
  cidade?: string;
  estado?: string;
  cor?: string;
}

export function AdicionarOrdemCalendarioModal({
  open,
  onOpenChange,
  dataSelecionada,
  onConfirm,
  ordemPreSelecionada
}: AdicionarOrdemCalendarioModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [ordemSelecionada, setOrdemSelecionada] = useState<OrdemCarregamentoUnificada | null>(null);
  const [dataSelecionadaCalendario, setDataSelecionadaCalendario] = useState<string>("");
  const [responsavelTipo, setResponsavelTipo] = useState<"elisa" | "autorizados" | "terceiro">("elisa");
  const [responsavelId, setResponsavelId] = useState("");
  const [responsavelNomeTerceiro, setResponsavelNomeTerceiro] = useState("");
  const [equipes, setEquipes] = useState<Responsavel[]>([]);
  const [autorizados, setAutorizados] = useState<Responsavel[]>([]);
  const [loadingResponsaveis, setLoadingResponsaveis] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { ordens: todasOrdens, isLoading: loadingOrdens } = useOrdensCarregamentoUnificadas();
  
  
  const ordens = todasOrdens.filter(o => !o.data_carregamento);
  const isEntrega = ordemSelecionada?.tipo_entrega === 'entrega';

  useEffect(() => {
    if (open) {
      loadResponsaveis();
      
      if (ordemPreSelecionada) {
        setOrdemSelecionada(ordemPreSelecionada);
      } else {
        setOrdemSelecionada(null);
      }
      
      setSearchTerm("");
      // Pré-preencher com a data já agendada (caso exista) — útil para reagendamento
      const dataExistente = ordemPreSelecionada?.data_carregamento;
      if (dataExistente) {
        setDataSelecionadaCalendario(format(new Date(dataExistente), "yyyy-MM-dd"));
      } else {
        setDataSelecionadaCalendario(format(dataSelecionada, "yyyy-MM-dd"));
      }
      // Pré-preencher responsável atual (caso exista)
      const tipoExistente = ordemPreSelecionada?.tipo_carregamento;
      if (tipoExistente === 'elisa' || tipoExistente === 'autorizados' || tipoExistente === 'terceiro') {
        setResponsavelTipo(tipoExistente);
        setResponsavelId(ordemPreSelecionada?.responsavel_carregamento_id || "");
        setResponsavelNomeTerceiro(
          tipoExistente === 'terceiro' ? (ordemPreSelecionada?.responsavel_carregamento_nome || "") : ""
        );
      } else {
        setResponsavelTipo("elisa");
        setResponsavelId("");
        setResponsavelNomeTerceiro("");
      }
    }
  }, [open, ordemPreSelecionada, dataSelecionada]);

  const loadResponsaveis = async () => {
    setLoadingResponsaveis(true);
    try {
      const [equipesRes, autorizadosRes] = await Promise.all([
        supabase
          .from("equipes_instalacao")
          .select("id, nome, cor")
          .eq("ativa", true)
          .order("nome"),
        supabase
          .from("autorizados")
          .select("id, nome, cidade, estado")
          .eq("ativo", true)
          .eq("tipo_parceiro", "autorizado")
          .order("nome")
      ]);

      if (equipesRes.error) throw equipesRes.error;
      if (autorizadosRes.error) throw autorizadosRes.error;

      setEquipes(equipesRes.data || []);
      setAutorizados(autorizadosRes.data || []);
    } catch (error) {
      console.error("Erro ao carregar responsáveis:", error);
      toast.error("Erro ao carregar opções de responsáveis");
    } finally {
      setLoadingResponsaveis(false);
    }
  };

  const formatarTamanhosPortas = (ordem: OrdemCarregamentoUnificada): string | null => {
    const produtos = ordem.venda?.produtos;
    if (!produtos || produtos.length === 0) return null;

    const portasEnrolar = produtos.filter(p => 
      p.tipo_produto?.toLowerCase().includes('porta') && 
      (p.largura || p.altura || p.tamanho)
    );

    if (portasEnrolar.length === 0) return null;

    return portasEnrolar.map(p => {
      if (p.tamanho) return p.tamanho;
      if (p.largura && p.altura) return `${Number(p.largura).toFixed(2)}m × ${Number(p.altura).toFixed(2)}m`;
      return null;
    }).filter(Boolean).join(', ');
  };

  const ordensFiltradas = ordens.filter((ordem) => {
    const termo = searchTerm.toLowerCase();
    return (
      ordem.nome_cliente.toLowerCase().includes(termo) ||
      ordem.pedido?.numero_pedido?.toLowerCase().includes(termo) ||
      ordem.venda?.cidade?.toLowerCase().includes(termo) ||
      ordem.venda?.estado?.toLowerCase().includes(termo)
    );
  });

  const handleSelectOrdem = (ordem: OrdemCarregamentoUnificada) => {
    setOrdemSelecionada(ordem);
    setResponsavelTipo("elisa");
    setResponsavelId("");
    setResponsavelNomeTerceiro("");
  };

  const handleConfirm = async () => {
    if (!ordemSelecionada) {
      toast.error("Selecione uma ordem");
      return;
    }

    if (!dataSelecionadaCalendario) {
      toast.error("Selecione uma data");
      return;
    }

    if (isEntrega) {
      if (responsavelTipo === 'elisa' && !responsavelId) {
        toast.error("Selecione uma equipe");
        return;
      }
      if (responsavelTipo === 'terceiro' && !responsavelNomeTerceiro.trim()) {
        toast.error("Informe o nome do terceiro");
        return;
      }
    } else {
      if (responsavelTipo === 'elisa' && !responsavelId) {
        toast.error("Selecione uma equipe");
        return;
      }
      if (responsavelTipo === 'autorizados' && !responsavelId) {
        toast.error("Selecione um autorizado");
        return;
      }
    }

    setSubmitting(true);
    try {
      let responsavelNome = '';
      let finalResponsavelId: string | null = responsavelId || null;

      if (isEntrega) {
        if (responsavelTipo === 'elisa') {
          const equipe = equipes.find(e => e.id === responsavelId);
          responsavelNome = equipe?.nome || '';
        } else {
          responsavelNome = responsavelNomeTerceiro.trim();
          finalResponsavelId = null;
        }
      } else {
        const lista = responsavelTipo === "elisa" ? equipes : autorizados;
        const responsavel = lista.find((r) => r.id === responsavelId);
        responsavelNome = responsavel?.nome || '';
      }

      const horaFinal = "08:00";

      await onConfirm({
        ordemId: ordemSelecionada.id,
        fonte: ordemSelecionada.fonte,
        data_carregamento: dataSelecionadaCalendario + "T12:00:00",
        hora: horaFinal,
        tipo_carregamento: responsavelTipo,
        responsavel_carregamento_id: finalResponsavelId,
        responsavel_carregamento_nome: responsavelNome
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao adicionar ordem:", error);
      toast.error("Erro ao adicionar ordem ao calendário");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[500px] max-h-[85vh] flex flex-col p-0 gap-0 bg-slate-950/80 backdrop-blur-xl border-white/10 text-white shadow-[0_0_0_1px_rgba(96,165,250,0.15),0_20px_60px_-20px_rgba(0,0,0,0.8)]">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-base">Adicionar ao Calendário</DialogTitle>
          <DialogDescription className="sr-only">
            Selecione uma ordem e configure o agendamento
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 px-5 space-y-3">
          {/* Busca e Lista de Ordens */}
          {!ordemPreSelecionada && (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente, pedido..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-9 text-sm"
                />
              </div>

              <ScrollArea className="h-[180px] border rounded-md">
                {loadingOrdens ? (
                  <div className="flex items-center justify-center h-full p-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : ordensFiltradas.length === 0 ? (
                  <div className="flex items-center justify-center h-full p-4 text-muted-foreground text-xs">
                    Nenhuma ordem disponível
                  </div>
                ) : (
                  <div className="p-1.5 space-y-0.5">
                    {ordensFiltradas.map((ordem) => (
                      <button
                        key={ordem.id}
                        type="button"
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-md transition-colors text-sm",
                          ordemSelecionada?.id === ordem.id
                            ? "bg-primary/10 ring-1 ring-primary/30"
                            : "hover:bg-muted/60"
                        )}
                        onClick={() => handleSelectOrdem(ordem)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate text-sm">{ordem.nome_cliente}</div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              <span className="flex items-center gap-1">
                                <Package className="h-3 w-3" />
                                {ordem.pedido?.numero_pedido || 'N/A'}
                              </span>
                              {ordem.venda?.cidade && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {ordem.venda.cidade}/{ordem.venda.estado}
                                </span>
                              )}
                              {formatarTamanhosPortas(ordem) && (
                                <span className="flex items-center gap-1">
                                  <Ruler className="h-3 w-3" />
                                  {formatarTamanhosPortas(ordem)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant={ordem.tipo_entrega === 'entrega' ? 'default' : 'secondary'}
                              className={cn(
                                "text-[10px] px-1.5 py-0 h-5 shrink-0",
                                ordem.tipo_entrega === 'instalacao' && "bg-orange-500/20 text-orange-600 border-orange-500/30",
                                ordem.tipo_entrega === 'manutencao' && "bg-purple-500/20 text-purple-600 border-purple-500/30"
                              )}
                            >
                              {ordem.tipo_entrega === 'entrega' && <Truck className="h-2.5 w-2.5 mr-0.5" />}
                              {ordem.tipo_entrega !== 'entrega' && <Wrench className="h-2.5 w-2.5 mr-0.5" />}
                              {ordem.tipo_entrega === 'entrega' ? 'Entrega' : 
                               ordem.tipo_entrega === 'manutencao' ? 'Manutenção' : 'Instalação'}
                            </Badge>
                            {ordemSelecionada?.id === ordem.id && (
                              <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </>
          )}

          {/* Ordem pré-selecionada */}
          {ordemPreSelecionada && ordemSelecionada && (
            <div className="p-3 bg-muted/50 rounded-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{ordemSelecionada.nome_cliente}</p>
                  <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      {ordemSelecionada.pedido?.numero_pedido || 'N/A'}
                    </span>
                    {ordemSelecionada.venda?.cidade && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {ordemSelecionada.venda.cidade}/{ordemSelecionada.venda.estado}
                      </span>
                    )}
                    {formatarTamanhosPortas(ordemSelecionada) && (
                      <span className="flex items-center gap-1">
                        <Ruler className="h-3 w-3" />
                        {formatarTamanhosPortas(ordemSelecionada)}
                      </span>
                    )}
                  </div>
                </div>
                <Badge 
                  variant={isEntrega ? 'default' : 'secondary'}
                  className="text-[10px] px-1.5 py-0 h-5"
                >
                  {isEntrega ? 'Entrega' : ordemSelecionada.tipo_entrega === 'manutencao' ? 'Manutenção' : 'Instalação'}
                </Badge>
              </div>
            </div>
          )}

          {/* Configuração */}
          {ordemSelecionada && (
            <div className="space-y-3 pt-3 border-t">
              {/* Data */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Data</Label>
                <Input
                  type="date"
                  value={dataSelecionadaCalendario}
                  onChange={(e) => setDataSelecionadaCalendario(e.target.value)}
                  className="h-9 text-sm"
                  min={format(new Date(), "yyyy-MM-dd")}
                />
              </div>

              {/* Toggle tipo responsável */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  {isEntrega ? 'Tipo' : 'Responsável'}
                </Label>
                <div className="flex rounded-md border bg-muted/30 p-0.5">
                  <button
                    type="button"
                    className={cn(
                      "flex-1 text-xs font-medium py-1.5 px-3 rounded-sm transition-all",
                      responsavelTipo === "elisa"
                        ? "bg-background shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => {
                      setResponsavelTipo("elisa");
                      setResponsavelId("");
                      setResponsavelNomeTerceiro("");
                    }}
                  >
                    {isEntrega ? 'Elisa' : 'Equipe Elisa'}
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "flex-1 text-xs font-medium py-1.5 px-3 rounded-sm transition-all",
                      responsavelTipo === (isEntrega ? "terceiro" : "autorizados")
                        ? "bg-background shadow-sm text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => {
                      setResponsavelTipo(isEntrega ? "terceiro" : "autorizados");
                      setResponsavelId("");
                      setResponsavelNomeTerceiro("");
                    }}
                  >
                    {isEntrega ? 'Terceiro' : 'Autorizado'}
                  </button>
                </div>
              </div>

              {/* Select/Input do responsável */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  {isEntrega 
                    ? (responsavelTipo === 'elisa' ? 'Equipe' : 'Nome do Terceiro')
                    : (responsavelTipo === 'elisa' ? 'Equipe' : 'Autorizado')
                  }
                </Label>
                {isEntrega && responsavelTipo === 'terceiro' ? (
                  <Input
                    type="text"
                    placeholder="Digite o nome do responsável"
                    value={responsavelNomeTerceiro}
                    onChange={(e) => setResponsavelNomeTerceiro(e.target.value)}
                    className="h-9 text-sm"
                  />
                ) : (
                  <Select
                    value={responsavelId}
                    onValueChange={setResponsavelId}
                    disabled={loadingResponsaveis}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder={
                        loadingResponsaveis
                          ? "Carregando..."
                          : "Selecione..."
                      } />
                    </SelectTrigger>
                    <SelectContent 
                      position="popper" 
                      sideOffset={4} 
                      className="z-[200] max-h-[200px]"
                    >
                      {responsavelTipo === "elisa" ? (
                        equipes.map((equipe) => (
                          <SelectItem key={equipe.id} value={equipe.id}>
                            <div className="flex items-center gap-2">
                              {equipe.cor && (
                                <span
                                  className="h-2.5 w-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: equipe.cor }}
                                />
                              )}
                              {equipe.nome}
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        autorizados.map((autorizado) => (
                          <SelectItem key={autorizado.id} value={autorizado.id}>
                            {autorizado.nome} - {autorizado.cidade}/{autorizado.estado}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer fixo */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t mt-3 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button 
            size="sm"
            onClick={handleConfirm} 
            disabled={submitting || !ordemSelecionada}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Adicionando...
              </>
            ) : (
              "Confirmar"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
