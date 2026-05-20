import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Paintbrush, Loader2 } from 'lucide-react';
import { useCatalogoCores } from '@/hooks/useCatalogoCores';
import type { ProdutoVenda } from '@/hooks/useVendas';
import { getLabelTipoProduto } from '@/utils/tipoProdutoLabels';

interface PinturaItemCatalogoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  portas: ProdutoVenda[];
  onConfirm: (pinturas: ProdutoVenda[]) => void;
}

const AVULSA = 'avulsa';

export function PinturaItemCatalogoModal({
  open,
  onOpenChange,
  portas,
  onConfirm,
}: PinturaItemCatalogoModalProps) {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [avulsa, setAvulsa] = useState<boolean>(true);
  const [corId, setCorId] = useState('');
  const [valorPintura, setValorPintura] = useState('');
  const { coresAtivas } = useCatalogoCores();

  const itensDisponiveis = portas
    .map((p, i) => ({ index: i, label: getItemLabel(p, i), produto: p }))
    .filter(({ produto }) => produto.tipo_produto !== 'pintura_epoxi');

  function getItemLabel(p: ProdutoVenda, i: number) {
    const tipo = getLabelTipoProduto(p.tipo_produto);
    const desc = p.descricao ? ` - ${p.descricao}` : '';
    const medidas = p.largura && p.altura ? ` (${p.largura.toFixed(2)}m × ${p.altura.toFixed(2)}m)` : '';
    return `#${i + 1} ${tipo}${desc}${medidas}`;
  }

  const toggleItem = (idx: number) => {
    setSelectedIndices(prev => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
        setAvulsa(false);
      }
      return next;
    });
  };

  const toggleAvulsa = () => {
    setAvulsa(prev => {
      const next = !prev;
      if (next) setSelectedIndices(new Set());
      return next;
    });
  };

  const handleConfirmar = () => {
    const corSelecionada = coresAtivas.find(c => c.id === corId);
    const corNome = corSelecionada?.nome || '';
    const valorTotal = Number(valorPintura) || 0;

    const indicesArr = Array.from(selectedIndices).sort((a, b) => a - b);
    const usarAvulsa = avulsa || indicesArr.length === 0;

    const pinturas: ProdutoVenda[] = [];

    if (usarAvulsa) {
      pinturas.push({
        tipo_produto: 'pintura_epoxi',
        largura: 0,
        altura: 0,
        valor_produto: 0,
        valor_pintura: valorTotal,
        valor_instalacao: 0,
        valor_frete: 0,
        quantidade: 1,
        descricao: `Pintura Eletrostática${corNome ? ` (${corNome})` : ''} - Avulsa`,
        desconto_valor: 0,
        desconto_percentual: 0,
        tipo_desconto: 'valor',
        cor_id: corId || undefined,
      });
    } else {
      const valorPorItem = valorTotal / indicesArr.length;
      for (const idx of indicesArr) {
        const item = portas[idx];
        if (!item) continue;
        const baseDesc = item.descricao || getLabelTipoProduto(item.tipo_produto);
        pinturas.push({
          tipo_produto: 'pintura_epoxi',
          largura: item.largura || 0,
          altura: item.altura || 0,
          valor_produto: 0,
          valor_pintura: valorPorItem,
          valor_instalacao: 0,
          valor_frete: 0,
          quantidade: 1,
          descricao: `Pintura Eletrostática${corNome ? ` (${corNome})` : ''} - ${baseDesc}`,
          desconto_valor: 0,
          desconto_percentual: 0,
          tipo_desconto: 'valor',
          cor_id: corId || undefined,
        });
      }
    }

    onConfirm(pinturas);
    resetState();
  };

  const resetState = () => {
    setSelectedIndices(new Set());
    setAvulsa(true);
    setCorId('');
    setValorPintura('');
    onOpenChange(false);
  };

  const isValid =
    !!corId &&
    Number(valorPintura) > 0 &&
    (avulsa || selectedIndices.size > 0);

  const qtdSelecionados = selectedIndices.size;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetState(); else onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Paintbrush className="h-5 w-5 text-primary" />
            Pintura Eletrostática
          </DialogTitle>
          <DialogDescription>
            Escolha a cor e informe o valor. Você pode vincular a vários itens — o valor será dividido entre eles.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Vincular a itens <span className="text-muted-foreground font-normal">(selecione um ou mais)</span>
            </Label>
            <ScrollArea className="max-h-[180px]">
              <div className="space-y-1.5">
                <label
                  className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                    avulsa
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-border hover:bg-accent/50'
                  }`}
                >
                  <Checkbox checked={avulsa} onCheckedChange={toggleAvulsa} />
                  <span className="text-sm">Pintura avulsa (não vincular)</span>
                </label>
                {itensDisponiveis.map(({ index, label }) => {
                  const checked = selectedIndices.has(index);
                  return (
                    <label
                      key={index}
                      className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                        checked
                          ? 'border-primary/50 bg-primary/5'
                          : 'border-border hover:bg-accent/50'
                      }`}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleItem(index)}
                      />
                      <span className="text-sm">{label}</span>
                    </label>
                  );
                })}
              </div>
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
              <Label className="text-sm font-medium">
                Valor Total da Pintura (R$)
                {qtdSelecionados > 1 && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    será dividido entre {qtdSelecionados} itens
                  </span>
                )}
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0,00"
                  value={valorPintura}
                  onChange={(e) => setValorPintura(e.target.value)}
                  className="h-9"
                />
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
