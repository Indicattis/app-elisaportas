import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Paintbrush, Loader2 } from 'lucide-react';
import { useCatalogoCores } from '@/hooks/useCatalogoCores';
import type { ProdutoVenda } from '@/hooks/useVendas';
import { getLabelTipoProduto } from '@/utils/tipoProdutoLabels';
import { buscarPrecosPorMedidas } from '@/utils/tabelaPrecosHelper';

interface PinturaItemCatalogoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portas: ProdutoVenda[];
  onConfirm: (pintura: ProdutoVenda) => void;
}

const AVULSA = 'avulsa';

export function PinturaItemCatalogoModal({
  open,
  onOpenChange,
  portas,
  onConfirm,
}: PinturaItemCatalogoModalProps) {
  const [selectedIndex, setSelectedIndex] = useState<string>(AVULSA);
  const [corId, setCorId] = useState('');
  const [valorPintura, setValorPintura] = useState('');
  const [carregando, setCarregando] = useState(false);
  const { coresAtivas } = useCatalogoCores();

  useEffect(() => {
    if (selectedIndex === AVULSA) return;
    const idx = Number(selectedIndex);
    if (Number.isNaN(idx)) return;
    const item = portas[idx];
    if (!item?.largura || !item?.altura) return;

    setCarregando(true);
    buscarPrecosPorMedidas(item.largura, item.altura)
      .then((result) => {
        if (result?.valor_pintura) {
          setValorPintura(String(result.valor_pintura));
        }
      })
      .finally(() => setCarregando(false));
  }, [selectedIndex, portas]);

  const itensDisponiveis = portas
    .map((p, i) => ({ index: i, label: getItemLabel(p, i), produto: p }))
    .filter(({ produto }) => produto.tipo_produto !== 'pintura_epoxi');

  function getItemLabel(p: ProdutoVenda, i: number) {
    const tipo = getLabelTipoProduto(p.tipo_produto);
    const desc = p.descricao ? ` - ${p.descricao}` : '';
    const medidas = p.largura && p.altura ? ` (${p.largura.toFixed(2)}m × ${p.altura.toFixed(2)}m)` : '';
    return `#${i + 1} ${tipo}${desc}${medidas}`;
  }

  const handleConfirmar = () => {
    const isAvulsa = selectedIndex === AVULSA;
    const idx = !isAvulsa ? Number(selectedIndex) : -1;
    const item = !isAvulsa && idx >= 0 ? portas[idx] : null;

    const corSelecionada = coresAtivas.find(c => c.id === corId);
    const corNome = corSelecionada?.nome || '';
    const baseDesc = item
      ? (item.descricao || getLabelTipoProduto(item.tipo_produto))
      : 'Avulsa';

    const pintura: ProdutoVenda = {
      tipo_produto: 'pintura_epoxi',
      largura: item?.largura || 0,
      altura: item?.altura || 0,
      valor_produto: 0,
      valor_pintura: Number(valorPintura) || 0,
      valor_instalacao: 0,
      valor_frete: 0,
      quantidade: 1,
      descricao: `Pintura Eletrostática${corNome ? ` (${corNome})` : ''} - ${baseDesc}`,
      desconto_valor: 0,
      desconto_percentual: 0,
      tipo_desconto: 'valor',
      cor_id: corId || undefined,
    };

    onConfirm(pintura);
    resetState();
  };

  const resetState = () => {
    setSelectedIndex(AVULSA);
    setCorId('');
    setValorPintura('');
    onOpenChange(false);
  };

  const isValid = !!corId && Number(valorPintura) > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetState(); else onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Paintbrush className="h-5 w-5 text-primary" />
            Pintura Eletrostática
          </DialogTitle>
          <DialogDescription>
            Escolha a cor e informe o valor. Vincular a um item da venda é opcional.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Vincular a um item <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <ScrollArea className="max-h-[180px]">
              <RadioGroup value={selectedIndex} onValueChange={setSelectedIndex}>
                <div className="space-y-1.5">
                  <label
                    className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                      selectedIndex === AVULSA
                        ? 'border-primary/50 bg-primary/5'
                        : 'border-border hover:bg-accent/50'
                    }`}
                  >
                    <RadioGroupItem value={AVULSA} />
                    <span className="text-sm">Pintura avulsa (não vincular) — padrão</span>
                  </label>
                  {itensDisponiveis.map(({ index, label }) => (
                    <label
                      key={index}
                      className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                        selectedIndex === String(index)
                          ? 'border-primary/50 bg-primary/5'
                          : 'border-border hover:bg-accent/50'
                      }`}
                    >
                      <RadioGroupItem value={String(index)} />
                      <span className="text-sm">{label}</span>
                    </label>
                  ))}
                </div>
              </RadioGroup>
            </ScrollArea>
          </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Cor</Label>
              <Select value={corId} onValueChange={setCorId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecione a cor" />
                </SelectTrigger>
                <SelectContent>
                  {coresAtivas.map(cor => (
                    <SelectItem key={cor.id} value={cor.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full border border-border"
                          style={{ backgroundColor: cor.codigo_hex }}
                        />
                        {cor.nome}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Valor da Pintura (R$)</Label>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0,00"
                  value={valorPintura}
                  onChange={(e) => setValorPintura(e.target.value)}
                  className="h-9"
                  disabled={carregando}
                />
                {carregando && (
                  <Loader2 className="absolute right-3 top-2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={resetState}>
            Cancelar
          </Button>
          <Button onClick={handleConfirmar} disabled={!isValid}>
            Adicionar Pintura
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
