import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon, Clock, User, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { OrdemCarregamento } from "@/types/ordemCarregamento";
import { supabase } from "@/integrations/supabase/client";

import { toast } from "sonner";

interface EditarOrdemCarregamentoDrawerProps {
  ordem: OrdemCarregamento | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    data_carregamento: string;
    hora_carregamento: string;
    tipo_carregamento: 'elisa' | 'autorizados' | 'terceiro' | null;
    responsavel_carregamento_id: string | null;
    responsavel_carregamento_nome: string | null;
  }) => Promise<void>;
}

export const EditarOrdemCarregamentoDrawer = ({
  ordem,
  open,
  onOpenChange,
  onSave,
}: EditarOrdemCarregamentoDrawerProps) => {
  const [dataCarregamento, setDataCarregamento] = useState<Date | undefined>();
  const [hora, setHora] = useState("08:00");
  const [responsavelTipo, setResponsavelTipo] = useState<"elisa" | "autorizados" | "terceiro" | "sem-responsavel">("sem-responsavel");
  const [responsavelId, setResponsavelId] = useState("");
  const [responsavelNomeTerceiro, setResponsavelNomeTerceiro] = useState("");
  const [responsaveis, setResponsaveis] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const isEntrega = ['entrega','autorizado'].includes(ordem?.venda?.tipo_entrega || '');

  // Reset form quando o drawer abre/fecha ou ordem muda
  useEffect(() => {
    if (open && ordem) {
      if (ordem.data_carregamento) {
        // Parse da data sem problemas de timezone
        const [year, month, day] = ordem.data_carregamento.split('-').map(Number);
        setDataCarregamento(new Date(year, month - 1, day));
      }
      if (ordem.hora || ordem.hora_carregamento) {
        setHora(ordem.hora || ordem.hora_carregamento || "08:00");
      }
      if (ordem.tipo_carregamento) {
        setResponsavelTipo(ordem.tipo_carregamento as "elisa" | "autorizados" | "terceiro");
      } else {
        setResponsavelTipo("sem-responsavel");
      }
      if (ordem.responsavel_carregamento_id) {
        if (ordem.tipo_carregamento === 'terceiro') {
          setResponsavelNomeTerceiro(ordem.responsavel_carregamento_nome || '');
        } else {
          setResponsavelId(ordem.responsavel_carregamento_id);
        }
      }
    } else {
      // Reset
      setDataCarregamento(undefined);
      setHora("08:00");
      setResponsavelTipo("sem-responsavel");
      setResponsavelId("");
      setResponsavelNomeTerceiro("");
    }
  }, [open, ordem]);

  // Carregar responsáveis quando o tipo muda
  useEffect(() => {
    if (open && responsavelTipo !== 'terceiro' && responsavelTipo !== 'sem-responsavel') {
      loadResponsaveis();
    }
  }, [responsavelTipo, open]);

  const loadResponsaveis = async () => {
    if (responsavelTipo === 'terceiro') {
      setResponsaveis([]);
      return;
    }

    setLoading(true);
    try {
      if (responsavelTipo === "elisa") {
        // Carregar equipes de instalação
        const { data, error } = await supabase
          .from("equipes_instalacao")
          .select("id, nome")
          .eq("ativa", true)
          .order("nome");

        if (error) throw error;
        setResponsaveis(data || []);
      } else {
        const { data, error } = await supabase
          .from("autorizados")
          .select("id, nome, cidade, estado")
          .eq("ativo", true)
          .order("nome");

        if (error) throw error;
        setResponsaveis(data || []);
      }
    } catch (error) {
      console.error("Erro ao carregar responsáveis:", error);
      toast.error("Erro ao carregar responsáveis");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!dataCarregamento) {
      toast.error("Selecione uma data");
      return;
    }

    if (!hora) {
      toast.error("Informe a hora");
      return;
    }

    // Validação apenas se não for "sem responsável"
    if (responsavelTipo !== 'sem-responsavel') {
      if (isEntrega) {
        if (responsavelTipo === 'elisa' && !responsavelId) {
          toast.error("Selecione uma equipe");
          return;
        }
        if (responsavelTipo === 'terceiro' && !responsavelNomeTerceiro.trim()) {
          toast.error("Informe o nome do responsável");
          return;
        }
      } else {
        if (!responsavelId) {
          toast.error("Selecione um responsável");
          return;
        }
      }
    }

    setSaving(true);
    try {
      let responsavelNome: string | null = null;
      let finalResponsavelId: string | null = null;
      let tipoCarregamentoFinal: 'elisa' | 'autorizados' | 'terceiro' | null = null;

      if (responsavelTipo !== 'sem-responsavel') {
        tipoCarregamentoFinal = responsavelTipo as 'elisa' | 'autorizados' | 'terceiro';
        
        if (isEntrega) {
          if (responsavelTipo === 'elisa') {
            const equipe = responsaveis.find(r => r.id === responsavelId);
            responsavelNome = equipe?.nome || '';
            finalResponsavelId = responsavelId;
          } else {
            responsavelNome = responsavelNomeTerceiro.trim();
            finalResponsavelId = null;
          }
        } else {
          const responsavel = responsaveis.find(r => r.id === responsavelId);
          if (!responsavel) {
            toast.error("Responsável não encontrado");
            return;
          }
          responsavelNome = responsavel.nome;
          finalResponsavelId = responsavelId;
        }
      }

      await onSave({
        data_carregamento: format(dataCarregamento, "yyyy-MM-dd"),
        hora_carregamento: hora,
        tipo_carregamento: tipoCarregamentoFinal,
        responsavel_carregamento_id: finalResponsavelId,
        responsavel_carregamento_nome: responsavelNome,
      });

      toast.success("Ordem atualizada com sucesso!");
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar alterações");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Editar {isEntrega ? 'Entrega' : 'Carregamento'}</SheetTitle>
          <SheetDescription>
            Altere os dados de agendamento do {isEntrega ? 'entrega' : 'carregamento'}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Informações da ordem (read-only) */}
          {ordem && (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {ordem.venda?.cliente_nome || ordem.nome_cliente}
                </span>
              </div>
              {ordem.pedido && (
                <div className="text-xs text-muted-foreground">
                  Pedido: {ordem.pedido.numero_pedido}
                </div>
              )}
              {ordem.venda?.cidade && ordem.venda?.estado && (
                <div className="text-xs text-muted-foreground">
                  {ordem.venda.cidade} - {ordem.venda.estado}
                </div>
              )}
            </div>
          )}

          {/* Data */}
          <div className="space-y-2">
            <Label>Data do {isEntrega ? 'Entrega' : 'Carregamento'}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dataCarregamento && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dataCarregamento ? (
                    format(dataCarregamento, "dd/MM/yyyy")
                  ) : (
                    <span>Selecione uma data</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dataCarregamento}
                  onSelect={setDataCarregamento}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Hora */}
          <div className="space-y-2">
            <Label htmlFor="hora">Hora</Label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="hora"
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Tipo de Responsável */}
          <div className="space-y-2">
            <Label>{isEntrega ? 'Tipo de Carregamento' : 'Tipo de Responsável'}</Label>
            <Select
              value={responsavelTipo}
              onValueChange={(value: "elisa" | "autorizados" | "terceiro" | "sem-responsavel") => {
                setResponsavelTipo(value);
                setResponsavelId("");
                setResponsavelNomeTerceiro("");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent modal={false}>
                <SelectItem value="sem-responsavel">
                  Sem responsável
                </SelectItem>
                <SelectItem value="elisa">
                  {isEntrega ? 'Carregamento Elisa' : 'Instalação Elisa'}
                </SelectItem>
                <SelectItem value={isEntrega ? "terceiro" : "autorizados"}>
                  {isEntrega ? 'Carregamento Terceiro' : 'Autorizado'}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Responsável - só mostra se não for "sem-responsavel" */}
          {responsavelTipo !== 'sem-responsavel' && (
            isEntrega && responsavelTipo === 'terceiro' ? (
              <div className="space-y-2">
                <Label>Nome do Responsável</Label>
                <Input
                  type="text"
                  placeholder="Digite o nome do responsável"
                  value={responsavelNomeTerceiro}
                  onChange={(e) => setResponsavelNomeTerceiro(e.target.value)}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>
                  {responsavelTipo === 'elisa' ? 'Equipe' : 'Autorizado'}
                </Label>
                <Select
                  value={responsavelId}
                  onValueChange={setResponsavelId}
                  disabled={loading || responsaveis.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loading ? "Carregando..." : "Selecione"}>
                      {responsavelId && responsaveis.find(r => r.id === responsavelId)?.nome}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent modal={false}>
                    {responsaveis.map((resp) => (
                        <SelectItem key={resp.id} value={resp.id}>
                          {resp.nome}
                          {responsavelTipo === "autorizados" && resp.cidade && (
                            <span className="text-xs text-muted-foreground ml-2">
                              - {resp.cidade}/{resp.estado}
                            </span>
                          )}
                        </SelectItem>
                    ))}
                   </SelectContent>
                </Select>
              </div>
            )
          )}
        </div>

        <SheetFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
