import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAutorizadosPrecos } from '@/hooks/useAutorizadosPrecos';
import { formatCurrency } from '@/lib/utils';
import type { NovoAcordo, AcordoAutorizado } from '@/hooks/useAcordosAutorizados';
import { SeletorVendaExistente, type VendaSelecionada } from './SeletorVendaExistente';

const ESTADOS_BR = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS',
  'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC',
  'SP', 'SE', 'TO'
];

interface NovoAcordoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (acordo: NovoAcordo) => Promise<any>;
  acordoParaEditar?: AcordoAutorizado | null;
}

export function NovoAcordoDialog({ 
  open, 
  onOpenChange, 
  onSave,
  acordoParaEditar 
}: NovoAcordoDialogProps) {
  const { autorizados } = useAutorizadosPrecos();
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [clienteNome, setClienteNome] = useState('');
  const [clienteCidade, setClienteCidade] = useState('');
  const [clienteEstado, setClienteEstado] = useState('');
  const [autorizadoId, setAutorizadoId] = useState('');
  const [portaTamanho, setPortaTamanho] = useState<'P' | 'G' | 'GG'>('P');
  const [portaLargura, setPortaLargura] = useState('');
  const [portaAltura, setPortaAltura] = useState('');
  const [valorAcordado, setValorAcordado] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [dataAcordo, setDataAcordo] = useState(new Date().toISOString().split('T')[0]);
  const [dataInstalacao, setDataInstalacao] = useState('');
  const [vendaVinculada, setVendaVinculada] = useState<VendaSelecionada | null>(null);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      if (acordoParaEditar) {
        setClienteNome(acordoParaEditar.cliente_nome);
        setClienteCidade(acordoParaEditar.cliente_cidade);
        setClienteEstado(acordoParaEditar.cliente_estado);
        setAutorizadoId(acordoParaEditar.autorizado_id);
        const porta = acordoParaEditar.portas[0];
        setPortaTamanho(porta?.tamanho || 'P');
        setPortaLargura(porta?.largura ? String(porta.largura) : '');
        setPortaAltura(porta?.altura ? String(porta.altura) : '');
        setValorAcordado(String(acordoParaEditar.valor_acordado));
        setObservacoes(acordoParaEditar.observacoes || '');
        setDataAcordo(acordoParaEditar.data_acordo);
        setDataInstalacao(acordoParaEditar.data_instalacao || '');
      } else {
        setClienteNome('');
        setClienteCidade('');
        setClienteEstado('');
        setAutorizadoId('');
        setPortaTamanho('P');
        setPortaLargura('');
        setPortaAltura('');
        setValorAcordado('');
        setObservacoes('');
        setDataAcordo(new Date().toISOString().split('T')[0]);
        setDataInstalacao('');
        setDataInstalacao('');
        setVendaVinculada(null);
      }
    }
  }, [open, acordoParaEditar]);

  // Valor sugerido baseado nos preços cadastrados
  const autorizadoSelecionado = autorizados.find(a => a.id === autorizadoId);
  const valorSugerido = autorizadoSelecionado?.precos[portaTamanho] || 0;

  const handleSave = async () => {
    if (!clienteNome || !clienteCidade || !clienteEstado || !autorizadoId) {
      return;
    }
    if (!acordoParaEditar && !vendaVinculada?.id) {
      return;
    }

    setSaving(true);
    try {
      const novoAcordo: NovoAcordo = {
        autorizado_id: autorizadoId,
        cliente_nome: clienteNome,
        cliente_cidade: clienteCidade,
        cliente_estado: clienteEstado,
        valor_acordado: parseFloat(valorAcordado) || valorSugerido,
        status: 'pendente',
        data_acordo: dataAcordo,
        data_instalacao: dataInstalacao || null,
        observacoes: observacoes || undefined,
        portas: [{
          tamanho: portaTamanho,
          valor_unitario: autorizadoSelecionado?.precos[portaTamanho] || 0,
          largura: portaLargura ? parseFloat(portaLargura) : undefined,
          altura: portaAltura ? parseFloat(portaAltura) : undefined,
        }],
        venda_id: vendaVinculada?.id || null,
      };

      await onSave(novoAcordo);
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao salvar acordo:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-zinc-900 border-zinc-700 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {acordoParaEditar ? 'Editar Acordo' : 'Novo Acordo de Instalação'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Formulário para cadastrar um acordo de instalação com autorizado
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Vincular a pedido */}
          {!acordoParaEditar && (
            <>
            <SeletorVendaExistente
              vendaSelecionada={vendaVinculada}
              onSelect={(v) => {
                if (!v.id) {
                  setVendaVinculada(null);
                  return;
                }
                setVendaVinculada(v);
                if (v.cliente_nome && !clienteNome) setClienteNome(v.cliente_nome);
                if (v.cliente_cidade && !clienteCidade) setClienteCidade(v.cliente_cidade);
                if (v.cliente_estado && !clienteEstado) setClienteEstado(v.cliente_estado);
              }}
            />
            {!vendaVinculada?.id && (
              <p className="text-xs text-amber-400">
                Vincular uma venda é obrigatório para criar um acordo.
              </p>
            )}
            </>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cliente */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-white/70">CLIENTE</Label>
            <Input
              placeholder="Nome do Cliente"
              value={clienteNome}
              onChange={(e) => setClienteNome(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Cidade"
                value={clienteCidade}
                onChange={(e) => setClienteCidade(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white"
              />
              <Select value={clienteEstado} onValueChange={setClienteEstado}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                  <SelectValue placeholder="UF" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {ESTADOS_BR.map(estado => (
                    <SelectItem key={estado} value={estado}>{estado}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Autorizado */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-white/70">AUTORIZADO</Label>
            <Select value={autorizadoId} onValueChange={setAutorizadoId}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                <SelectValue placeholder="Selecione o autorizado..." />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700 max-h-60">
                {autorizados.map(aut => (
                  <SelectItem key={aut.id} value={aut.id}>
                    {aut.nome} {aut.cidade && aut.estado ? `- ${aut.cidade}/${aut.estado}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Porta */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-white/70">PORTA</Label>
            <Select value={portaTamanho} onValueChange={(v) => setPortaTamanho(v as 'P' | 'G' | 'GG')}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="P">P (&lt;25m²)</SelectItem>
                <SelectItem value="G">G (25-50m²)</SelectItem>
                <SelectItem value="GG">GG (&gt;50m²)</SelectItem>
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-white/50">Largura (m)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 2.10"
                  value={portaLargura}
                  onChange={(e) => setPortaLargura(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-white/50">Altura (m)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 2.50"
                  value={portaAltura}
                  onChange={(e) => setPortaAltura(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
            </div>
            {valorSugerido > 0 && (
              <p className="text-xs text-white/50">
                Valor unitário: {formatCurrency(valorSugerido)}
              </p>
            )}
          </div>

          {/* Valor Acordado */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-white/70">VALOR ACORDADO</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="R$ 0,00"
              value={valorAcordado}
              onChange={(e) => setValorAcordado(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white"
            />
            {valorSugerido > 0 && (
              <p className="text-xs text-white/50">
                Valor sugerido: {formatCurrency(valorSugerido)} (baseado nos preços cadastrados)
              </p>
            )}
          </div>

          {/* Data do Acordo */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-white/70">DATA DO ACORDO</Label>
            <Input
              type="date"
              value={dataAcordo}
              onChange={(e) => setDataAcordo(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          {/* Data da Instalação */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-white/70">DATA DA INSTALAÇÃO (opcional)</Label>
            <Input
              type="date"
              value={dataInstalacao}
              onChange={(e) => setDataInstalacao(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>


          {/* Observações */}
          <div className="space-y-2 md:col-span-2">
            <Label className="text-sm font-medium text-white/70">OBSERVAÇÕES (opcional)</Label>
            <Textarea
              placeholder="Observações sobre o acordo..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-white resize-none"
              rows={3}
            />
          </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-zinc-600 text-white hover:bg-zinc-800"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !clienteNome || !clienteCidade || !clienteEstado || !autorizadoId || (!acordoParaEditar && !vendaVinculada?.id)}
            className="bg-primary hover:bg-primary/90"
          >
            {saving ? 'Salvando...' : acordoParaEditar ? 'Salvar Alterações' : 'Salvar Acordo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
