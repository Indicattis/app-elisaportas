import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProdutoVenda } from '@/hooks/useVendas';
import { buscarPrecosPorMedidas } from '@/utils/tabelaPrecosHelper';
import { toast } from 'sonner';
import { Loader2, Paintbrush } from 'lucide-react';

interface PinturaRapidaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  largura: number;
  altura: number;
  onConfirm: (pintura: ProdutoVenda) => void;
  onSkip: () => void;
}

export function PinturaRapidaModal({
  open,
  onOpenChange,
  largura,
  altura,
  onConfirm,
  onSkip
}: PinturaRapidaModalProps) {
  const [corId, setCorId] = useState<string>('');
  const [valorPintura, setValorPintura] = useState<number>(0);
  const [kitId, setKitId] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const { data: cores } = useQuery({
    queryKey: ['cores-catalogo'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('catalogo_cores')
        .select('*')
        .eq('ativa', true)
        .order('nome');
      if (error) throw error;
      return data;
    }
  });

  // Buscar preço da pintura ao abrir o modal
  useEffect(() => {
    const buscarPrecoPintura = async () => {
      if (!open || !largura || !altura) return;
      
      setCarregando(true);
      try {
        const item = await buscarPrecosPorMedidas(largura, altura);
        if (item) {
          setValorPintura(item.valor_pintura);
          setKitId(item.id);
        } else {
          setValorPintura(0);
          setKitId(null);
          toast.error('Preço de pintura não encontrado para essas medidas');
        }
      } catch (error) {
        console.error('Erro ao buscar preço:', error);
      } finally {
        setCarregando(false);
      }
    };

    buscarPrecoPintura();
  }, [open, largura, altura]);

  // Reset ao fechar
  useEffect(() => {
    if (!open) {
      setCorId('');
    }
  }, [open]);

  const handleConfirmar = () => {
    if (!corId) {
      toast.error('Selecione uma cor');
      return;
    }

    const corSelecionada = cores?.find(c => c.id === corId);
    
    // Se for aço galvanizado, não adicionar pintura
    if (corSelecionada?.nome.toLowerCase() === 'aço galvanizado') {
      toast.info('Aço galvanizado não requer pintura');
      onSkip();
      return;
    }

    const pintura: ProdutoVenda = {
      tipo_produto: 'pintura_epoxi',
      largura,
      altura,
      tamanho: `${largura}x${altura}`,
      cor_id: corId,
      valor_produto: 0,
      valor_pintura: valorPintura,
      valor_instalacao: 0,
      valor_frete: 0,
      tipo_desconto: 'percentual',
      desconto_percentual: 0,
      desconto_valor: 0,
      quantidade: 1,
      descricao: corSelecionada?.nome || '',
      tabela_precos_porta_id: kitId,
    };

    onConfirm(pintura);
    onOpenChange(false);
  };

  const handlePular = () => {
    onSkip();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Paintbrush className="w-5 h-5 text-primary" />
            Adicionar Pintura?
          </DialogTitle>
          <DialogDescription>
            Deseja adicionar pintura para a porta de enrolar?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
            <span className="text-sm text-muted-foreground">Dimensões:</span>
            <span className="font-medium">{largura}m x {altura}m</span>
          </div>

          {carregando ? (
            <div className="flex items-center justify-center gap-2 py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Buscando preço...</span>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <span className="text-sm font-medium">Valor da Pintura:</span>
                <span className="text-lg font-bold text-primary">
                  R$ {valorPintura.toFixed(2)}
                </span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cor" className="text-sm font-medium">Selecione a Cor *</Label>
                <Select value={corId} onValueChange={setCorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha uma cor" />
                  </SelectTrigger>
                  <SelectContent>
                    {cores?.map((cor) => (
                      <SelectItem key={cor.id} value={cor.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded border"
                            style={{ backgroundColor: cor.codigo_hex }}
                          />
                          {cor.nome}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={handlePular}>
            Pular
          </Button>
          <Button 
            onClick={handleConfirmar} 
            disabled={!corId || carregando || valorPintura === 0}
          >
            Adicionar Pintura
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
