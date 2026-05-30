import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save, Loader2 } from "lucide-react";
import { useCorrecaoDetalhes } from "@/hooks/useCorrecaoDetalhes";
import { SETOR_LABELS } from "@/utils/setorMapping";
import { useSetores } from "@/hooks/useSetores";
import { ETAPAS_CONFIG } from "@/types/pedidoEtapa";
import type { EtapaPedido } from "@/types/pedidoEtapa";

interface CorrecaoDetalhesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedidoId: string | null;
  numeroPedido: string;
  nomeCliente: string;
}

const ETAPAS_PRODUCAO: { value: EtapaPedido; label: string }[] = [
  { value: 'aberto', label: 'Pedidos em Aberto' },
  { value: 'aprovacao_ceo', label: 'Aprovação CEO' },
  { value: 'em_producao', label: 'Em Produção' },
  { value: 'inspecao_qualidade', label: 'Inspeção de Qualidade' },
  { value: 'aguardando_pintura', label: 'Aguardando Pintura' },
  { value: 'embalagem', label: 'Embalagem' },
  { value: 'aguardando_coleta', label: 'Aguardando Coleta' },
  { value: 'instalacoes', label: 'Instalações' },
  { value: 'correcoes', label: 'Correções' },
];

export function CorrecaoDetalhesSheet({
  open,
  onOpenChange,
  pedidoId,
  numeroPedido,
  nomeCliente,
}: CorrecaoDetalhesSheetProps) {
  const { correcao, linhas, isLoading, salvarDetalhes, adicionarLinha, removerLinha } = useCorrecaoDetalhes(pedidoId);
  const { setores: setoresDb } = useSetores();
  const setoresList = setoresDb.length > 0
    ? setoresDb.map(s => ({ key: s.key, label: s.label }))
    : Object.entries(SETOR_LABELS).map(([key, label]) => ({ key, label }));

  const [custoCorrecao, setCustoCorrecao] = useState('0');
  const [setorCausador, setSetorCausador] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [etapaCausadora, setEtapaCausadora] = useState('');
  const [novaLinhaDescricao, setNovaLinhaDescricao] = useState('');
  const [novaLinhaQuantidade, setNovaLinhaQuantidade] = useState('1');

  // Sync form state when correcao loads
  useEffect(() => {
    if (correcao) {
      setCustoCorrecao(String(correcao.custo_correcao || 0));
      setSetorCausador(correcao.setor_causador || '');
      setJustificativa(correcao.justificativa || '');
      setEtapaCausadora(correcao.etapa_causadora || '');
    }
  }, [correcao]);

  const handleSalvar = () => {
    salvarDetalhes.mutate({
      custo_correcao: parseFloat(custoCorrecao) || 0,
      setor_causador: setorCausador || null,
      justificativa: justificativa || null,
      etapa_causadora: etapaCausadora || null,
    });
  };

  const handleAdicionarLinha = () => {
    if (!novaLinhaDescricao.trim()) return;
    adicionarLinha.mutate({
      descricao: novaLinhaDescricao.trim(),
      quantidade: parseInt(novaLinhaQuantidade) || 1,
    });
    setNovaLinhaDescricao('');
    setNovaLinhaQuantidade('1');
  };

  if (!pedidoId) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Detalhes da Correção</SheetTitle>
          <SheetDescription>
            Pedido #{numeroPedido} — {nomeCliente}
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !correcao ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Nenhuma correção vinculada a este pedido.
          </div>
        ) : (
          <div className="space-y-6 mt-4">
            {/* Linhas de Correção */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Linhas de Correção</Label>
              {linhas.length > 0 && (
                <div className="space-y-2">
                  {linhas.map((linha) => (
                    <div key={linha.id} className="flex items-center gap-2 p-2 rounded-md border border-border bg-muted/30">
                      <div className="flex-1 text-sm">{linha.descricao}</div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">Qtd: {linha.quantidade}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => removerLinha.mutate(linha.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  placeholder="Descrição do item..."
                  value={novaLinhaDescricao}
                  onChange={(e) => setNovaLinhaDescricao(e.target.value)}
                  className="flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && handleAdicionarLinha()}
                />
                <Input
                  type="number"
                  min="1"
                  value={novaLinhaQuantidade}
                  onChange={(e) => setNovaLinhaQuantidade(e.target.value)}
                  className="w-16"
                />
                <Button size="icon" variant="outline" onClick={handleAdicionarLinha} disabled={!novaLinhaDescricao.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Justificativa */}
            <div className="space-y-2">
              <Label htmlFor="justificativa" className="text-sm font-semibold">Justificativa</Label>
              <Textarea
                id="justificativa"
                placeholder="Descreva o problema que motivou a correção..."
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                rows={3}
              />
            </div>

            {/* Custo da Correção */}
            <div className="space-y-2">
              <Label htmlFor="custo" className="text-sm font-semibold">Custo da Correção (R$)</Label>
              <Input
                id="custo"
                type="number"
                min="0"
                step="0.01"
                value={custoCorrecao}
                onChange={(e) => setCustoCorrecao(e.target.value)}
              />
            </div>

            {/* Setor Responsável */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Setor Responsável pela Causa</Label>
              <Select value={setorCausador} onValueChange={setSetorCausador}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o setor..." />
                </SelectTrigger>
                <SelectContent>
                  {setoresList.map(({ key, label }) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Etapa Causadora */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Etapa Causadora</Label>
              <Select value={etapaCausadora} onValueChange={setEtapaCausadora}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a etapa..." />
                </SelectTrigger>
                <SelectContent>
                  {ETAPAS_PRODUCAO.map((etapa) => (
                    <SelectItem key={etapa.value} value={etapa.value}>{etapa.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Botão Salvar */}
            <Button
              className="w-full"
              onClick={handleSalvar}
              disabled={salvarDetalhes.isPending}
            >
              {salvarDetalhes.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
